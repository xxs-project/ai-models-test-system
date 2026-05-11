"""
CSV导入功能测试模块
测试Qwen3-30B-A3B-FP8模型性能数据导入功能
"""

import io
from datetime import datetime

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select

from backend.main import app
from backend.models import Benchmark

sqlite_file_name = "test_csv_import.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
connect_args = {"check_same_thread": False}
test_engine = create_engine(sqlite_url, connect_args=connect_args)

SAMPLE_CSV_CONTENT = """Process Num,Input Length,Output Length,TTFT (ms),avg TPS (without prefill),avg TPS (with prefill),Total Time (ms),TPS (without prefill),TPS (with prefill),Error,avg input Tokens,avg output Tokens
1,128,128,146.0948,40.2046,38.7279,3305.1092624664307,40.2046,38.7279,,128,128
1,256,256,174.1147,39.5269,38.6381,6625.579595565796,39.5269,38.6381,,256,256
1,512,512,190.9811,39.5393,39.0392,13115.018606185911,39.5393,39.0392,,512,512
"""

SAMPLE_CSV_VLLM_FORMAT = """concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,128,128,146.09,2.52,40.20
1,256,256,174.11,2.53,39.53
1,512,512,190.98,2.53,39.54
"""

@pytest.fixture(scope="module")
def client():
    """创建测试客户端"""
    SQLModel.metadata.create_all(test_engine)
    return TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    """创建测试数据库会话"""
    with Session(test_engine) as session:
        yield session
        session.query(Benchmark).delete()
        session.commit()

class TestCSVImportFunctionality:
    """CSV导入功能测试类"""

    def test_csv_content_parsing(self):
        """测试CSV内容解析功能"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_CONTENT))
        assert len(df) == 3
        assert 'Process Num' in df.columns
        assert 'Input Length' in df.columns
        assert 'Output Length' in df.columns
        assert 'TTFT (ms)' in df.columns
        assert 'avg TPS (without prefill)' in df.columns

    def test_csv_vllm_format_parsing(self):
        """测试vLLM标准格式CSV解析"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_VLLM_FORMAT))
        assert len(df) == 3
        assert 'concurrency' in df.columns
        assert 'inputLength' in df.columns
        assert 'outputLength' in df.columns
        assert 'ttft' in df.columns
        assert 'tpot' in df.columns
        assert 'tokensPerSecond' in df.columns

    def test_benchmark_creation_with_csv_data(self, client, db_session):
        """测试通过CSV数据创建基准测试"""
        config = {
            "submitter": "admin",
            "modelName": "Qwen3-30B-A3B-FP8",
            "serverName": "npu-server-01",
            "chipName": "Huawei Ascend 910B2C",
            "framework": "vLLM",
            "frameworkVersion": "0.6.0",
            "shardingConfig": "tp=1",
            "testDate": "2024-01-15",
            "notes": "FP8量化测试"
        }

        metrics = [
            {
                "concurrency": 1,
                "inputLength": 128,
                "outputLength": 128,
                "ttft": 146.09,
                "tpot": 2.52,
                "tokensPerSecond": 40.20
            },
            {
                "concurrency": 1,
                "inputLength": 256,
                "outputLength": 256,
                "ttft": 174.11,
                "tpot": 2.53,
                "tokensPerSecond": 39.53
            },
            {
                "concurrency": 1,
                "inputLength": 512,
                "outputLength": 512,
                "ttft": 190.98,
                "tpot": 2.53,
                "tokensPerSecond": 39.54
            }
        ]

        benchmark_data = {"config": config, "metrics": metrics}
        response = client.post("/api/benchmarks", json=benchmark_data)

        assert response.status_code == 200
        data = response.json()
        assert data["config"]["modelName"] == "Qwen3-30B-A3B-FP8"
        assert data["config"]["framework"] == "vLLM"
        assert data["config"]["chipName"] == "Huawei Ascend 910B2C"
        assert len(data["metrics"]) == 3
        assert data["unique_id"].startswith("BM-")

    def test_benchmark_metrics_accuracy(self, client, db_session):
        """测试导入性能指标的准确性"""
        config = {
            "modelName": "Qwen3-30B-A3B-FP8",
            "serverName": "test-server",
            "frameworkVersion": "0.1.0",
            "shardingConfig": "tp=1"
        }
        metrics = [
            {
                "concurrency": 4,
                "inputLength": 128,
                "outputLength": 1024,
                "ttft": 388.11,
                "tpot": 39.78,
                "tokensPerSecond": 25.13
            }
        ]

        benchmark_data = {
            "config": {
                "submitter": "admin",
                **config,
                "framework": "vLLM",
                "chipName": "Ascend 910B",
                "testDate": "2024-01-15"
            },
            "metrics": metrics
        }

        response = client.post("/api/benchmarks", json=benchmark_data)
        assert response.status_code == 200
        data = response.json()

        imported_metric = data["metrics"][0]
        assert imported_metric["concurrency"] == 4
        assert imported_metric["inputLength"] == 128
        assert imported_metric["outputLength"] == 1024
        assert abs(imported_metric["ttft"] - 388.11) < 0.01
        assert abs(imported_metric["tokensPerSecond"] - 25.13) < 0.01

    def test_csv_data_source_validation(self, client, db_session):
        """测试CSV数据源验证功能"""
        config = {
            "submitter": "admin",
            "modelName": "Qwen3-30B-A3B-FP8",
            "serverName": "aclgraph-server",
            "framework": "vLLM",
            "frameworkVersion": "0.1.0",
            "shardingConfig": "tp=1",
            "chipName": "NPU",
            "testDate": "2024-01-15"
        }
        metrics = [
            {
                "concurrency": 8,
                "inputLength": 1024,
                "outputLength": 1024,
                "ttft": 1041.05,
                "tpot": 69.04,
                "tokensPerSecond": 14.51
            }
        ]

        response = client.post("/api/benchmarks", json={"config": config, "metrics": metrics})
        assert response.status_code == 200

        benchmark_id = response.json()["id"]
        get_response = client.get(f"/api/benchmarks/{benchmark_id}")
        assert get_response.status_code == 200
        assert get_response.json()["config"]["modelName"] == "Qwen3-30B-A3B-FP8"

