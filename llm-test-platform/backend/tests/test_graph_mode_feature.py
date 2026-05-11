"""
图模字段功能测试用例
测试范围：正确性、可靠性、可扩展性、安全性
"""

import pytest
import sys
import os
from pydantic import ValidationError

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas import BenchmarkConfig, BenchmarkCreate, BenchmarkMetricsEntry


class TestGraphModeFunctionality:
    """图模字段功能正确性测试"""
    
    def test_benchmark_config_with_graph_mode(self):
        """测试 BenchmarkConfig 支持 graphMode 字段"""
        config = BenchmarkConfig(
            submitter="admin",
            modelName="Qwen-14B",
            serverName="server-01",
            chipName="GPU-A100",
            framework="vLLM",
            frameworkVersion="v0.6.3",
            shardingConfig="tp=4",
            graphMode="eager mode",
            operatorAcceleration="FlashAttention",
            testDate="2024-01-15",
            notes="测试备注"
        )
        
        assert config.graphMode == "eager mode"
        assert config.modelName == "Qwen-14B"
        print("✓ BenchmarkConfig 支持 graphMode 字段")
    
    def test_benchmark_config_without_graph_mode(self):
        """测试 BenchmarkConfig 可选 graphMode 字段（不传）"""
        config = BenchmarkConfig(
            submitter="admin",
            modelName="Qwen-14B",
            serverName="server-01",
            chipName="GPU-A100",
            framework="vLLM",
            frameworkVersion="v0.6.3",
            shardingConfig="tp=4",
            testDate="2024-01-15"
        )
        
        assert config.graphMode is None
        print("✓ BenchmarkConfig graphMode 字段为可选")
    
    def test_benchmark_config_with_empty_graph_mode(self):
        """测试 BenchmarkConfig 可选 graphMode 字段（传空）"""
        config = BenchmarkConfig(
            submitter="admin",
            modelName="Qwen-14B",
            serverName="server-01",
            chipName="GPU-A100",
            framework="vLLM",
            frameworkVersion="v0.6.3",
            shardingConfig="tp=4",
            graphMode="",
            testDate="2024-01-15"
        )
        
        assert config.graphMode == ""
        print("✓ BenchmarkConfig graphMode 字段支持空字符串")


class TestGraphModeReliability:
    """图模字段可靠性测试"""
    
    def test_graph_mode_with_special_characters(self):
        """测试 graphMode 支持特殊字符"""
        special_values = [
            "eager mode",
            "graph-compile",
            "mode_v2.0",
            "模式：编译",
            "<script>alert('test')</script>",  # XSS 测试
            "mode\nwith\nnewlines",
            "mode\twith\ttabs",
        ]
        
        for value in special_values:
            config = BenchmarkConfig(
                submitter="admin",
                modelName="Test",
                serverName="server-01",
                chipName="GPU",
                framework="vLLM",
                frameworkVersion="v1.0",
                shardingConfig="tp=1",
                graphMode=value,
                testDate="2024-01-15"
            )
            assert config.graphMode == value
        
        print("✓ graphMode 字段支持各种特殊字符")
    
    def test_graph_mode_with_long_string(self):
        """测试 graphMode 支持长字符串"""
        long_value = "mode_" + "x" * 1000
        
        config = BenchmarkConfig(
            submitter="admin",
            modelName="Test",
            serverName="server-01",
            chipName="GPU",
            framework="vLLM",
            frameworkVersion="v1.0",
            shardingConfig="tp=1",
            graphMode=long_value,
            testDate="2024-01-15"
        )
        
        assert config.graphMode == long_value
        print("✓ graphMode 字段支持长字符串")
    
    def test_graph_mode_unicode_support(self):
        """测试 graphMode 支持 Unicode 字符"""
        unicode_values = [
            "图模模式",
            "モード",
            "모드",
            "🚀rocket",
            "mode🔥",
        ]
        
        for value in unicode_values:
            config = BenchmarkConfig(
                submitter="admin",
                modelName="Test",
                serverName="server-01",
                chipName="GPU",
                framework="vLLM",
                frameworkVersion="v1.0",
                shardingConfig="tp=1",
                graphMode=value,
                testDate="2024-01-15"
            )
            assert config.graphMode == value
        
        print("✓ graphMode 字段支持 Unicode 字符")


