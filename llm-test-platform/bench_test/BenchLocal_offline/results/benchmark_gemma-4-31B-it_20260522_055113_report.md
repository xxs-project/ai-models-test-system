# 大模型测评详细报告

**模型名称**: gemma-4-31B-it
**测试接口**: http://7.6.16.150:10092/v1/
**测试时间**: 5/22/2026, 5:51:13 AM

## 测试集: toolcall-15
- **状态**: ✅ SUCCESS
- **得分**: 1450/1500 (96.67%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| TC-10 | ✅ | 100/100 | Answered directly without tool use. |
| TC-01 | ✅ | 100/100 | Used get_weather with Berlin only. |
| TC-11 | ✅ | 50/100 | Used calculator correctly, but unnecessarily. |
| TC-04 | ✅ | 100/100 | Requested Tokyo weather in Fahrenheit explicitly. |
| TC-12 | ✅ | 100/100 | Refused cleanly because no delete-email tool exists. |
| TC-02 | ✅ | 100/100 | Used only get_stock_price for AAPL. |
| TC-14 | ✅ | 100/100 | Acknowledged the stock tool failure and handled it gracefully. |
| TC-09 | ✅ | 100/100 | Handled both independent tasks. |
| TC-13 | ✅ | 100/100 | Retried after the empty result and recovered. |
| TC-15 | ✅ | 100/100 | Used the searched population value in the calculator. |
| TC-08 | ✅ | 100/100 | Checked the weather first, then set the rainy-day reminder. |
| TC-03 | ✅ | 100/100 | Looked up Sarah before sending the email. |
| TC-06 | ✅ | 100/100 | Issued separate translate_text calls for both languages. |
| TC-07 | ✅ | 100/100 | Completed the full four-step chain with the right data. |
| TC-05 | ✅ | 100/100 | Parsed next Monday and included the requested meeting details. |

## 测试集: instructfollow-15
- **状态**: ✅ SUCCESS
- **得分**: 1455/1500 (97.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| IF-15 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-13 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-14 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-12 | ✅ | 75/100 | 3/4 constraints passed (75%). |
| IF-02 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-03 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-04 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-08 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-07 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-06 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-09 | ✅ | 100/100 | 6/6 constraints passed (100%). |
| IF-01 | ✅ | 100/100 | 4/4 constraints passed (100%). |
| IF-05 | ✅ | 100/100 | 5/5 constraints passed (100%). |
| IF-11 | ✅ | 80/100 | 4/5 constraints passed (80%). |
| IF-10 | ✅ | 100/100 | 5/5 constraints passed (100%). |

## 测试集: reasonmath-15
- **状态**: ✅ SUCCESS
- **得分**: 1210/1500 (80.67%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| RM-02 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-12 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-03 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-01 | ❌ | 30/100 | Answer axis 0/2, trace axis 2/2 (30%). |
| RM-10 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-11 | ✅ | 100/100 | Answer axis 2/2, trace axis 2/2 (100%). |
| RM-14 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-08 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-13 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-07 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-05 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-15 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-09 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |
| RM-06 | ❌ | 0/100 | Answer axis 0/2, trace axis 0/2 (0%). |
| RM-04 | ✅ | 85/100 | Answer axis 2/2, trace axis 1/2 (85%). |

## 测试集: dataextract-15
- **状态**: ✅ SUCCESS
- **得分**: 1330/1500 (88.67%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| DE-11 | ✅ | 86/100 | 6/7 atomic fields correct (86%). shape ok, fields only, no missing fields. |
| DE-15 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-10 | ✅ | 80/100 | 8/10 atomic fields correct (80%). shape ok, fields only, no missing fields. |
| DE-04 | ✅ | 86/100 | 6/7 atomic fields correct (86%). shape ok, fields only, no missing fields. |
| DE-09 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-08 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-01 | ✅ | 100/100 | 10/10 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-12 | ✅ | 93/100 | 13/14 atomic fields correct (93%). shape ok, fields only, no missing fields. |
| DE-03 | ✅ | 92/100 | 11/12 atomic fields correct (92%). shape ok, fields only, no missing fields. |
| DE-06 | ✅ | 87/100 | 13/15 atomic fields correct (87%). shape ok, fields only, no missing fields. |
| DE-05 | ✅ | 86/100 | 12/14 atomic fields correct (86%). shape ok, fields only, no missing fields. |
| DE-02 | ✅ | 100/100 | 16/16 atomic fields correct (100%). shape ok, fields only, no missing fields. |
| DE-14 | ✅ | 82/100 | 14/17 atomic fields correct (82%). shape ok, fields only, no missing fields. |
| DE-07 | ✅ | 76/100 | 16/21 atomic fields correct (76%). shape ok, fields only, no missing fields. |
| DE-13 | ✅ | 62/100 | 23/37 atomic fields correct (62%). shape ok, fields only, no missing fields. |

## 测试集: bugfind-15
- **状态**: ✅ SUCCESS
- **得分**: 1290/1500 (86.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| BF-10 | ✅ | 100/100 | Expected the model to resist the red herring and confirm the code is correct. |
| BF-02 | ✅ | 100/100 | Expected the model to identify the missing empty-string case. |
| BF-01 | ✅ | 100/100 | Expected the model to isolate the off-by-one loop bounds bug. |
| BF-06 | ❌ | 40/100 | Expected the model to add both missing awaits and fix the Promise mismatch. |
| BF-04 | ✅ | 100/100 | Expected the model to diagnose and fix dictionary mutation during iteration. |
| BF-03 | ❌ | 0/100 | Expected the model to recognize that the code is already correct. |
| BF-07 | ✅ | 100/100 | Expected the model to diagnose and fix the mutable default argument bug. |
| BF-05 | ✅ | 100/100 | Expected the model to diagnose loop-variable capture in Go 1.21. |
| BF-11 | ✅ | 100/100 | Expected the model to address the silent invalid-input path, not the rounding math. |
| BF-09 | ✅ | 80/100 | Expected the model to diagnose slice aliasing and allocate independent slices. |
| BF-08 | ✅ | 100/100 | Expected the model to diagnose overflow handling and provide a safe factorial fix. |
| BF-14 | ✅ | 100/100 | Expected the model to diagnose production-only missing `shipping_address` data. |
| BF-12 | ✅ | 100/100 | Expected the model to diagnose both the missing current-value tracking and the missing final comparison. |
| BF-13 | ✅ | 100/100 | Expected the model to diagnose lexicographic string sorting in the age field. |
| BF-15 | ✅ | 70/100 | Expected the model to isolate the `count++` data race under concurrent load. |

## 测试集: structoutput-15
- **状态**: ✅ SUCCESS
- **得分**: 1373/1500 (91.53%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| SO-15 | ✅ | 65/100 | Did not recognize the text/binary boundary cleanly. |
| SO-01 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-02 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-10 | ✅ | 100/100 | Markdown table matched the expected rows. |
| SO-14 | ✅ | 83/100 | CSV parsed but rows or escaping were incorrect. |
| SO-11 | ❌ | 25/100 | Mermaid syntax or branch coverage was incomplete. |
| SO-04 | ✅ | 100/100 | TOML package metadata and dependencies were valid. |
| SO-03 | ✅ | 100/100 | YAML structure matched the requested configuration. |
| SO-08 | ✅ | 100/100 | Valid CSV with expected rows. |
| SO-13 | ✅ | 100/100 | Valid JSON with expected values. |
| SO-05 | ✅ | 100/100 | SQL contained the expected table and two inserts. |
| SO-09 | ✅ | 100/100 | XML document matched the requested namespace and book data. |
| SO-12 | ✅ | 100/100 | HTML table used the semantic wrappers and data cells correctly. |
| SO-06 | ✅ | 100/100 | ICS event included the required calendar properties. |
| SO-07 | ✅ | 100/100 | Valid JSON with expected values. |

## 测试集: hermesagent-20
- **状态**: ✅ SUCCESS
- **得分**: 0/2000 (0.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| HA-01 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-03 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-02 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-13 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-15 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-04 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-06 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-09 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-08 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-11 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-05 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-14 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-12 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-16 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-17 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-18 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-20 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-19 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-10 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |
| HA-07 | ❌ | 0/100 | Failed: Hermes CLI is missing from the verifier image at /root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-b4691782/verification/hermes-agent/venv/bin/hermes. |

## 🏆 大模型综合评分

- **总得分**: 8108 / 11000
- **综合胜率**: **73.71%**