class TestPerformanceMetricsValidation:
    """性能指标验证测试类"""

    def test_ttft_time_range_validation(self):
        """测试TTFT时间范围验证"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_CONTENT))
        ttft_values = df['TTFT (ms)']
        assert all(ttft_values > 0)
        assert all(ttft_values < 10000)

    def test_tps_throughput_validation(self):
        """测试TPS吞吐量验证"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_CONTENT))
        tps_values = df['avg TPS (without prefill)']
        assert all(tps_values > 0)
        assert all(tps_values < 1000)

    def test_concurrency_data_integrity(self):
        """测试并发数据完整性"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_CONTENT))
        process_nums = df['Process Num']
        input_lens = df['Input Length']
        output_lens = df['Output Length']

        assert all(process_nums >= 1)
        assert all(input_lens > 0)
        assert all(output_lens > 0)

    def test_performance_correlation_validation(self):
        """测试性能相关性验证"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_CONTENT))
        input_lens = df['Input Length'].values
        ttft_values = df['TTFT (ms)'].values

        for i in range(len(input_lens) - 1):
            if input_lens[i] < input_lens[i + 1]:
                assert ttft_values[i] <= ttft_values[i + 1], "TTFT should increase with input length"

class TestScalabilityValidation:
    """可扩展性验证测试类"""

    def test_multiple_concurrency_levels(self):
        """测试多并发级别支持"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_CONTENT))
        concurrency_levels = df['Process Num'].unique()
        assert len(concurrency_levels) > 0

        for level in concurrency_levels:
            level_data = df[df['Process Num'] == level]
            assert len(level_data) > 0

    def test_different_input_output_combinations(self):
        """测试不同输入输出组合"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_CONTENT))
        combinations = set(zip(df['Input Length'], df['Output Length']))

        assert len(combinations) > 1

    def test_large_scale_data_handling(self):
        """测试大规模数据处理能力"""
        large_csv = """concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
"""
        for i in range(100):
            large_csv += f"1,{128 + i*10},{128 + i*10},{100 + i},{2 + i*0.01},{40 - i*0.1}\n"

        df = pd.read_csv(io.StringIO(large_csv))
        assert len(df) == 100
        assert all(df['concurrency'] >= 1)

