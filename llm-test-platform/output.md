# 测试任务完成后自动导入基准测试功能实现提示词

## 一、功能概述

实现测试任务执行完成后，自动从测试结果路径导入测试结果到基准测试列表的功能，支持单模型性能测试和全套模型性能测试两种场景。

## 二、数据字段映射规则

### 2.1 单模型性能测试字段映射

| 字段名称 | 数据来源 | 提取规则 |
|---------|---------|---------|
| **模型名称** | CSV文件名 | 从文件名中提取：`架构_推理框架_result_模型名称_NPU数量_npu_图模式.csv`<br>例如：`x86_64_vllm_results_Qwen3-4B_1_npu_aclgraph.csv` → 模型名称为 `Qwen3-4B` |
| **服务器名称** | 芯片+架构组合 | 规则：<br>- 芯片910B2C + 架构x86 = G8600<br>- 芯片910B + 架构ARM = G5680<br>- 芯片910B4 + 架构x86 = G5500<br>- 芯片910B4 + 架构ARM = G5580 |
| **切分参数** | CSV文件名 | 从文件名中提取NPU数量，转换为TP格式（如：1_npu → TP1, 2_npu → TP2） |
| **AI芯片** | 设备信息 | `device.accelerator_type`（如："Ascend 910B2C"） |
| **推理框架** | 测试任务 | `task.inference_framework` → 1=vLLM, 2=MindIE |
| **推理框架版本** | 测试任务 | `task.framework_version` |
| **提交人** | 测试任务 | `task.created_by` |
| **测试日期** | 测试任务 | `task.end_time` 或 `task.created_at`（格式化为YYYY-MM-DD） |
| **图模式** | CSV文件名 | 从文件名中提取图模式（如：aclgraph、eager） |
| **算子加速** | - | 暂为空字符串或从配置中获取 |
| **框架启动参数** | vLLM启动日志 | 从日志中提取 `Final command:` 后的完整命令 |
| **备注** | - | 暂为空或可添加任务ID引用 |
| **性能指标数据** | CSV文件 | 解析CSV文件的并发、输入输出长度、TTFT、TPOT、TPS等 |

### 2.2 全套模型性能测试字段映射

| 字段名称 | 数据来源 | 提取规则 |
|---------|---------|---------|
| **模型名称** | CSV文件名 | 从文件名中提取：`架构_推理框架_result_模型名称_NPU数量_npu_图模式.csv`<br>例如：`x86_64_vllm_results_Qwen3-4B_1_npu_aclgraph.csv` → 模型名称为 `Qwen3-4B` |
| **服务器名称** | 芯片+架构组合 | 同单模型测试规则 |
| **切分参数** | CSV文件名 | 从文件名中提取NPU数量，转换为TP格式 |
| **AI芯片** | 设备信息 | `device.accelerator_type` |
| **推理框架** | 测试任务 | `task.inference_framework` → 1=vLLM, 2=MindIE |
| **推理框架版本** | 测试任务 | `task.framework_version` |
| **提交人** | 测试任务 | `task.created_by` |
| **测试日期** | 测试任务 | `task.end_time` 或 `task.created_at` |
| **图模式** | CSV文件名 | 从文件名中提取图模式（如：aclgraph、eager） |
| **算子加速** | - | 暂为空 |
| **框架启动参数** | vLLM启动日志 | 从日志文件中提取 |
| **备注** | - | 暂为空 |
| **性能指标数据** | CSV文件 | 解析CSV文件内容 |

## 三、文件路径规则

### 3.1 CSV文件路径

**单模型性能测试**：
```
results_vllm_single/vllm_{framework_version}/x86_64_vllm_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
或
results_vllm_single/vllm_{framework_version}/aarch64_vllm_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
```

**全套模型性能测试**：
```
results_vllm_all/vllm_{framework_version}/x86_64_vllm_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
或
results_vllm_all/vllm_{framework_version}/aarch64_vllm_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
```

### 3.2 vLLM启动日志路径

**日志命名格式**：
```
{架构}_start_vllm_{模型名称}_{时间戳}_{NPU数}_npu_{图模式}.log
```

**示例**：
```
x86_64_start_vllm_Qwen3-14B_1770735692_2_npu_eager.log
```

**日志存储位置**：
```
results_vllm_single/vllm_{framework_version}/log/
或
results_vllm_all/vllm_{framework_version}/log/
```

## 四、CSV文件解析规则

### 4.1 必需列（支持别名）

