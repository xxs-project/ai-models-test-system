# IPD Bench 测试工具使用指南

## 1. 基本用法

### 1.1 运行全部测试

```bash
python idp_bench_test.py
```

默认参数：
- 模型：`gemma-4-26B-A4B-it`
- API：`http://127.0.0.1:10093/v1/chat/completions`
- Backend：`vllm`

### 1.2 运行单个测试包

```bash
python idp_bench_test.py --pack_file bench_packs/Concept.json
```

### 1.3 自定义模型参数

```bash
python idp_bench_test.py \
    --model your-model-name \
    --base_url http://your-api:port/v1/chat/completions \
    --backend openai \
    --api_key your-api-key \
    --concurrency 8 \
    --timeout 240 \
    --retries 2 \
    --max_tokens 4096 \
    --results_dir results
```

### 1.4 审计测试集质量

```bash
python audit_bench_packs.py
```

审计单个测试包：

```bash
python audit_bench_packs.py --pack_file bench_packs/Verify.json
```

## 2. 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--model` | 模型名称 | gemma-4-26B-A4B-it |
| `--base_url` | API 端点 | http://127.0.0.1:10093/v1/chat/completions |
| `--api_key` | API 密钥 | EMPTY |
| `--pack_file` | 单独运行某个 pack | 全部 |
| `--backend` | 后端类型 | vllm |
| `--concurrency` | 最大并发请求数 | 10 |
| `--timeout` | 单请求超时秒数 | 180 |
| `--retries` | 瞬时失败重试次数 | 1 |
| `--max_tokens` | 单请求最大生成 token | 4096 |
| `--results_dir` | 结果输出目录 | results |

## 3. 评分体系

评测采用 100 分制：

| 维度 | 分值 | 评估内容 |
|------|------|----------|
| 格式规范 (Format) | 40 | JSON/代码块格式是否正确 |
| 业务逻辑 (Logic) | 40 | 关键词匹配或动态验证 |
| 指令遵循 (Constraint) | 20 | CoT 标签、EOF 标记 |

## 4. 输出结果

### 4.1 终端输出

运行时会在终端显示每个 Pack 的平均分：

```
--- Running Bench Pack: IPD S1: 概念阶段 (20 cases) ---
Pack Average Score: 78.50/100
```

### 4.2 报告文件

运行结束后生成：

```
results/
├── ipd_bench_{model}_{timestamp}_report.md      # 综合 Markdown 报告
├── ipd_bench_{model}_{timestamp}_report.json    # 本次运行结构化汇总
├── concept/
│   └── concept_{model}_{timestamp}.json         # 单 pack 详细结果（含生成文本）
├── plan/
│   └── ...
```

综合报告新增数据集质量画像，包括：
- Prompt 重复率
- 结构化输出用例占比
- 多轮 History 用例占比
- Pack 级风险提示

单 pack 结果 JSON 中会保留完整 `gen_text` 与简短 `gen_preview`，便于复盘异常评分。

## 5. 测试包说明

| Pack 文件 | IPD 阶段 | 评测维度 |
|-----------|----------|----------|
| Opportunity.json | S0 机会识别 | 市场洞察 |
| Concept.json | S1 概念阶段 | 业务逻辑推理 |
| Plan.json | S2 计划阶段 | JSON 结构化 |
| Develop.json | S3 开发阶段 | 代码生成与重构 |
| Verify.json | S4 验证阶段 | 功能/性能验证 |
| Release.json | S5 发布阶段 | GTM 内容生成 |
| Lifecycle.json | S6 生命周期 | 故障排查与运维 |
| Support.json | 组织支撑 | 人才发展与行政 |

## 5.1 测试集健康度检查

建议在横评模型前先运行一次 `audit_bench_packs.py`，重点关注：

- Prompt 重复率是否过高。超过 50% 时，平均分容易被少量模板主导。
- 结构化输出占比是否过低。若过低，格式得分不能代表真实 API 接入能力。
- History 用例是否覆盖到需要多轮上下文的阶段。生命周期类场景尤其需要检查。
- `keyword_matcher` 占比是否过高。若过高，说明该 pack 更像关键词命中测试，而不是产物质量测试。
- 样本量是否过小。样本太少时，不适合直接拿均分做模型选型结论。

## 6. 选型决策参考

### 6.1 通过阈值

| IPD 阶段 | 关键指标 | 通过阈值 |
|----------|----------|----------|
| S0-S1 | 业务逻辑 | >= 25/40 |
| S2 | JSON 结构化 | >= 35/40 |
| S3 | 代码生成 | >= 30/40 |
| S4 | 功能验证 | >= 20/40 |
| S5 | 市场洞察 | >= 25/40 |
| S6 | 故障诊断 | >= 25/40 |

### 6.2 决策门建议

| Gate | 阶段 | >=60分 | 40-60分 | <40分 |
|------|------|--------|---------|-------|
| CDCP | S1 概念 | PASS | CONDITIONAL | REJECT |
| PDCP | S2 计划 | PASS | CONDITIONAL | REJECT |
| TR4 | S3 开发 | PASS | CONDITIONAL | REJECT |
| TR5/TR6 | S4 验证 | PASS | CONDITIONAL | REJECT |
| LDCP | S5 发布 | PASS | CONDITIONAL | REJECT |