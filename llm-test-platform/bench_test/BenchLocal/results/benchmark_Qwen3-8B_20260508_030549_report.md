# 大模型测评详细报告

**模型名称**: Qwen3-8B
**测试接口**: http://7.6.16.150:10092/v1
**测试时间**: 5/8/2026, 3:05:49 AM

## 测试集: toolcall-15
- **状态**: ✅ SUCCESS
- **得分**: 0/1500 (0.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| TC-04 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-14 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-02 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-01 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-12 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-11 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-10 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-15 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-09 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-03 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-13 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-06 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-05 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-08 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |
| TC-07 | ❌ | 0/100 | OpenAIToolParser requires token IDs and does not support text-based extraction. |

## 测试集: bugfind-15
- **状态**: ✅ SUCCESS
- **得分**: 1058/1500 (70.53%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| BF-06 | ✅ | 100/100 | Expected the model to add both missing awaits and fix the Promise mismatch. |
| BF-07 | ✅ | 100/100 | Expected the model to diagnose and fix the mutable default argument bug. |
| BF-05 | ✅ | 80/100 | Expected the model to diagnose loop-variable capture in Go 1.21. |
| BF-04 | ✅ | 100/100 | Expected the model to diagnose and fix dictionary mutation during iteration. |
| BF-03 | ❌ | 0/100 | Expected the model to recognize that the code is already correct. |
| BF-11 | ✅ | 100/100 | Expected the model to address the silent invalid-input path, not the rounding math. |
| BF-01 | ✅ | 100/100 | Expected the model to isolate the off-by-one loop bounds bug. |
| BF-02 | ✅ | 100/100 | Expected the model to identify the missing empty-string case. |
| BF-10 | ❌ | 40/100 | Expected the model to resist the red herring and confirm the code is correct. |
| BF-14 | ✅ | 100/100 | Expected the model to diagnose production-only missing `shipping_address` data. |
| BF-15 | ✅ | 100/100 | Expected the model to isolate the `count++` data race under concurrent load. |
| BF-12 | ❌ | 18/100 | Expected the model to diagnose both the missing current-value tracking and the missing final comparison. |
| BF-09 | ✅ | 60/100 | Expected the model to diagnose slice aliasing and allocate independent slices. |
| BF-08 | ✅ | 60/100 | Expected the model to diagnose overflow handling and provide a safe factorial fix. |
| BF-13 | ❌ | 0/100 | This model's maximum context length is 8192 tokens. However, you requested 0 output tokens and your prompt contains at least 8193 input tokens, for a total of at least 8193 tokens. Please reduce the length of the input prompt or the number of requested output tokens. (parameter=input_tokens, value=8193) |

## 测试集: reasonmath-15
- **状态**: ✅ SUCCESS
- **得分**: 985/1500 (65.67%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| RM-03 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-11 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-02 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-07 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-14 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-08 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-12 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-10 | ❌ | 30/100 | Answer axis 0/2, trace axis 2/2 (30%). |
| RM-01 | ❌ | 30/100 | Answer axis 0/2, trace axis 2/2 (30%). |
| RM-09 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-15 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-05 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-06 | ❌ | 0/100 | Answer axis 0/2, trace axis 0/2 (0%). |
| RM-13 | ❌ | 15/100 | Answer axis 0/2, trace axis 1/2 (15%). |
| RM-04 | ❌ | 0/100 | Answer axis 0/2, trace axis 0/2 (0%). |

## 测试集: structoutput-15
- **状态**: ✅ SUCCESS
- **得分**: 965/1500 (64.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| SO-01 | ❌ | 25/100 | Invalid JSON. |
| SO-04 | ✅ | 100/100 | TOML package metadata and dependencies were valid. |
| SO-02 | ✅ | 83/100 | CSV parsed but rows or escaping were incorrect. |
| SO-03 | ❌ | 25/100 | YAML structure or nested values were incomplete. |
| SO-15 | ✅ | 100/100 | Recognized BSON as a binary format and offered a practical text alternative. |
| SO-10 | ✅ | 83/100 | Markdown table rows or formatting differed from the scenario contract. |
| SO-07 | ❌ | 25/100 | Invalid JSON. |
| SO-12 | ✅ | 100/100 | HTML table used the semantic wrappers and data cells correctly. |
| SO-05 | ✅ | 100/100 | SQL contained the expected table and two inserts. |
| SO-11 | ❌ | 25/100 | Mermaid syntax or branch coverage was incomplete. |
| SO-09 | ❌ | 25/100 | XML document was incomplete or missed required attributes. |
| SO-08 | ✅ | 83/100 | CSV parsed but rows or escaping were incorrect. |
| SO-06 | ✅ | 83/100 | ICS structure or event properties were incomplete. |
| SO-13 | ❌ | 25/100 | Invalid JSON. |
| SO-14 | ✅ | 83/100 | CSV parsed but rows or escaping were incorrect. |

## 🏆 大模型综合评分

- **总得分**: 3008 / 6000
- **综合胜率**: **50.13%**
