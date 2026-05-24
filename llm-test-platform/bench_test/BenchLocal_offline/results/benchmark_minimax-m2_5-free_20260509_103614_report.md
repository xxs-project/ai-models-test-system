# 大模型测评详细报告

**模型名称**: minimax-m2.5-free
**测试接口**: https://opencode.ai/zen/v1
**测试时间**: 5/9/2026, 10:36:14 AM

## 测试集: toolcall-15
- **状态**: ✅ SUCCESS
- **得分**: 1300/1500 (86.67%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| TC-04 | ✅ | 100/100 | Requested Tokyo weather in Fahrenheit explicitly. |
| TC-09 | ✅ | 100/100 | Handled both independent tasks. |
| TC-10 | ✅ | 100/100 | Answered directly without tool use. |
| TC-14 | ✅ | 50/100 | Recovered with web_search, but did not clearly surface the original error. |
| TC-01 | ✅ | 100/100 | Used get_weather with Berlin only. |
| TC-02 | ✅ | 100/100 | Used only get_stock_price for AAPL. |
| TC-13 | ✅ | 100/100 | Retried after the empty result and recovered. |
| TC-05 | ✅ | 100/100 | Parsed next Monday and included the requested meeting details. |
| TC-11 | ✅ | 50/100 | Used calculator correctly, but unnecessarily. |
| TC-12 | ✅ | 100/100 | Refused cleanly because no delete-email tool exists. |
| TC-08 | ✅ | 100/100 | Checked the weather first, then set the rainy-day reminder. |
| TC-06 | ❌ | 0/100 | Did not split the translation request into two valid tool calls. |
| TC-15 | ✅ | 100/100 | Used the searched population value in the calculator. |
| TC-03 | ✅ | 100/100 | Looked up Sarah before sending the email. |
| TC-07 | ✅ | 100/100 | Completed the full four-step chain with the right data. |

## 测试集: instructfollow-15
- **状态**: ✅ SUCCESS
- **得分**: 1415/1500 (94.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| IF-03 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-06 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-13 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-12 | ✅ | 75/100 | 3/4 constraints passed (75%). |
| IF-02 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-08 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-05 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-01 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-15 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-04 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-14 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-07 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-09 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-11 | ✅ | 80/100 | 4/5 constraints passed (80%). |
| IF-10 | ✅ | 60/100 | 3/5 constraints passed (60%). |

## 测试集: reasonmath-15
- **状态**: ✅ SUCCESS
- **得分**: 995/1500 (66.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| RM-08 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-10 | ❌ | 30/100 | Answer axis 0/2, trace axis 2/2 (30%). |
| RM-02 | ❌ | 30/100 | Answer axis 0/2, trace axis 2/2 (30%). |
| RM-01 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-11 | ✅ | 70/100 | Answer axis 2/2, trace axis 0/2 (70%). |
| RM-09 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-07 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-14 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-12 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-03 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-15 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-06 | ❌ | 0/100 | Answer axis 0/2, trace axis 0/2 (0%). |
| RM-05 | ✅ | 70/100 | Answer axis 2/2, trace axis 0/2 (70%). |
| RM-04 | ❌ | 0/100 | Answer axis 0/2, trace axis 0/2 (0%). |
| RM-13 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |

## 测试集: dataextract-15
- **状态**: ✅ SUCCESS
- **得分**: 1290/1500 (86.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| DE-08 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-01 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-12 | ❌ | 57/100 | 8/14 atomic fields correct (57%). shape ok, fields only, no missing fields. |
| DE-03 | ✅ | 92/100 | 11/12 atomic fields correct (92%). shape ok, fields only, no missing fields. |
| DE-14 | ✅ | 82/100 | 14/17 atomic fields correct (82%). shape ok, fields only, no missing fields. |
| DE-02 | ✅ | 94/100 | 15/16 atomic fields correct (94%). shape ok, fields only, no missing fields. |
| DE-05 | ❌ | 57/100 | 8/14 atomic fields correct (57%). shape ok, fields only, no missing fields. |
| DE-15 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-06 | ✅ | 93/100 | 14/15 atomic fields correct (93%). shape ok, fields only, no missing fields. |
| DE-07 | ✅ | 76/100 | 16/21 atomic fields correct (76%). shape ok, fields only, no missing fields. |
| DE-13 | ❌ | 59/100 | 22/37 atomic fields correct (59%). shape ok, fields only, no missing fields. |
| DE-09 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-04 | ✅ | 100/100 | 7/7 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-10 | ✅ | 80/100 | 8/10 atomic fields correct (80%). shape ok, fields only, no missing fields. |
| DE-11 | ✅ | 100/100 | 7/7 atomic fields correct (100%). shape ok, fields only, no missing fields. |

## 测试集: bugfind-15
- **状态**: ✅ SUCCESS
- **得分**: 1225/1500 (81.67%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| BF-01 | ✅ | 100/100 | Expected the model to isolate the off-by-one loop bounds bug. |
| BF-05 | ✅ | 100/100 | Expected the model to diagnose loop-variable capture in Go 1.21. |
| BF-11 | ✅ | 100/100 | Expected the model to address the silent invalid-input path, not the rounding math. |
| BF-04 | ❌ | 40/100 | Expected the model to diagnose and fix dictionary mutation during iteration. |
| BF-06 | ✅ | 100/100 | Expected the model to add both missing awaits and fix the Promise mismatch. |
| BF-03 | ❌ | 0/100 | Expected the model to recognize that the code is already correct. |
| BF-07 | ✅ | 100/100 | Expected the model to diagnose and fix the mutable default argument bug. |
| BF-09 | ✅ | 100/100 | Expected the model to diagnose slice aliasing and allocate independent slices. |
| BF-02 | ✅ | 100/100 | Expected the model to identify the missing empty-string case. |
| BF-14 | ✅ | 70/100 | Expected the model to diagnose production-only missing `shipping_address` data. |
| BF-08 | ✅ | 100/100 | Expected the model to diagnose overflow handling and provide a safe factorial fix. |
| BF-13 | ✅ | 60/100 | Expected the model to diagnose lexicographic string sorting in the age field. |
| BF-15 | ❌ | 55/100 | Expected the model to isolate the `count++` data race under concurrent load. |
| BF-12 | ✅ | 100/100 | Expected the model to diagnose both the missing current-value tracking and the missing final comparison. |
| BF-10 | ✅ | 100/100 | Expected the model to resist the red herring and confirm the code is correct. |

## 测试集: structoutput-15
- **状态**: ✅ SUCCESS
- **得分**: 1431/1500 (95.40%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| SO-01 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-05 | ✅ | 83/100 | SQL structure or inserted values were incomplete. |
| SO-02 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-04 | ✅ | 100/100 | TOML package metadata and dependencies were valid. |
| SO-10 | ✅ | 100/100 | Markdown table matched the expected rows. |
| SO-11 | ✅ | 83/100 | Mermaid syntax or branch coverage was incomplete. |
| SO-12 | ✅ | 100/100 | HTML table used the semantic wrappers and data cells correctly. |
| SO-07 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-03 | ✅ | 100/100 | YAML structure matched the requested configuration. |
| SO-08 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-06 | ✅ | 100/100 | ICS event included the required calendar properties. |
| SO-15 | ✅ | 65/100 | Did not recognize the text/binary boundary cleanly. |
| SO-09 | ✅ | 100/100 | XML document matched the requested namespace and book data. |
| SO-13 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-14 | ✅ | 100/100 | Valid CSV with expected rows. |

## 测试集: hermesagent-20
- **状态**: ✅ SUCCESS
- **得分**: 0/2000 (0.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| HA-01 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-02 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-03 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-13 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-15 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-04 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-06 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-09 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-08 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-14 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-11 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-05 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-16 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-12 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-18 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-17 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-20 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-19 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-10 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |
| HA-07 | ❌ | 0/100 | Failed to prepare the pinned Hermes runtime inside the verifier. |

## 🏆 大模型综合评分

- **总得分**: 7656 / 11000
- **综合胜率**: **69.60%**
