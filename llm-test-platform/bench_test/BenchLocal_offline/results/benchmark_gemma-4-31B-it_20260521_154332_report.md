# 大模型测评详细报告

**模型名称**: gemma-4-31B-it
**测试接口**: http://7.6.16.150:10092/v1/
**测试时间**: 5/21/2026, 3:43:32 PM

## 测试集: bugfind-15
- **状态**: ✅ SUCCESS
- **得分**: 1320/1500 (88.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| BF-10 | ✅ | 100/100 | Expected the model to resist the red herring and confirm the code is correct. |
| BF-02 | ✅ | 100/100 | Expected the model to identify the missing empty-string case. |
| BF-01 | ✅ | 100/100 | Expected the model to isolate the off-by-one loop bounds bug. |
| BF-06 | ❌ | 40/100 | Expected the model to add both missing awaits and fix the Promise mismatch. |
| BF-04 | ✅ | 100/100 | Expected the model to diagnose and fix dictionary mutation during iteration. |
| BF-07 | ✅ | 100/100 | Expected the model to diagnose and fix the mutable default argument bug. |
| BF-03 | ❌ | 0/100 | Expected the model to recognize that the code is already correct. |
| BF-11 | ✅ | 100/100 | Expected the model to address the silent invalid-input path, not the rounding math. |
| BF-05 | ✅ | 100/100 | Expected the model to diagnose loop-variable capture in Go 1.21. |
| BF-09 | ✅ | 80/100 | Expected the model to diagnose slice aliasing and allocate independent slices. |
| BF-08 | ✅ | 100/100 | Expected the model to diagnose overflow handling and provide a safe factorial fix. |
| BF-14 | ✅ | 100/100 | Expected the model to diagnose production-only missing `shipping_address` data. |
| BF-12 | ✅ | 100/100 | Expected the model to diagnose both the missing current-value tracking and the missing final comparison. |
| BF-13 | ✅ | 100/100 | Expected the model to diagnose lexicographic string sorting in the age field. |
| BF-15 | ✅ | 100/100 | Expected the model to isolate the `count++` data race under concurrent load. |

## 测试集: hermesagent-20
- **状态**: ✅ SUCCESS
- **得分**: 0/2000 (0.00%)

| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |
|---------|------|------|-----------------|
| HA-01 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-01/agent-result.json' |
| HA-13 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-13/agent-result.json' |
| HA-02 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-02/agent-result.json' |
| HA-03 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-03/agent-result.json' |
| HA-04 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-04/agent-result.json' |
| HA-09 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-09/agent-result.json' |
| HA-06 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-06/agent-result.json' |
| HA-08 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-08/agent-result.json' |
| HA-11 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-11/agent-result.json' |
| HA-05 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-05/agent-result.json' |
| HA-16 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-16/agent-result.json' |
| HA-12 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-12/agent-result.json' |
| HA-17 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-17/agent-result.json' |
| HA-18 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-18/agent-result.json' |
| HA-20 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-20/agent-result.json' |
| HA-19 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-19/agent-result.json' |
| HA-10 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-10/agent-result.json' |
| HA-07 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-07/agent-result.json' |
| HA-15 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-15/agent-result.json' |
| HA-14 | ❌ | 0/100 | Failed: Hermes agent runner did not produce valid JSON. stdout= stderr=/root/.benchlocal/benchpacks/hermesagent-20/versions/1.0.0-d094fbf6/verification/hermes-agent/venv/bin/python: can't open file '/opt/verification/agent-runner.py': [Errno 2] No such file or directory  error=ENOENT: no such file or directory, open '/tmp/hermesagent20-runs/hermesagent-20-2026-05-21T15-43-32.011Z-8f569c0d/local_model_gemma-4-31B-it/HA-14/agent-result.json' |

## 🏆 大模型综合评分

- **总得分**: 1320 / 3500
- **综合胜率**: **37.71%**
