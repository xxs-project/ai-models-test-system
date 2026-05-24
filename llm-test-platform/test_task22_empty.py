import sys
import json
sys.path.insert(0, 'backend')
from services.command_builder import CommandBuilder, TestType, TestMode

task = {
    'id': 22,
    'test_type': TestType.PERFORMANCE,
    'test_mode': TestMode.SINGLE_MODEL,
    'startup_mode': 'api',
    'model_path': '/models/qwen',
    'base_url': 'http://localhost:8001/v1',
    'api_key': '12345',
    'parameter_combination': '',
    'processor_type': 'GPU',
    'graph_mode': 'eager'
}
cmd = CommandBuilder.build_command(task)
print(cmd)