class TestDataConsistencyValidation:
    """数据一致性验证测试类"""

    def test_csv_column_mapping(self):
        """测试CSV列映射功能"""
        csv_content = SAMPLE_CSV_CONTENT
        lines = csv_content.strip().split('\n')
        headers = lines[0].split(',')
        header_map = {}

        for header in headers:
            header_lower = header.strip().lower()
            if 'process' in header_lower:
                header_map['concurrency'] = header
            elif 'input' in header_lower and 'length' in header_lower:
                header_map['inputLength'] = header
            elif 'output' in header_lower and 'length' in header_lower:
                header_map['outputLength'] = header
            elif 'ttft' in header_lower:
                header_map['ttft'] = header
            elif 'tps' in header_lower and 'without' in header_lower:
                header_map['tokensPerSecond'] = header

        assert 'concurrency' in header_map
        assert 'inputLength' in header_map
        assert 'outputLength' in header_map
        assert 'ttft' in header_map

    def test_data_type_conversion(self):
        """测试数据类型转换"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_CONTENT))
        assert df['Process Num'].dtype in ['int64', 'int32']
        assert df['TTFT (ms)'].dtype in ['float64', 'float32']
        assert df['avg TPS (without prefill)'].dtype in ['float64', 'float32']

    def test_null_value_handling(self):
        """测试空值处理"""
        csv_with_nulls = """concurrency,inputLength,outputLength,ttft,tpot,tokensPerSecond