| 列名 | 别名 | 说明 |
|-----|------|------|
| `concurrency` | `Process Num`, `c`, `process` | 并发数 |
| `inputLength` | `Input Length`, `input`, `il`, `avg input tokens` | 输入长度 |
| `outputLength` | `Output Length`, `output`, `ol`, `avg output tokens` | 输出长度 |
| `ttft` | `TTFT (ms)`, `首token`, `first token` | 首token延迟（毫秒） |
| `tpot` | `per token`, `每token` | 每token输出时间（毫秒） |
| `tokensPerSecond` | `tps`, `TPS`, `每秒token`, `tokens per second` | 每秒token数 |

### 4.2 可选列

| 列名 | 别名 | 说明 |
|-----|------|------|
| `totalTimeMs` | `Total Time (ms)`, `totalTime` | 总时间（毫秒） |
| `tpsWithPrefill` | `tps (with prefill)`, `avg tps (with prefill)` | 含预填充的TPS |
| `tpsWithoutPrefill` | `tps (without prefill)`, `avg tps (without prefill)` | 不含预填充的TPS |

### 4.3 数据解析逻辑

```python
# 1. 列匹配：使用别名匹配，不区分大小写，忽略空格
headers = [h.strip().lower() for h in headers]

# 2. 值转换：解析为浮点数，转换失败则使用默认值
concurrency = parse_float(values[concurrency_idx])
inputLength = parse_float(values[inputLength_idx]) or 1024
outputLength = parse_float(values[outputLength_idx]) or 128

# 3. TPOT自动计算
if tpot is None and totalTimeMs is not None and outputLength > 0:
    tpot = totalTimeMs / outputLength

# 4. TPS自动计算
if tokensPerSecond is None and tpot > 0:
    tokensPerSecond = 1000 / tpot
```

## 五、vLLM启动日志解析规则

### 5.1 日志中的启动命令提取

```python
# 匹配模式
pattern = r'Final command: (vllm serve .+)'
match = re.search(pattern, log_content)
if match:
    frameworkParams = match.group(1)
```

### 5.2 示例日志内容

```
Final command: vllm serve --port 2800 /data/models/Qwen3-14B --served-model-name Qwen3-14B --tensor-parallel-size 2 --disable-log-stats --disable-log-requests --load-format dummy --enforce-eager
```

提取结果：
```
--port 2800 /data/models/Qwen3-14B --served-model-name Qwen3-14B --tensor-parallel-size 2 --disable-log-stats --disable-log-requests --load-format dummy --enforce-eager
```

## 六、服务器名称生成规则

### 6.1 服务器型号映射表

| AI芯片 | 架构 | 服务器名称 |
|--------|------|-----------|
| Ascend 910B2C | x86_64 | G8600 |
| Ascend 910B | aarch64 | G5680 |
| Ascend 910B4 | x86_64 | G5500 |
| Ascend 910B4 | aarch64 | G5580 |

### 6.2 实现逻辑

```python
def get_server_name(chip_type: str, arch: str) -> str:
    # 标准化芯片类型
    if '910B2C' in chip_type:
        chip_key = '910B2C'
    elif '910B4' in chip_type:
        chip_key = '910B4'
    elif '910B' in chip_type:
        chip_key = '910B'
    else:
        chip_key = chip_type

    # 标准化架构
    arch = arch.lower()

    # 映射规则
    mapping = {
        ('910B2C', 'x86_64'): 'G8600',
        ('910B', 'aarch64'): 'G5680',
        ('910B4', 'x86_64'): 'G5500',
        ('910B4', 'aarch64'): 'G5580',
    }

    return mapping.get((chip_key, arch), f'Unknown-{chip_key}-{arch}')
```

## 七、CSV文件名元数据提取规则

### 7.1 文件名解析函数

```python
def extract_model_name_from_filename(filename: str) -> str:
    """
    从CSV文件名中提取模型名称
    文件名格式: {arch}_{framework}_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
    示例: x86_64_vllm_results_Qwen3-4B_1_npu_aclgraph.csv
    """
    name_without_ext = filename.replace('.csv', '')
    parts = name_without_ext.split('_')

    # 找到 "results" 后的部分为模型名称
    try:
        results_index = parts.index('results')
        # 从results后一个索引开始，到 {npu_count} 前一个索引结束
        model_parts = []
        for i in range(results_index + 1, len(parts)):
            part = parts[i]
            # 遇到数字（npu_count）时停止
            if part.isdigit():
                break
            model_parts.append(part)

        return '_'.join(model_parts)
    except (ValueError, IndexError):
        return filename

def extract_npu_count_from_filename(filename: str) -> int:
    """
    从CSV文件名中提取NPU数量
    文件名格式: {arch}_{framework}_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
    示例: x86_64_vllm_results_Qwen3-4B_1_npu_aclgraph.csv → 1
    """
    import re
    match = re.search(r'_(\d+)_npu_', filename)
    if match:
        return int(match.group(1))
    return 1  # 默认值

def extract_graph_mode_from_filename(filename: str) -> str:
    """
    从CSV文件名中提取图模式
    文件名格式: {arch}_{framework}_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
    示例: x86_64_vllm_results_Qwen3-4B_1_npu_aclgraph.csv → aclgraph
    """
    # 提取最后一个部分（去掉.csv）
    graph_mode = filename.replace('.csv', '').split('_')[-1]
    return graph_mode
```

