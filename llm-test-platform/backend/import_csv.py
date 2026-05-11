import os
import os
import uuid
import json
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

import pandas as pd
from sqlmodel import Session, create_engine, SQLModel

from backend.models import Benchmark

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database.db")
sqlite_url = f"sqlite:///{DB_PATH}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


def create_db_and_tables(target_engine=None):
    SQLModel.metadata.create_all(target_engine or engine)


def _parse_filename_metadata(file_path: str) -> Dict[str, Any]:
    name = os.path.basename(file_path)
    parts = name.replace(".csv", "").split("_")

    def _get_part(idx: int, default: str = "") -> str:
        return parts[idx] if len(parts) > idx else default

    model_name = _get_part(4, "unknown-model") or "unknown-model"
    framework_raw = _get_part(1, "vllm")
    framework = "vLLM" if framework_raw.lower().startswith("vllm") else framework_raw
    chip_marker = "Ascend 910B" if any("npu" in p.lower() for p in parts) else "Unknown"

    return {
        "filename": name,
        "importDate": datetime.now().isoformat(),
        "modelName": model_name,
        "chipName": chip_marker,
        "framework": framework,
        "submitter": "system_import",
        "source": "csv_import",
    }


def _detect_columns(df: pd.DataFrame) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for col in df.columns:
        lower = str(col).lower().strip()
        if "process" in lower or "concurrency" in lower:
            mapping.setdefault("concurrency", col)
        if "input" in lower and "length" in lower:
            mapping.setdefault("inputLength", col)
        if "output" in lower and "length" in lower:
            mapping.setdefault("outputLength", col)
        if "ttft" in lower:
            mapping.setdefault("ttft", col)
        if "tpot" in lower:
            mapping.setdefault("tpot", col)
        if "total time" in lower:
            mapping.setdefault("totalTimeMs", col)
        if "tps" in lower:
            mapping.setdefault("tokensPerSecond", col)

    required = {"concurrency", "inputLength", "outputLength", "ttft"}
    # Relaxed validation: if config columns exist, we might have different metric structures, 
    # but for now we keep strictness or maybe optional?
    # The user request implies "row-by-row import", so let's stick to these metrics being required for *metrics*.
    if not required.issubset(mapping.keys()):
        # If we are missing columns, check if we have enough to proceed (maybe allow partial metrics if config is detailed?)
        # For now, let's keep it strict but maybe allow aliases.
        missing = required - set(mapping.keys())
        # raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")
        # Let's log warning instead of failing immediately if we want to be more robust, 
        # but the prompt says "optimize... functionality", not "remove validation".
        # However, checking the repro, it failed due to missing columns.
        pass 
    
    return mapping


def _detect_config_columns(df: pd.DataFrame) -> Dict[str, str]:
    """
    Detect columns that map to Benchmark Config keys.
    """
    mapping: Dict[str, str] = {}
    # Map normalized column name -> Config Key
    # We scan all columns and see if they match known keywords
    
    config_keywords = {
        "modelname": "modelName",
        "model": "modelName",
        "framework": "framework",
        "chipname": "chipName",
        "chip": "chipName",
        "device": "chipName",
        "servername": "serverName",
        "server": "serverName",
        "submitter": "submitter",
        "source": "source",
        "testdate": "testDate",
        "date": "testDate",
        "version": "frameworkVersion",
        "frameworkversion": "frameworkVersion",
        "graphmode": "graphMode",
        "shardingconfig": "shardingConfig",
        "sharding": "shardingConfig",
        "tp": "shardingConfig", # simple heuristic
    }

    for col in df.columns:
        lower = str(col).lower().strip().replace(" ", "")
        if lower in config_keywords:
            mapping[config_keywords[lower]] = col
    
    return mapping


def _to_int(val: Any) -> Optional[int]:
    try:
        return int(val)
    except Exception:
        return None


def _to_float(val: Any) -> Optional[float]:
    try:
        return float(val)
    except Exception:
        return None


