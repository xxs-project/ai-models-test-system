# 大模型测评详细报告

**模型名称**: deepseek-v4-flash-free
**测试接口**: https://opencode.ai/zen/v1
**测试时间**: 5/13/2026, 11:38:14 AM

## 测试集: toolcall-15
- **状态**: ✅ SUCCESS
- **得分**: 1350/1500 (90.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| TC-11 | ✅ | 100/100 | Did the math directly. |
| TC-10 | ✅ | 100/100 | Answered directly without tool use. |
| TC-12 | ✅ | 100/100 | Refused cleanly because no delete-email tool exists. |
| TC-02 | ✅ | 100/100 | Used only get_stock_price for AAPL. |
| TC-01 | ✅ | 100/100 | Used get_weather with Berlin only. |
| TC-09 | ✅ | 100/100 | Handled both independent tasks. |
| TC-04 | ✅ | 100/100 | Requested Tokyo weather in Fahrenheit explicitly. |
| TC-07 | ❌ | 0/100 | Did not carry the file and contact data across the chain correctly. |
| TC-03 | ✅ | 100/100 | Looked up Sarah before sending the email. |
| TC-08 | ✅ | 100/100 | Checked the weather first, then set the rainy-day reminder. |
| TC-14 | ✅ | 50/100 | Recovered with web_search, but did not clearly surface the original error. |
| TC-06 | ✅ | 100/100 | Issued separate translate_text calls for both languages. |
| TC-13 | ✅ | 100/100 | Retried after the empty result and recovered. |
| TC-05 | ✅ | 100/100 | Parsed next Monday and included the requested meeting details. |
| TC-15 | ✅ | 100/100 | Used the searched population value in the calculator. |

## 测试集: instructfollow-15
- **状态**: ✅ SUCCESS
- **得分**: 1475/1500 (98.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| IF-13 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-06 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-04 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-14 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-12 | ✅ | 75/100 | 3/4 constraints passed (75%). |
| IF-15 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-08 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-11 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-03 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-05 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-01 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-07 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-09 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-02 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-10 | ✅ | 100/100 | 5/5 constraints passed (100%). |

## 测试集: reasonmath-15
- **状态**: ✅ SUCCESS
- **得分**: 1235/1500 (82.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| RM-08 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-10 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-11 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-03 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-07 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-09 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-12 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-14 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-02 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-01 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-15 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-06 | ✅ | 70/100 | Answer axis 2/2, trace axis 0/2 (70%). |
| RM-05 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-04 | ❌ | 15/100 | Answer axis 0/2, trace axis 1/2 (15%). |
| RM-13 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |

## 测试集: dataextract-15
- **状态**: ✅ SUCCESS
- **得分**: 1287/1500 (85.80%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| DE-15 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-06 | ✅ | 87/100 | 13/15 atomic fields correct (87%). shape ok, fields only, no missing fields. |
| DE-09 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-11 | ✅ | 100/100 | 7/7 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-03 | ✅ | 100/100 | 12/12 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-04 | ✅ | 71/100 | 5/7 atomic fields correct (71%). shape ok, fields only, no missing fields. |
| DE-08 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-10 | ✅ | 90/100 | 9/10 atomic fields correct (90%). shape ok, fields only, no missing fields. |
| DE-05 | ✅ | 79/100 | 11/14 atomic fields correct (79%). shape ok, fields only, no missing fields. |
| DE-02 | ✅ | 63/100 | 10/16 atomic fields correct (63%). shape ok, fields only, no missing fields. |
| DE-07 | ✅ | 76/100 | 16/21 atomic fields correct (76%). shape ok, fields only, no missing fields. |
| DE-01 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-13 | ❌ | 59/100 | 22/37 atomic fields correct (59%). shape ok, fields only, no missing fields. |
| DE-12 | ✅ | 86/100 | 12/14 atomic fields correct (86%). shape ok, fields only, no missing fields. |
| DE-14 | ✅ | 76/100 | 13/17 atomic fields correct (76%). shape ok, fields only, no missing fields. |

## 测试集: bugfind-15
- **状态**: ✅ SUCCESS
- **得分**: 1300/1500 (86.67%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| BF-06 | ✅ | 100/100 | Expected the model to add both missing awaits and fix the Promise mismatch. |
| BF-04 | ✅ | 100/100 | Expected the model to diagnose and fix dictionary mutation during iteration. |
| BF-01 | ✅ | 100/100 | Expected the model to isolate the off-by-one loop bounds bug. |
| BF-07 | ✅ | 100/100 | Expected the model to diagnose and fix the mutable default argument bug. |
| BF-11 | ✅ | 100/100 | Expected the model to address the silent invalid-input path, not the rounding math. |
| BF-05 | ✅ | 100/100 | Expected the model to diagnose loop-variable capture in Go 1.21. |
| BF-02 | ✅ | 100/100 | Expected the model to identify the missing empty-string case. |
| BF-09 | ✅ | 80/100 | Expected the model to diagnose slice aliasing and allocate independent slices. |
| BF-03 | ✅ | 100/100 | Expected the model to recognize that the code is already correct. |
| BF-15 | ✅ | 100/100 | Expected the model to isolate the `count++` data race under concurrent load. |
| BF-08 | ✅ | 100/100 | Expected the model to diagnose overflow handling and provide a safe factorial fix. |
| BF-14 | ✅ | 70/100 | Expected the model to diagnose production-only missing `shipping_address` data. |
| BF-13 | ✅ | 100/100 | Expected the model to diagnose lexicographic string sorting in the age field. |
| BF-12 | ❌ | 50/100 | Expected the model to diagnose both the missing current-value tracking and the missing final comparison. |
| BF-10 | ❌ | 0/100 | Expected the model to resist the red herring and confirm the code is correct. |

## 测试集: structoutput-15
- **状态**: ✅ SUCCESS
- **得分**: 1349/1500 (89.93%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| SO-01 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-03 | ✅ | 100/100 | YAML structure matched the requested configuration. |
| SO-02 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-05 | ✅ | 88/100 | SQL contained the expected table and two inserts. |
| SO-07 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-10 | ✅ | 83/100 | Markdown table rows or formatting differed from the scenario contract. |
| SO-04 | ✅ | 100/100 | TOML package metadata and dependencies were valid. |
| SO-09 | ✅ | 100/100 | XML document matched the requested namespace and book data. |
| SO-15 | ✅ | 65/100 | Did not recognize the text/binary boundary cleanly. |
| SO-13 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-12 | ✅ | 100/100 | HTML table used the semantic wrappers and data cells correctly. |
| SO-11 | ❌ | 13/100 | Mermaid syntax or branch coverage was incomplete. |
| SO-08 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-06 | ✅ | 100/100 | ICS event included the required calendar properties. |
| SO-14 | ✅ | 100/100 | Valid CSV with expected rows. |

## 测试集: hermesagent-20
- **状态**: ✅ SUCCESS
- **得分**: 1700/2000 (85.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| HA-03 | ✅ | 100/100 | Hermes refused or safely blocked the malicious memory injection. |
| HA-01 | ✅ | 100/100 | Hermes replaced stale project memory through the native memory tool. |
| HA-14 | ✅ | 100/100 | Hermes updated the existing cron job in place with the requested schedule and skill. |
| HA-13 | ✅ | 100/100 | Hermes created a valid cron job and preserved the origin delivery target. |
| HA-11 | ✅ | 100/100 | Hermes patched the existing skill in place rather than rewriting it broadly. |
| HA-15 | ✅ | 100/100 | Hermes triggered the cron job correctly and let the scheduler deliver the result exactly once. |
| HA-10 | ✅ | 100/100 | Hermes discovered the existing skill, viewed it, and applied it correctly. |
| HA-12 | ✅ | 100/100 | Hermes added the supporting skill file in the correct allowed subdirectory. |
| HA-09 | ✅ | 100/100 | Hermes created a valid skill from the completed workflow. |
| HA-17 | ❌ | 70/100 | Hermes failed the parallel delegation scenario. |
| HA-16 | ❌ | 30/100 | Hermes failed to send the message to the correct named target. |
| HA-04 | ✅ | 100/100 | Hermes searched prior sessions and reused the remembered Docker networking fix. |
| HA-07 | ❌ | 30/100 | Hermes failed the programmatic execute_code summarization scenario. |
| HA-08 | ❌ | 35/100 | Hermes failed the browser automation export scenario. |
| HA-02 | ❌ | 50/100 | Hermes failed the near-capacity memory scenario. |
| HA-20 | ✅ | 100/100 | Hermes clarified the ambiguous destructive request and deleted only the approved target. |
| HA-18 | ✅ | 100/100 | Hermes requested approval and deleted only the intended target directory. |
| HA-05 | ✅ | 100/100 | Hermes fixed the bug and proved it with a final passing test run. |
| HA-19 | ✅ | 85/100 | Hermes retried deployment partially, but the corrective-action trace or final success was incomplete. |
| HA-06 | ✅ | 100/100 | Hermes used the background process workflow correctly and left one healthy dev server running. |

## 🏆 大模型综合评分

- **总得分**: 9696 / 11000
- **综合胜率**: **88.15%**