class TestGraphModeSecurity:
    """图模字段安全性测试"""
    
    def test_graph_mode_sql_injection_attempt(self):
        """测试 SQL 注入防护"""
        malicious_values = [
            "'; DROP TABLE benchmark; --",
            "1' OR '1'='1",
            "'; DELETE FROM benchmark WHERE '1'='1' --",
            "mode'; UPDATE benchmark SET id=0; --",
        ]
        
        for value in malicious_values:
            # Pydantic 应该正常接受字符串（防护在数据库层）
            config = BenchmarkConfig(
                submitter="admin",
                modelName="Test",
                serverName="server-01",
                chipName="GPU",
                framework="vLLM",
                frameworkVersion="v1.0",
                shardingConfig="tp=1",
                graphMode=value,
                testDate="2024-01-15"
            )
            assert config.graphMode == value
        
        print("✓ graphMode 字段字符串验证正常（SQL注入防护依赖ORM）")
    
    def test_graph_mode_xss_protection(self):
        """测试 XSS 防护"""
        xss_values = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<iframe src='evil.com'></iframe>",
        ]
        
        for value in xss_values:
            config = BenchmarkConfig(
                submitter="admin",
                modelName="Test",
                serverName="server-01",
                chipName="GPU",
                framework="vLLM",
                frameworkVersion="v1.0",
                shardingConfig="tp=1",
                graphMode=value,
                testDate="2024-01-15"
            )
            assert config.graphMode == value
        
        print("✓ graphMode 字段字符串验证正常（XSS防护依赖前端）")
    
    def test_graph_mode_type_safety(self):
        """测试类型安全"""
        # graphMode 应该是 Optional[str] 类型
        with pytest.raises(ValidationError):
            BenchmarkConfig(
                submitter="admin",
                modelName="Test",
                serverName="server-01",
                chipName="GPU",
                framework="vLLM",
                frameworkVersion="v1.0",
                shardingConfig="tp=1",
                graphMode=123,  # 错误的类型
                testDate="2024-01-15"
            )
        
        print("✓ graphMode 字段类型验证正常")


class TestGraphModeExtensibility:
    """图模字段可扩展性测试"""
    
    def test_benchmark_create_with_graph_mode(self):
        """测试完整的 BenchmarkCreate 包含 graphMode"""
        config = BenchmarkConfig(
            submitter="admin",
            modelName="Qwen-14B",
            serverName="server-01",
            chipName="GPU-A100",
            framework="vLLM",
            frameworkVersion="v0.6.3",
            shardingConfig="tp=4",
            graphMode="dynamic",
            operatorAcceleration="FlashAttention",
            frameworkParams="--max-batch-size=256",
            testDate="2024-01-15",
            notes="性能测试"
        )
        
        metrics = [
            BenchmarkMetricsEntry(
                concurrency=1,
                inputLength=1024,
                outputLength=128,
                ttft=45.2,
                tpot=12.5,
                tokensPerSecond=156.3
            )
        ]
        
        benchmark_create = BenchmarkCreate(
            config=config,
            metrics=metrics
        )
        
        assert benchmark_create.config.graphMode == "dynamic"
        assert len(benchmark_create.metrics) == 1
        print("✓ BenchmarkCreate 支持 graphMode 字段")
    
    def test_config_serialization(self):
        """测试配置序列化"""
        config = BenchmarkConfig(
            submitter="admin",
            modelName="Qwen-14B",
            serverName="server-01",
            chipName="GPU-A100",
            framework="vLLM",
            frameworkVersion="v0.6.3",
            shardingConfig="tp=4",
            graphMode="eager",
            testDate="2024-01-15"
        )
        
        # 序列化为字典
        config_dict = config.model_dump()
        
        assert "graphMode" in config_dict
        assert config_dict["graphMode"] == "eager"
        
        # 反序列化
        config2 = BenchmarkConfig(**config_dict)
        assert config2.graphMode == "eager"
        
        print("✓ 配置序列化和反序列化正常")
    
    def test_config_json_serialization(self):
        """测试 JSON 序列化"""
        import json
        
        config = BenchmarkConfig(
            submitter="admin",
            modelName="Qwen-14B",
            serverName="server-01",
            chipName="GPU-A100",
            framework="vLLM",
            frameworkVersion="v0.6.3",
            shardingConfig="tp=4",
            graphMode="compile",
            testDate="2024-01-15"
        )
        
        # JSON 序列化
        json_str = config.model_dump_json()
        json_obj = json.loads(json_str)
        
        assert json_obj["graphMode"] == "compile"
        
        print("✓ JSON 序列化正常")


def run_all_tests():
    """运行所有测试"""
    print("\n" + "="*60)
    print("图模字段功能测试套件")
    print("="*60 + "\n")
    
    # 功能正确性测试
    print("【1. 功能正确性测试】")
    test_func = TestGraphModeFunctionality()
    test_func.test_benchmark_config_with_graph_mode()
    test_func.test_benchmark_config_without_graph_mode()
    test_func.test_benchmark_config_with_empty_graph_mode()
    
    # 可靠性测试
    print("\n【2. 可靠性测试】")
    test_reliability = TestGraphModeReliability()
    test_reliability.test_graph_mode_with_special_characters()
    test_reliability.test_graph_mode_with_long_string()
    test_reliability.test_graph_mode_unicode_support()
    
    # 安全性测试
    print("\n【3. 安全性测试】")
    test_security = TestGraphModeSecurity()
    test_security.test_graph_mode_sql_injection_attempt()
    test_security.test_graph_mode_xss_protection()
    test_security.test_graph_mode_type_safety()
    
    # 可扩展性测试
    print("\n【4. 可扩展性测试】")
    test_ext = TestGraphModeExtensibility()
    test_ext.test_benchmark_create_with_graph_mode()
    test_ext.test_config_serialization()
    test_ext.test_config_json_serialization()
    
    print("\n" + "="*60)
    print("所有测试通过！✅")
    print("="*60 + "\n")


if __name__ == "__main__":
    run_all_tests()
