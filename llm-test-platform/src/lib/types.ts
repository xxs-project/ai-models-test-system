export interface Device {
  id: number
  ip: string
  port: number
  username: string
  password: string
  status: 'Online' | 'Offline' | 'Unknown'
  os_info?: string
  arch?: string
  accelerator_type?: string
  accelerator_count: number
  idle_count: number
  busy_count: number
  warning_count: number
  accelerator_status?: Record<string, unknown>
  last_updated?: string
  remark?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  task_name: string
  task_description?: string
  priority: number
  test_type: number
  test_mode: number
  status: number
  progress: number
  device_id?: number
  device_ip?: string
  device_username?: string
  device_password?: string
  model_name?: string
  model_path: string
  test_path?: string
  script_path?: string
  inference_framework: number
  framework_version: string
  npu_count?: number
  graph_mode?: string
  scenario?: string
  features?: string | string[]
  execution_id?: number
  execution_flag?: string
  dataset_name?: string;
  startup_mode?: "api" | "container";
  base_url?: string;
  api_key?: string;
  parameter_combination?: string;
  processor_type?: string;
  server_model?: string;
  framework_startup_args?: string;
  accelerator_card?: string;
  context_lengths: string
  concurrencies: string
  error_message?: string
  created_by: string
  created_at: string
  updated_at: string
  start_time?: string
  end_time?: string
}

export interface Benchmark {
  id: number
  unique_id: string
  config: BenchmarkConfig
  metrics: BenchmarkMetricsEntry[]
  created_at: string
}

export interface ComparisonReport {
  id: number
  unique_id: string
  benchmark_id1: number
  benchmark_id2: number
  model_name1: string
  model_name2: string
  summary: string
  created_at: string
}

export interface ComparisonExportData {
  benchmark1: Benchmark
  benchmark2: Benchmark
  summary: string
  selectedCombo: string
}

export interface BenchmarkConfig {
  submitter: string
  modelName: string
  serverName: string
  chipName: string
  framework: string
  frameworkVersion: string
  shardingConfig: string
  graphMode?: string
  operatorAcceleration?: string
  frameworkParams?: string
  testDate: string
  notes?: string
  scenario?: string
  features?: string[] | string
  dataset_args?: string
}

export interface PerformanceMetrics {
  inputLength: number
  outputLength: number
  concurrency: number
  ttft: number
  tpot: number
  tokensPerSecond: number
}

export type BenchmarkMetricsEntry = PerformanceMetrics

export interface Report {
  id: number
  unique_id: string
  benchmark_id1: number
  benchmark_id2: number
  model_name1: string
  model_name2: string
  summary: string
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export const TaskStatus = {
  PENDING: 0,
  QUEUED: 1,
  PREPARING: 2,
  RUNNING: 3,
  COMPLETED: 4,
  FAILED: 5,
  CANCELLED: 6,
  TIMEOUT: 7,
} as const

export const TaskStatusLabels: Record<number, string> = {
  0: '待执行',
  1: '队列中',
  2: '环境准备中',
  3: '执行中',
  4: '已完成',
  5: '失败',
  6: '已取消',
  7: '超时',
}

export const TestTypeLabels: Record<number, string> = {
  1: '性能测试',
  2: '精度测试',
}

export const InferenceFramework = {
  VLLM: 1,
  MINDIE: 2,
} as const

export type InferenceFrameworkType = typeof InferenceFramework[keyof typeof InferenceFramework]

export const InferenceFrameworkLabels: Record<number, string> = {
  1: 'vLLM',
  2: 'MindIE',
}

export const InferenceFrameworkDisplay: Record<number, string> = {
  1: 'vLLM',
  2: 'MindIE',
}

export const PriorityLabels: Record<number, string> = {
  0: '低',
  1: '中',
  2: '高',
}