### 7.2 切分参数生成规则

```python
def get_sharding_config(npu_count: int) -> str:
    """
    根据NPU数量生成切分参数
    """
    return f'TP{npu_count}'
```

**示例**：
- npu_count = 1 → "TP1"
- npu_count = 2 → "TP2"
- npu_count = 4 → "TP4"
- npu_count = 8 → "TP8"

## 八、完整实现流程

### 8.1 单模型性能测试自动导入流程

```python
async def auto_import_single_model_result(task_id: int):
    # 1. 获取任务信息
    task = get_task(task_id)
    if task.status != TaskStatus.COMPLETED:
        return

    # 2. 获取设备信息
    device = get_device(task.device_id)

    # 3. 生成CSV文件路径
    framework_label = 'vllm' if task.inference_framework == 1 else 'mindie'
    csv_path = f"results_{framework_label}_single/{framework_label}_{task.framework_version}/{device.arch}_{framework_label}_results_{task.model_name}_{task.npu_count}_npu_{task.graph_mode}.csv"

    # 4. 解析CSV文件
    metrics = parse_csv_file(csv_path)

    # 5. 从CSV文件名提取元数据（与全套测试保持一致）
    filename = os.path.basename(csv_path)
    # 格式: {arch}_{framework}_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
    model_name_from_csv = extract_model_name_from_filename(filename)
    npu_count_from_csv = extract_npu_count_from_filename(filename)
    graph_mode_from_csv = extract_graph_mode_from_filename(filename)

    # 6. 生成服务器名称
    server_name = get_server_name(device.accelerator_type, device.arch)

    # 7. 生成切分参数（从CSV文件名提取）
    sharding_config = get_sharding_config(npu_count_from_csv)

    # 8. 查找并解析vLLM启动日志
    log_dir = f"results_{framework_label}_single/{framework_label}_{task.framework_version}/log/"
    log_pattern = f"{device.arch}_start_vllm_{model_name_from_csv}_*_{npu_count_from_csv}_npu_{graph_mode_from_csv}.log"
    framework_params = extract_framework_params(log_dir, log_pattern)

    # 9. 构建Benchmark配置
    config = {
        "submitter": task.created_by,
        "modelName": model_name_from_csv,
        "serverName": server_name,
        "chipName": device.accelerator_type,
        "framework": "vLLM" if task.inference_framework == 1 else "MindIE",
        "frameworkVersion": task.framework_version,
        "shardingConfig": sharding_config,
        "graphMode": graph_mode_from_csv,
        "testDate": task.end_time.strftime('%Y-%m-%d'),
        "operatorAcceleration": "",
        "frameworkParams": framework_params,
        "notes": f"自动导入，任务ID: {task.id}"
    }

    # 10. 创建Benchmark记录
    create_benchmark(config, metrics)
```

### 8.2 全套模型性能测试自动导入流程

```python
async def auto_import_all_models_result(task_id: int):
    # 1. 获取任务信息
    task = get_task(task_id)
    if task.status != TaskStatus.COMPLETED:
        return

    # 2. 获取设备信息
    device = get_device(task.device_id)

    # 3. 扫描结果目录
    framework_label = 'vllm' if task.inference_framework == 1 else 'mindie'
    result_dir = f"results_{framework_label}_all/{framework_label}_{task.framework_version}/"

    # 4. 查找所有CSV文件
    csv_files = glob.glob(f"{result_dir}/{device.arch}_{framework_label}_results_*.csv")

    for csv_file in csv_files:
        # 5. 从文件名提取元数据
        filename = os.path.basename(csv_file)
        # 格式: {arch}_{framework}_results_{model_name}_{npu_count}_npu_{graph_mode}.csv
        model_name = extract_model_name_from_filename(filename)
        npu_count = extract_npu_count_from_filename(filename)
        graph_mode = extract_graph_mode_from_filename(filename)

        # 6. 解析CSV文件
        metrics = parse_csv_file(csv_file)

        # 7. 生成服务器名称
        server_name = get_server_name(device.accelerator_type, device.arch)

        # 8. 生成切分参数
        sharding_config = f'TP{npu_count}'

        # 9. 查找并解析vLLM启动日志
        log_dir = f"results_{framework_label}_all/{framework_label}_{task.framework_version}/log/"
        log_pattern = f"{device.arch}_start_vllm_{model_name}_*_{npu_count}_npu_{graph_mode}.log"
        framework_params = extract_framework_params(log_dir, log_pattern)

        # 10. 构建Benchmark配置
        config = {
            "submitter": task.created_by,
            "modelName": model_name,
            "serverName": server_name,
            "chipName": device.accelerator_type,
            "framework": "vLLM" if task.inference_framework == 1 else "MindIE",
            "frameworkVersion": task.framework_version,
            "shardingConfig": sharding_config,
            "graphMode": graph_mode,
            "testDate": task.end_time.strftime('%Y-%m-%d'),
            "operatorAcceleration": "",
            "frameworkParams": framework_params,
            "notes": f"自动导入，任务ID: {task.id}"
        }

        # 11. 创建Benchmark记录
        create_benchmark(config, metrics)
```

