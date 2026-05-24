# 大模型测试平台

## 项目概述

大模型测试平台是一个统一的大模型性能测试管理系统，提供设备管理、测试执行、结果分析等完整功能。

## 技术栈

### 前端
- **框架**: React 19
- **构建工具**: Vite 7.2.6
- **UI组件**: Shadcn UI / Radix UI
- **样式**: Tailwind CSS
- **状态管理**: TanStack Query
- **路由**: React Router 7
- **图表**: Recharts

### 后端
- **框架**: FastAPI
- **数据库**: SQLModel (SQLite/PostgreSQL)
- **异步任务**: APScheduler
- **SSH连接**: Paramiko

## 项目结构

```
llm-test-platform/
├── src/
│   ├── main.tsx              # React入口
│   ├── App.tsx               # 应用主组件
│   ├── index.css             # 全局样式
│   │
│   ├── components/           # 公共组件
│   │   ├── ui/              # Shadcn UI组件
│   │   ├── Layout.tsx       # 布局组件
│   │   ├── DeviceCard.tsx   # 设备卡片
│   │   └── TaskCard.tsx     # 任务卡片
│   │
│   ├── pages/               # 页面组件
│   │   ├── Dashboard.tsx    # 仪表板
│   │   ├── DeviceList.tsx   # 设备管理
│   │   ├── TaskList.tsx     # 测试管理
│   │   ├── BenchmarkList.tsx # 结果呈现
│   │   └── SystemSettings.tsx # 系统设置
│   │
│   ├── hooks/               # 自定义Hooks
│   │   ├── use-devices.ts
│   │   ├── use-tasks.ts
│   │   └── use-benchmarks.ts
│   │
│   └── lib/                 # 工具库
│       ├── api.ts           # API客户端
│       ├── types.ts         # TypeScript类型
│       └── utils.ts         # 工具函数
│
├── backend/
│   ├── main.py              # FastAPI主入口
│   ├── models.py            # 数据模型
│   ├── schemas.py           # Pydantic模式
│   ├── requirements.txt     # Python依赖
│   └── database.db          # SQLite数据库
│
├── deploy.sh                # 一键部署脚本
├── package.json             # Node依赖
├── requirements.txt         # Python依赖
├── vite.config.ts           # Vite配置
├── tailwind.config.js       # Tailwind配置
├── tsconfig.json            # TypeScript配置
│
├── DEPLOYMENT_GUIDE.md      # 部署指南
├── USER_GUIDE.md            # 用户指南
├── TEST_CASES.md            # 测试用例
└── README.md                # 本文件
```

## 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 安装后端依赖
cd backend
pip install -r requirements.txt

# 安装前端依赖
cd ..
npm install
```

### 启动服务

```bash
# 启动后端服务 (端口8000)
cd backend
python3 main.py

# 启动前端服务 (端口5175)
cd ..
npm run dev
```

### 一键部署

```bash
chmod +x deploy.sh
./deploy.sh all
```

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端界面 | http://localhost:5175 |
| 后端API | http://localhost:8000 |
| API文档 | http://localhost:8000/docs |

## 主要功能

### 1. 设备管理
- 添加/编辑/删除设备
- SSH连接测试
- 设备状态监控
- 加速卡信息展示

### 2. 测试管理
- 创建测试任务
- 执行/取消任务
- 任务进度跟踪
- 任务队列管理

### 3. 结果呈现
- 基准测试列表
- 性能对比分析
- CSV数据导入
- 报告生成导出

## API接口

### 设备管理
- `GET /api/devices` - 获取设备列表
- `POST /api/devices` - 添加设备
- `PUT /api/devices/{id}` - 更新设备
- `DELETE /api/devices/{id}` - 删除设备
- `POST /api/devices/{id}/refresh` - 刷新设备状态

### 测试管理
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `POST /api/tasks/{id}/execute` - 执行任务
- `POST /api/tasks/{id}/cancel` - 取消任务
- `DELETE /api/tasks/{id}` - 删除任务

### 结果管理
- `GET /api/benchmarks` - 获取基准测试列表
- `POST /api/benchmarks` - 创建基准测试
- `DELETE /api/benchmarks/{id}` - 删除基准测试
- `GET /api/reports` - 获取报告列表
- `POST /api/reports` - 创建报告

## 开发指南

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `App.tsx` 添加路由
3. 更新导航菜单

### 添加新API

1. 在 `backend/schemas.py` 定义请求/响应模型
2. 在 `backend/main.py` 添加路由
3. 在 `src/hooks/` 添加对应的Hook

### 运行测试

```bash
# 前端测试
npm run test

# 后端测试
cd backend
pytest
```

## 部署

详细部署指南请参考 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 用户指南

详细用户指南请参考 [USER_GUIDE.md](USER_GUIDE.md)

## 测试用例

详细测试用例请参考 [TEST_CASES.md](TEST_CASES.md)

## License

MIT License
