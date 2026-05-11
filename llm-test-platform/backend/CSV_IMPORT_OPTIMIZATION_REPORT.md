# CSV Import Optimization Report

## Summary
The benchmark import functionality has been refactored to support "row-by-row" configuration mapping. Previously, benchmark configuration (Model Name, Framework, etc.) was derived solely from the filename. Now, both Manual Import (`import_csv.py`) and Auto Import (`auto_import_service.py`) inspect the CSV headers for configuration keys.

## Key Changes

### 1. Manual Import (`backend/import_csv.py`)
-   **Config Column Detection:** Added `_detect_config_columns` to map CSV headers (e.g., "Model Name", "Framework", "Chip") to `Benchmark.config` keys.
-   **Row Grouping:** Instead of creating a single Benchmark record for the entire file, the importer now groups rows by their unique configuration.
    -   If all rows share the same config, 1 Benchmark record is created.
    -   If rows have different configs (e.g., mixed models), multiple Benchmark records are created.
-   **Return Type:** `import_csv` now returns `List[Benchmark]` instead of a single `Benchmark`.

### 2. Auto Import (`backend/services/auto_import_service.py`)
-   **Enhanced Parsing:** `parse_csv_file` now returns a list of `(row_config, metric)` tuples instead of just metrics.
-   **Config Overrides:** Row-specific configuration from the CSV takes precedence over filename-derived metadata.
-   **Supported Headers:**
    -   `Model Name` / `Model` -> `modelName`
    -   `Framework` -> `framework`
    -   `Chip` / `Device` -> `chipName`
    -   `Server` -> `serverName`
    -   `Test Date` -> `testDate`
    -   `Graph Mode` -> `graphMode`
    -   `Sharding` / `TP` -> `shardingConfig`
    -   And more (check `CONFIG_COLUMN_ALIASES`).

## Verification
-   Created `repro_issue.py` to verify that a CSV with "Model Name" column correctly imports as a Benchmark with that model name, overriding the default "unknown-model".
-   Verified that a single CSV with multiple models (Llama2, Qwen) creates separate Benchmark records.
-   Verified `auto_import_service.py` parsing logic with `test_csv_parsing.py`.

## Usage
Users can now upload CSVs with columns like "Model Name", "Framework", etc., and the system will automatically map these to the Benchmark list headers.
