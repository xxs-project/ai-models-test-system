from backend.services.command_builder import CommandBuilder

task = {
    "test_type": 1,
    "test_mode": 1,
    "startup_mode": "api",
    "processor_type": "NPU",
    "model_path": "/data/Meta-llama3-8b",
    "base_url": "http://7.6.16.150:10092/v1/",
    "api_key": "Xfusion@2026",
    "parameter_combination": '[{"input_len":"1024","output_len":"1024","num_prompts":"1","max_concurrency":"1"},{"input_len":"2048","output_len":"2048","num_prompts":"1","max_concurrency":"1"}]',
    "graph_mode": "aclgraph"
}

cmd = CommandBuilder.build_command(task)
print(cmd)
