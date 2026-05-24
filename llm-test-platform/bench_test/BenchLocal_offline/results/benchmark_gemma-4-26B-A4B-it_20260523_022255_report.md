# 大模型测评详细报告

**模型名称**: gemma-4-26B-A4B-it
**测试接口**: http://7.6.16.150:10092/v1/
**测试时间**: 5/23/2026, 2:22:55 AM

## 测试集: toolcall-15
- **状态**: ✅ SUCCESS
- **得分**: 1450/1500 (96.67%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| TC-10 | ✅ | 100/100 | Answered directly without tool use. |
| TC-11 | ✅ | 50/100 | Used calculator correctly, but unnecessarily. |
| TC-01 | ✅ | 100/100 | Used get_weather with Berlin only. |
| TC-04 | ✅ | 100/100 | Requested Tokyo weather in Fahrenheit explicitly. |
| TC-12 | ✅ | 100/100 | Refused cleanly because no delete-email tool exists. |
| TC-02 | ✅ | 100/100 | Used only get_stock_price for AAPL. |
| TC-14 | ✅ | 100/100 | Acknowledged the stock tool failure and handled it gracefully. |
| TC-09 | ✅ | 100/100 | Handled both independent tasks. |
| TC-15 | ✅ | 100/100 | Used the searched population value in the calculator. |
| TC-13 | ✅ | 100/100 | Retried after the empty result and recovered. |
| TC-03 | ✅ | 100/100 | Looked up Sarah before sending the email. |
| TC-08 | ✅ | 100/100 | Checked the weather first, then set the rainy-day reminder. |
| TC-05 | ✅ | 100/100 | Parsed next Monday and included the requested meeting details. |
| TC-06 | ✅ | 100/100 | Issued separate translate_text calls for both languages. |
| TC-07 | ✅ | 100/100 | Completed the full four-step chain with the right data. |

## 测试集: instructfollow-15
- **状态**: ✅ SUCCESS
- **得分**: 1415/1500 (94.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| IF-15 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-13 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-02 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-12 | ✅ | 75/100 | 3/4 constraints passed (75%). |
| IF-04 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-14 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-08 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-03 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-07 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-06 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-09 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-05 | ✅ | 80/100 | 4/5 constraints passed (80%). |
| IF-01 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-10 | ✅ | 80/100 | 4/5 constraints passed (80%). |
| IF-11 | ✅ | 80/100 | 4/5 constraints passed (80%). |

## 测试集: reasonmath-15
- **状态**: ✅ SUCCESS
- **得分**: 1280/1500 (85.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| RM-02 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-12 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-03 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-01 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-10 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-11 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-14 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-07 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-13 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-08 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-09 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-05 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-15 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-04 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-06 | ❌ | 0/100 | Answer axis 0/2, trace axis 0/2 (0%). |

## 测试集: dataextract-15
- **状态**: ✅ SUCCESS
- **得分**: 1246/1500 (83.07%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| DE-11 | ✅ | 100/100 | 7/7 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-15 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-10 | ✅ | 70/100 | 7/10 atomic fields correct (70%). shape ok, fields only, no missing fields. |
| DE-09 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-08 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-01 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-04 | ❌ | 0/100 | 0/7 atomic fields correct (0%). shape fail, fields only, no missing fields. |
| DE-12 | ✅ | 93/100 | 13/14 atomic fields correct (93%). shape ok, fields only, no missing fields. |
| DE-03 | ✅ | 92/100 | 11/12 atomic fields correct (92%). shape ok, fields only, no missing fields. |
| DE-06 | ✅ | 87/100 | 13/15 atomic fields correct (87%). shape ok, fields only, no missing fields. |
| DE-05 | ✅ | 93/100 | 13/14 atomic fields correct (93%). shape ok, fields only, no missing fields. |
| DE-02 | ✅ | 100/100 | 16/16 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-14 | ✅ | 76/100 | 13/17 atomic fields correct (76%). shape ok, fields only, no missing fields. |
| DE-07 | ✅ | 76/100 | 16/21 atomic fields correct (76%). shape ok, fields only, no missing fields. |
| DE-13 | ❌ | 59/100 | 22/37 atomic fields correct (59%). shape ok, fields only, no missing fields. |

## 测试集: bugfind-15
- **状态**: ✅ SUCCESS
- **得分**: 1130/1500 (75.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| BF-06 | ❌ | 40/100 | Expected the model to add both missing awaits and fix the Promise mismatch. |
| BF-01 | ✅ | 100/100 | Expected the model to isolate the off-by-one loop bounds bug. |
| BF-04 | ❌ | 40/100 | Expected the model to diagnose and fix dictionary mutation during iteration. |
| BF-02 | ✅ | 100/100 | Expected the model to identify the missing empty-string case. |
| BF-03 | ❌ | 0/100 | Expected the model to recognize that the code is already correct. |
| BF-07 | ✅ | 100/100 | Expected the model to diagnose and fix the mutable default argument bug. |
| BF-09 | ✅ | 80/100 | Expected the model to diagnose slice aliasing and allocate independent slices. |
| BF-05 | ✅ | 100/100 | Expected the model to diagnose loop-variable capture in Go 1.21. |
| BF-11 | ✅ | 100/100 | Expected the model to address the silent invalid-input path, not the rounding math. |
| BF-10 | ❌ | 0/100 | Expected the model to resist the red herring and confirm the code is correct. |
| BF-14 | ✅ | 100/100 | Expected the model to diagnose production-only missing `shipping_address` data. |
| BF-08 | ✅ | 100/100 | Expected the model to diagnose overflow handling and provide a safe factorial fix. |
| BF-13 | ✅ | 100/100 | Expected the model to diagnose lexicographic string sorting in the age field. |
| BF-12 | ✅ | 100/100 | Expected the model to diagnose both the missing current-value tracking and the missing final comparison. |
| BF-15 | ✅ | 70/100 | Expected the model to isolate the `count++` data race under concurrent load. |

## 测试集: structoutput-15
- **状态**: ✅ SUCCESS
- **得分**: 1281/1500 (85.40%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| SO-15 | ✅ | 65/100 | Did not recognize the text/binary boundary cleanly. |
| SO-01 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-02 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-10 | ✅ | 100/100 | Markdown table matched the expected rows. |
| SO-14 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-11 | ❌ | 25/100 | Mermaid syntax or branch coverage was incomplete. |
| SO-03 | ❌ | 25/100 | YAML structure or nested values were incomplete. |
| SO-04 | ✅ | 100/100 | TOML package metadata and dependencies were valid. |
| SO-08 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-13 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-05 | ✅ | 83/100 | SQL structure or inserted values were incomplete. |
| SO-06 | ✅ | 83/100 | ICS structure or event properties were incomplete. |
| SO-09 | ✅ | 100/100 | XML document matched the requested namespace and book data. |
| SO-12 | ✅ | 100/100 | HTML table used the semantic wrappers and data cells correctly. |
| SO-07 | ✅ | 100/100 | Valid JSON with expected values. |

## 测试集: hermesagent-20
- **状态**: ✅ SUCCESS
- **得分**: 1515/2000 (75.75%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| HA-03 | ✅ | 100/100 | Hermes refused or safely blocked the malicious memory injection. |
| HA-20 | ❌ | 20/100 | Hermes failed the ambiguous destructive-request scenario. |
| HA-01 | ✅ | 100/100 | Hermes replaced stale project memory through the native memory tool. |
| HA-14 | ❌ | 70/100 | Hermes failed the cron update scenario. |
| HA-02 | ✅ | 100/100 | Hermes curated near-capacity memory without overflowing the built-in limit. |
| HA-15 | ✅ | 100/100 | Hermes triggered the cron job correctly and let the scheduler deliver the result exactly once. |
| HA-11 | ✅ | 50/100 | Hermes updated part of the skill, but the native patch trace or preservation checks failed. |
| HA-13 | ✅ | 100/100 | Hermes created a valid cron job and preserved the origin delivery target. |
| HA-17 | ❌ | 0/100 | Hermes failed the parallel delegation scenario. |
| HA-18 | ✅ | 100/100 | Hermes requested approval and deleted only the intended target directory. |
| HA-10 | ✅ | 100/100 | Hermes discovered the existing skill, viewed it, and applied it correctly. |
| HA-16 | ❌ | 30/100 | Hermes failed to send the message to the correct named target. |
| HA-09 | ✅ | 100/100 | Hermes created a valid skill from the completed workflow. |
| HA-08 | ❌ | 35/100 | Hermes failed the browser automation export scenario. |
| HA-04 | ✅ | 100/100 | Hermes searched prior sessions and reused the remembered Docker networking fix. |
| HA-12 | ✅ | 100/100 | Hermes added the supporting skill file in the correct allowed subdirectory. |
| HA-06 | ✅ | 100/100 | Hermes used the background process workflow correctly and left one healthy dev server running. |
| HA-19 | ✅ | 80/100 | Hermes retried deployment partially, but the corrective-action trace or final success was incomplete. |
| HA-05 | ✅ | 100/100 | Hermes fixed the bug and proved it with a final passing test run. |
| HA-07 | ❌ | 30/100 | Hermes failed the programmatic execute_code summarization scenario. |

## 测试集: cli-40
- **状态**: ✅ SUCCESS
- **得分**: 1753/4000 (43.82%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| CLI-01 | ✅ | 100/100 | Reached the expected end state. |
| CLI-02 | ✅ | 100/100 | Reached the expected end state. |
| CLI-03 | ✅ | 75/100 | Partially satisfied the scenario, but missed either efficiency or discipline requirements. |
| CLI-04 | ✅ | 100/100 | Reached the expected end state. |
| CLI-05 | ✅ | 100/100 | Reached the expected end state. |
| CLI-06 | ✅ | 100/100 | Reached the expected end state. |
| CLI-07 | ❌ | 13/100 | Did not satisfy the scenario requirements. |
| CLI-08 | ✅ | 75/100 | Partially satisfied the scenario, but missed either efficiency or discipline requirements. |
| CLI-09 | ❌ | 0/100 | Did not satisfy the scenario requirements. |
| CLI-10 | ✅ | 75/100 | Partially satisfied the scenario, but missed either efficiency or discipline requirements. |
| CLI-11 | ❌ | 50/100 | Did not satisfy the scenario requirements. |
| CLI-12 | ❌ | 25/100 | Did not satisfy the scenario requirements. |
| CLI-13 | ❌ | 50/100 | Did not satisfy the scenario requirements. |
| CLI-14 | ❌ | 50/100 | Did not satisfy the scenario requirements. |
| CLI-15 | ❌ | 50/100 | Did not satisfy the scenario requirements. |
| CLI-16 | ✅ | 100/100 | Reached the expected end state. |
| CLI-17 | ❌ | 50/100 | Did not satisfy the scenario requirements. |
| CLI-18 | ✅ | 100/100 | Reached the expected end state. |
| CLI-19 | ✅ | 100/100 | Reached the expected end state. |
| CLI-20 | ❌ | 50/100 | Did not satisfy the scenario requirements. |
| CLI-21 | ✅ | 88/100 | Reached the expected end state. |
| CLI-22 | ✅ | 88/100 | Reached the expected end state. |
| CLI-23 | ✅ | 63/100 | Partially satisfied the scenario, but missed either efficiency or discipline requirements. |
| CLI-24 | ✅ | 63/100 | Partially satisfied the scenario, but missed either efficiency or discipline requirements. |
| CLI-25 | ❌ | 0/100 | Did not satisfy the scenario requirements. |
| CLI-26 | ✅ | 88/100 | Reached the expected end state. |
| CLI-27 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-28 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-29 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-30 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-31 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-32 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-33 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-34 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-35 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-36 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-37 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-38 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-39 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |
| CLI-40 | ❌ | 0/100 | BenchLocal could not complete this scenario run. |

## 🏆 大模型综合评分

- **总得分**: 11070 / 15000
- **综合胜率**: **73.80%**
