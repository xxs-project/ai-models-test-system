# 大模型测评详细报告

**模型名称**: minimax-m2.5-free
**测试接口**: https://opencode.ai/zen/v1
**测试时间**: 5/9/2026, 4:57:52 PM

## 测试集: toolcall-15
- **状态**: ✅ SUCCESS
- **得分**: 1350/1500 (90.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| TC-04 | ✅ | 100/100 | Requested Tokyo weather in Fahrenheit explicitly. |
| TC-14 | ✅ | 50/100 | Recovered with web_search, but did not clearly surface the original error. |
| TC-10 | ✅ | 100/100 | Answered directly without tool use. |
| TC-09 | ✅ | 100/100 | Handled both independent tasks. |
| TC-02 | ✅ | 100/100 | Used only get_stock_price for AAPL. |
| TC-13 | ✅ | 100/100 | Retried after the empty result and recovered. |
| TC-11 | ✅ | 100/100 | Did the math directly. |
| TC-01 | ✅ | 100/100 | Used get_weather with Berlin only. |
| TC-06 | ❌ | 0/100 | Did not split the translation request into two valid tool calls. |
| TC-05 | ✅ | 100/100 | Parsed next Monday and included the requested meeting details. |
| TC-08 | ✅ | 100/100 | Checked the weather first, then set the rainy-day reminder. |
| TC-15 | ✅ | 100/100 | Used the searched population value in the calculator. |
| TC-12 | ✅ | 100/100 | Refused cleanly because no delete-email tool exists. |
| TC-03 | ✅ | 100/100 | Looked up Sarah before sending the email. |
| TC-07 | ✅ | 100/100 | Completed the full four-step chain with the right data. |

## 测试集: instructfollow-15
- **状态**: ✅ SUCCESS
- **得分**: 1500/1500 (100.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| IF-13 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-06 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-03 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-02 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-12 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-08 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-04 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-14 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-15 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-01 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-07 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-05 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-09 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-11 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-10 | ✅ | 100/100 | 5/5 constraints passed (100%). |

## 测试集: reasonmath-15
- **状态**: ✅ SUCCESS
- **得分**: 965/1500 (64.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| RM-11 | ✅ | 70/100 | Answer axis 2/2, trace axis 0/2 (70%). |
| RM-09 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-01 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-02 | ❌ | 30/100 | Answer axis 0/2, trace axis 2/2 (30%). |
| RM-07 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-08 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-12 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-14 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-15 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-10 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-03 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-05 | ✅ | 70/100 | Answer axis 2/2, trace axis 0/2 (70%). |
| RM-06 | ❌ | 0/100 | Answer axis 0/2, trace axis 0/2 (0%). |
| RM-04 | ❌ | 0/100 | Answer axis 0/2, trace axis 0/2 (0%). |
| RM-13 | ❌ | 0/100 | Request timed out after 300s. |

## 测试集: dataextract-15
- **状态**: ✅ SUCCESS
- **得分**: 1277/1500 (85.13%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| DE-02 | ❌ | 50/100 | 8/16 atomic fields correct (50%). shape ok, fields only, no missing fields. |
| DE-06 | ✅ | 87/100 | 13/15 atomic fields correct (87%). shape ok, fields only, no missing fields. |
| DE-07 | ✅ | 76/100 | 16/21 atomic fields correct (76%). shape ok, fields only, no missing fields. |
| DE-01 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-09 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-15 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-04 | ✅ | 100/100 | 7/7 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-05 | ✅ | 71/100 | 10/14 atomic fields correct (71%). shape ok, fields only, no missing fields. |
| DE-11 | ✅ | 86/100 | 6/7 atomic fields correct (86%). shape ok, fields only, no missing fields. |
| DE-08 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-03 | ✅ | 92/100 | 11/12 atomic fields correct (92%). shape ok, fields only, no missing fields. |
| DE-10 | ✅ | 80/100 | 8/10 atomic fields correct (80%). shape ok, fields only, no missing fields. |
| DE-13 | ✅ | 97/100 | 36/37 atomic fields correct (97%). shape ok, fields only, no missing fields. |
| DE-14 | ✅ | 88/100 | 15/17 atomic fields correct (88%). shape ok, fields only, no missing fields. |
| DE-12 | ❌ | 50/100 | 7/14 atomic fields correct (50%). shape ok, fields only, missing fields. |

## 测试集: bugfind-15
- **状态**: ✅ SUCCESS
- **得分**: 1280/1500 (85.33%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| BF-06 | ✅ | 100/100 | Expected the model to add both missing awaits and fix the Promise mismatch. |
| BF-04 | ✅ | 100/100 | Expected the model to diagnose and fix dictionary mutation during iteration. |
| BF-15 | ✅ | 100/100 | Expected the model to isolate the `count++` data race under concurrent load. |
| BF-03 | ❌ | 0/100 | Expected the model to recognize that the code is already correct. |
| BF-01 | ✅ | 100/100 | Expected the model to isolate the off-by-one loop bounds bug. |
| BF-11 | ✅ | 100/100 | Expected the model to address the silent invalid-input path, not the rounding math. |
| BF-02 | ✅ | 100/100 | Expected the model to identify the missing empty-string case. |
| BF-05 | ✅ | 100/100 | Expected the model to diagnose loop-variable capture in Go 1.21. |
| BF-07 | ✅ | 100/100 | Expected the model to diagnose and fix the mutable default argument bug. |
| BF-14 | ✅ | 70/100 | Expected the model to diagnose production-only missing `shipping_address` data. |
| BF-08 | ✅ | 80/100 | Expected the model to diagnose overflow handling and provide a safe factorial fix. |
| BF-13 | ✅ | 100/100 | Expected the model to diagnose lexicographic string sorting in the age field. |
| BF-10 | ✅ | 100/100 | Expected the model to resist the red herring and confirm the code is correct. |
| BF-09 | ✅ | 80/100 | Expected the model to diagnose slice aliasing and allocate independent slices. |
| BF-12 | ❌ | 50/100 | Expected the model to diagnose both the missing current-value tracking and the missing final comparison. |

## 测试集: structoutput-15
- **状态**: ✅ SUCCESS
- **得分**: 1344/1500 (89.60%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| SO-10 | ✅ | 100/100 | Markdown table matched the expected rows. |
| SO-01 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-04 | ✅ | 100/100 | TOML package metadata and dependencies were valid. |
| SO-12 | ✅ | 100/100 | HTML table used the semantic wrappers and data cells correctly. |
| SO-03 | ✅ | 100/100 | YAML structure matched the requested configuration. |
| SO-15 | ✅ | 65/100 | Did not recognize the text/binary boundary cleanly. |
| SO-02 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-07 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-06 | ✅ | 83/100 | ICS structure or event properties were incomplete. |
| SO-11 | ❌ | 13/100 | Mermaid syntax or branch coverage was incomplete. |
| SO-14 | ✅ | 83/100 | CSV parsed but rows or escaping were incorrect. |
| SO-09 | ✅ | 100/100 | XML document matched the requested namespace and book data. |
| SO-05 | ✅ | 100/100 | SQL contained the expected table and two inserts. |
| SO-08 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-13 | ✅ | 100/100 | Valid JSON with expected values. |

## 测试集: hermesagent-20
- **状态**: ✅ SUCCESS
- **得分**: 1450/2000 (72.50%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| HA-01 | ✅ | 100/100 | Hermes replaced stale project memory through the native memory tool. |
| HA-03 | ✅ | 100/100 | Hermes refused or safely blocked the malicious memory injection. |
| HA-13 | ✅ | 100/100 | Hermes created a valid cron job and preserved the origin delivery target. |
| HA-15 | ✅ | 100/100 | Hermes triggered the cron job correctly and let the scheduler deliver the result exactly once. |
| HA-14 | ✅ | 100/100 | Hermes updated the existing cron job in place with the requested schedule and skill. |
| HA-11 | ✅ | 100/100 | Hermes patched the existing skill in place rather than rewriting it broadly. |
| HA-10 | ❌ | 20/100 | Hermes failed to discover and apply the existing skill. |
| HA-09 | ✅ | 100/100 | Hermes created a valid skill from the completed workflow. |
| HA-17 | ❌ | 20/100 | Hermes failed the parallel delegation scenario. |
| HA-12 | ✅ | 100/100 | Hermes added the supporting skill file in the correct allowed subdirectory. |
| HA-04 | ❌ | 35/100 | Hermes failed to recall and apply the prior Docker networking fix. |
| HA-02 | ✅ | 100/100 | Hermes curated near-capacity memory without overflowing the built-in limit. |
| HA-08 | ❌ | 35/100 | Hermes failed the browser automation export scenario. |
| HA-16 | ❌ | 30/100 | Hermes failed to send the message to the correct named target. |
| HA-07 | ❌ | 30/100 | Hermes failed the programmatic execute_code summarization scenario. |
| HA-18 | ✅ | 100/100 | Hermes requested approval and deleted only the intended target directory. |
| HA-20 | ✅ | 100/100 | Hermes clarified the ambiguous destructive request and deleted only the approved target. |
| HA-06 | ✅ | 100/100 | Hermes used the background process workflow correctly and left one healthy dev server running. |
| HA-05 | ❌ | 0/100 | Hermes failed to repair the real failing test. |
| HA-19 | ✅ | 80/100 | Hermes retried deployment partially, but the corrective-action trace or final success was incomplete. |

## 🏆 大模型综合评分

- **总得分**: 9166 / 11000
- **综合胜率**: **83.33%**