## 九、后端API设计

### 9.1 新增自动导入API

```python
@app.post("/api/tasks/{task_id}/auto-import")
async def auto_import_task_result(task_id: int):
    """
    自动导入测试任务结果到基准测试列表
    """
    try:
        task = session.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")

        if task.status != TaskStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="任务未完成，无法导入")

        # 根据测试模式调用不同的导入逻辑
        if task.test_mode == 1:  # 单模型性能测试
            result = await auto_import_single_model_result(task_id)
        elif task.test_mode == 2:  # 全套模型性能测试
            result = await auto_import_all_models_result(task_id)
        else:
            raise HTTPException(status_code=400, detail="不支持的测试模式")

        return {
            "success": True,
            "message": f"成功导入 {result['count']} 条基准测试数据",
            "benchmark_ids": result['ids']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 9.2 任务状态变更触发自动导入

在任务监控模块中，当任务状态变为COMPLETED时，自动触发导入：

```python
# 在 task_monitor.py 的 _check_completion_from_log 函数中
if status == 'success':
    # 更新任务状态为COMPLETED
    update_task_status(task_id, TaskStatus.COMPLETED)

    # 自动导入测试结果
    try:
        auto_import_task_result(task_id)
    except Exception as e:
        logger.error(f"自动导入失败: {e}")
```

## 十、前端集成建议

### 10.1 任务列表页面添加导入按钮

在任务完成后，显示"自动导入"按钮，或自动执行导入并显示结果：

```typescript
// 在任务列表中添加自动导入按钮
{task.status === TaskStatus.COMPLETED && (
  <Button
    onClick={() => handleAutoImport(task.id)}
    disabled={isImporting}
  >
    自动导入基准测试
  </Button>
)}
```

### 10.2 导入成功提示

```typescript
const handleAutoImport = async (taskId: number) => {
  try {
    const result = await fetch(`/api/tasks/${taskId}/auto-import`, {
      method: 'POST'
    }).then(res => res.json())

    toast.success(result.message)
    // 刷新基准测试列表
    queryClient.invalidateQueries(['benchmarks'])
  } catch (error) {
    toast.error('导入失败')
  }
}
```

## 十一、错误处理和日志记录

### 11.1 常见错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| CSV文件不存在 | 记录警告日志，跳过导入 |
| CSV格式错误 | 记录错误日志，标记导入失败 |
| 日志文件不存在 | frameworkParams留空，继续导入 |
| 设备信息缺失 | 使用默认值，记录警告 |
| 重复导入 | 检查是否已存在相同配置的Benchmark，可选择覆盖或跳过 |

### 11.2 日志记录示例

```python
logger.info(f"开始自动导入任务 {task_id} 的测试结果")
logger.info(f"找到CSV文件: {csv_path}")
logger.info(f"解析出 {len(metrics)} 条性能数据")
logger.info(f"成功创建Benchmark记录，ID: {benchmark_id}")
logger.error(f"CSV文件不存在: {csv_path}")
logger.warning(f"未找到启动日志，frameworkParams将为空")
```

## 十二、测试建议

### 12.1 单元测试

- 测试CSV解析逻辑的各种列名别名
- 测试服务器名称生成规则的所有组合
- 测试切分参数生成逻辑
- 测试vLLM启动日志提取逻辑

### 12.2 集成测试

- 模拟任务完成场景，验证自动导入是否触发
- 验证单模型测试和全套测试的不同导入逻辑
- 验证导入后的Benchmark数据完整性
- 测试异常场景（文件缺失、格式错误等）