def _normalize_metric(record: Dict[str, Any], mapping: Dict[str, str]) -> Optional[Dict[str, Any]]:
    # Check if required metric keys exist in mapping
    required_keys = ["concurrency", "inputLength", "outputLength", "ttft"]
    if any(k not in mapping for k in required_keys):
        # Only partial metrics available? 
        # If strict validation was skipped in _detect_columns, we might fail here.
        # Let's try to parse what we have.
        pass

    concurrency = _to_int(record.get(mapping.get("concurrency") or "", None))
    input_len = _to_int(record.get(mapping.get("inputLength") or "", None))
    output_len = _to_int(record.get(mapping.get("outputLength") or "", None))
    ttft = _to_float(record.get(mapping.get("ttft") or "", None))

    # Strict check for critical metrics
    if concurrency is None or input_len is None or output_len is None or ttft is None:
        return None
    if concurrency <= 0 or input_len <= 0 or output_len <= 0:
        return None

    tpot: Optional[float] = None
    if "tpot" in mapping:
        tpot_val = _to_float(record.get(mapping["tpot"], None))
        tpot = tpot_val if tpot_val is not None else None
    elif "totalTimeMs" in mapping and output_len > 0:
        total_time = _to_float(record.get(mapping["totalTimeMs"], None))
        if total_time is not None:
            tpot = total_time / output_len

    tokens_per_second: Optional[float] = None
    if "tokensPerSecond" in mapping:
        tps_val = _to_float(record.get(mapping["tokensPerSecond"], None))
        tokens_per_second = tps_val if tps_val is not None else None
    elif tpot and tpot > 0:
        tokens_per_second = 1000.0 / tpot

    return {
        "concurrency": concurrency,
        "inputLength": input_len,
        "outputLength": output_len,
        "ttft": ttft,
        "tpot": tpot if tpot is not None else 0.0,
        "tokensPerSecond": tokens_per_second if tokens_per_second is not None else 0.0,
    }


def import_csv(file_path: str, *, submitter: str = "system_import", target_engine=None) -> List[Benchmark]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(file_path)

    print(f"Reading CSV file: {file_path}")
    df: pd.DataFrame = pd.read_csv(file_path)
    if df.empty:
        raise ValueError("CSV file is empty")

    metric_mapping = _detect_columns(df)
    config_mapping = _detect_config_columns(df)
    
    # Check if we have enough columns (either metrics or config)
    # If strictly no metrics, we might just be importing empty benchmarks? No, benchmarks must have metrics.
    required_metrics = {"concurrency", "inputLength", "outputLength", "ttft"}
    if not required_metrics.issubset(metric_mapping.keys()):
        missing = required_metrics - set(metric_mapping.keys())
        raise ValueError(f"Missing required metric columns: {', '.join(sorted(missing))}")

    base_config = _parse_filename_metadata(file_path)
    base_config["submitter"] = submitter or "system_import"
    
    # Group data by unique config
    grouped_data: Dict[str, Dict[str, Any]] = {}

    records = df.to_dict(orient="records")
    for record in records:
        # 1. Build Config for this row
        row_config = base_config.copy()
        for config_key, col_name in config_mapping.items():
            val = record.get(col_name)
            if pd.notna(val) and str(val).strip() != "":
                row_config[config_key] = str(val).strip()
        
        # 2. Build Metric for this row
        metric = _normalize_metric(record, metric_mapping)
        if metric:
            # Create a deterministic hash for the config to group identical configs
            # We sort keys to ensure consistency
            config_hash = json.dumps(row_config, sort_keys=True)
            
            if config_hash not in grouped_data:
                grouped_data[config_hash] = {
                    "config": row_config,
                    "metrics": []
                }
            grouped_data[config_hash]["metrics"].append(metric)

    if not grouped_data:
        raise ValueError("No valid metrics parsed from CSV (or no valid groups created)")

    db_engine = target_engine or engine
    create_db_and_tables(db_engine)

    created_benchmarks = []
    
    with Session(db_engine) as session:
        for group in grouped_data.values():
            unique_id = f"BM-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
            benchmark = Benchmark(
                unique_id=unique_id, 
                config=group["config"], 
                metrics=group["metrics"]
            )
            session.add(benchmark)
            created_benchmarks.append(benchmark)
        
        session.commit()
        for bm in created_benchmarks:
            session.refresh(bm)
            print(f"Successfully imported benchmark with ID: {bm.id}, Unique ID: {bm.unique_id}")
            # print(f"  Config: {bm.config}")

    return created_benchmarks


if __name__ == "__main__":
    create_db_and_tables()
    csv_path = "/home/models-test-system_v1.0/llm-test-platform/aarch64_vllm_results_Qwen_Qwen3-30B-A3B-FP8_1_npu_aclgraph.csv"
    import_csv(csv_path)
