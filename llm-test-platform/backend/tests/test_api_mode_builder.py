import pytest
from services.command_builder import CommandBuilder, TestType, TestMode

def test_api_mode_builder():
    task = {
        'test_type': TestType.PERFORMANCE,
        'test_mode': TestMode.SINGLE_MODEL,
        'startup_mode': 'api',
        'model_path': '/models/qwen',
        'base_url': 'http://localhost:8000/v1',
        'api_key': '12345',
        'parameter_combination': '{"input": 1024, "output": 1024}',
        'processor_type': 'GPU',
        'graph_mode': 'eager'
    }
    cmd = CommandBuilder.build_command(task)
    print("API CMD:", cmd)
    assert 'api_benchmark_auto' in cmd
    assert 'run_vllmbench.sh' in cmd
    assert '--base_url http://localhost:8000/v1' in cmd
    assert '--processor GPU' in cmd

if __name__ == '__main__':
    pytest.main(['-s', __file__])
