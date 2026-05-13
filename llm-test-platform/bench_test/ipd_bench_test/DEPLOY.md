# IPD Bench 测试工具部署指南

## 1. 环境要求

| 组件 | 版本要求 |
|------|----------|
| Python | >= 3.10 |
| aiohttp | 最新版 |
| vLLM / OpenAI API | 支持 API 调用即可 |

安装依赖：

```bash
pip install aiohttp
```

## 2. 目录结构

```
ipd_bench_test/
├── bench_packs/              # 测试数据包
│   ├── Concept.json          # S1 概念阶段
│   ├── Plan.json             # S2 计划阶段
│   ├── Develop.json          # S3 开发阶段
│   ├── Verify.json           # S4 验证阶段
│   ├── Release.json         # S5 发布阶段
│   ├── Lifecycle.json       # S6 生命周期
│   ├── Support.json         # 组织支撑
│   ├── Opportunity.json     # 机会识别
│   └── *_report.json        # 评测结果
├── idp_bench_test.py         # 主测试入口
├── xfusion_ipd_suite.py      # 测试套件生成工具
└── ipd_test_suite_v3_intelligence.json  # 主测试数据
```

## 3. 后端服务部署

### 3.1 vLLM 部署

启动 vLLM 服务：

```bash
python -m vllm.entrypoints.openai.api_server \
    --model /path/to/model \
    --tensor-parallel-size 4 \
    --host 0.0.0.0 \
    --port 10093
```

默认 API 地址：`http://127.0.0.1:10093/v1/chat/completions`

### 3.2 OpenAI 兼容模式

如使用其他兼容 OpenAI API 的服务，修改 `idp_bench_test.py` 中的 URL：

```python
URL = "http://your-api-endpoint:port/v1/chat/completions"
```

## 4. 快速启动

```bash
python idp_bench_test.py \
    --model gemma-4-26B-A4B-it \
    --base_url http://127.0.0.1:10093/v1/chat/completions \
    --backend vllm
```

## 5. 验证部署

运行单 Pack 测试验证：

```bash
python idp_bench_test.py --pack_file bench_packs/Concept.json
```

## 6. 常见问题

| 问题 | 解决方案 |
|------|----------|
| 连接超时 | 检查 vLLM 服务是否启动，端口是否正确 |
| 模型加载失败 | 确认模型路径正确，GPU 显存充足 |
| 评测超时 | 可在代码中调整 `timeout` 参数（默认 180s） |