1,128,128,146.09,2.52,40.20
1,256,256,,2.53,39.53
1,512,512,190.98,,39.54
"""
        df = pd.read_csv(io.StringIO(csv_with_nulls))
        assert df['ttft'].isna().sum() == 1
        assert df['tpot'].isna().sum() == 1

class TestSecurityValidation:
    """安全性验证测试类"""

    def test_sql_injection_prevention(self, client, db_session):
        """测试SQL注入防护"""
        malicious_config = {
            "modelName": "'; DROP TABLE benchmarks; --",
            "serverName": "test-server",
            "framework": "vLLM",
            "chipName": "GPU",
            "testDate": "2024-01-15"
        }

        response = client.post("/api/benchmarks", json={"config": malicious_config, "metrics": []})
        assert response.status_code == 422

    def test_xss_prevention_in_config(self, client, db_session):
        """测试XSS防护"""
        xss_config = {
            "modelName": "<script>alert('xss')</script>",
            "serverName": "test-server",
            "framework": "vLLM",
            "chipName": "GPU",
            "testDate": "2024-01-15"
        }

        response = client.post("/api/benchmarks", json={"config": xss_config, "metrics": []})
        assert response.status_code == 422

    def test_input_length_validation(self):
        """测试输入长度验证"""
        df = pd.read_csv(io.StringIO(SAMPLE_CSV_CONTENT))
        max_input = df['Input Length'].max()
        max_output = df['Output Length'].max()

        assert max_input <= 4096
        assert max_output <= 4096

class TestReliabilityValidation:
    """可靠性验证测试类"""

    def test_benchmark_deletion(self, client, db_session):
        """测试基准测试删除功能"""
        config = {
            "submitter": "admin",
            "modelName": "ToDelete",
            "serverName": "test",
            "framework": "vLLM",
            "frameworkVersion": "0.1.0",
            "shardingConfig": "tp=1",
            "chipName": "GPU",
            "testDate": "2024-01-15"
        }
        response = client.post("/api/benchmarks", json={"config": config, "metrics": []})
        benchmark_id = response.json()["id"]

        delete_response = client.delete(f"/api/benchmarks/{benchmark_id}")
        assert delete_response.status_code == 200

        get_response = client.get(f"/api/benchmarks/{benchmark_id}")
        assert get_response.status_code == 404

    def test_concurrent_imports(self, client, db_session):
        """测试并发导入功能"""
        configs = [
            {"submitter": "admin", "modelName": f"Model{i}", "serverName": "test", "framework": "vLLM", "frameworkVersion": "1.0", "shardingConfig": "tp=1", "chipName": "GPU", "testDate": "2024-01-15"}
            for i in range(5)
        ]

        for i, config in enumerate(configs):
            response = client.post("/api/benchmarks", json={"config": config, "metrics": []})
            assert response.status_code == 200

        list_response = client.get("/api/benchmarks?size=100")
        assert list_response.status_code == 200
        data = list_response.json()
        assert data["total"] >= 5

    def test_data_persistence(self, client, db_session):
        """测试数据持久化"""
        config = {
            "submitter": "admin",
            "modelName": "PersistenceTest",
            "serverName": "test",
            "framework": "vLLM",
            "frameworkVersion": "1.0",
            "shardingConfig": "tp=1",
            "chipName": "GPU",
            "testDate": "2024-01-15"
        }
        metrics = [{"concurrency": 1, "inputLength": 128, "outputLength": 128, "ttft": 100, "tpot": 2, "tokensPerSecond": 50}]

        response = client.post("/api/benchmarks", json={"config": config, "metrics": metrics})
        benchmark_id = response.json()["id"]

        get_response = client.get(f"/api/benchmarks/{benchmark_id}")
        assert get_response.status_code == 200
        assert get_response.json()["metrics"][0]["tokensPerSecond"] == 50


class TestSpecificRealCSVImport:
    """真实CSV文件导入测试"""

    def test_specific_csv_file_exists(self):
        import os
        csv_path = "/home/models-test-system_v1.0/llm-test-platform/aarch64_vllm_results_Qwen_Qwen3-30B-A3B-FP8_1_npu_aclgraph.csv"
        assert os.path.exists(csv_path), "CSV file not found"

    def test_import_specific_csv_content(self, client, db_session):
        """测试特定CSV文件的内容解析和导入"""
        import os
        csv_path = "/home/models-test-system_v1.0/llm-test-platform/aarch64_vllm_results_Qwen_Qwen3-30B-A3B-FP8_1_npu_aclgraph.csv"
        
        # Manually parse using pandas to verify logic matches file content
        df = pd.read_csv(csv_path)
        
        # Verify basic structure
        assert 'Process Num' in df.columns
        assert 'TTFT (ms)' in df.columns
        
        # Construct payload simulating what the frontend would send
        # or what the import script does
        metrics = []
        for _, row in df.iterrows():
            metrics.append({
                "concurrency": int(row['Process Num']),
                "inputLength": int(row['Input Length']),
                "outputLength": int(row['Output Length']),
                "ttft": float(row['TTFT (ms)']),
                "tpot": float(row.get('Total Time (ms)', 0.0)) / int(row['Output Length']) if int(row['Output Length']) > 0 else 0.0,
                "tokensPerSecond": float(row['avg TPS (without prefill)'])
            })
            
        config = {
            "submitter": "test_user",
            "modelName": "Qwen3-30B-A3B-FP8-TEST",
            "serverName": "npu-server-test",
            "framework": "vLLM",
            "frameworkVersion": "0.1.0",
            "shardingConfig": "tp=8",
            "chipName": "Huawei Ascend 910B",
            "testDate": datetime.now().strftime("%Y-%m-%d")
        }
        
        response = client.post("/api/benchmarks", json={"config": config, "metrics": metrics})
        assert response.status_code == 200
        data = response.json()
        
        assert len(data['metrics']) == len(df)
        assert data['config']['modelName'] == "Qwen3-30B-A3B-FP8-TEST"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
