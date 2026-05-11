# 大模型测试平台部署脚本使用指南

## 目录

1. [系统要求](#系统要求)
2. [快速开始](#快速开始)
3. [详细部署步骤](#详细部署步骤)
4. [服务管理](#服务管理)
5. [常见问题](#常见问题)
6. [生产环境配置](#生产环境配置)

## 系统要求

### 最低要求
- **操作系统**: Linux (Ubuntu 20.04+) / macOS / Windows (WSL2)
- **Python**: 3.9+
- **Node.js**: 18+
- **内存**: 4GB RAM
- **磁盘**: 10GB 可用空间

### 推荐配置
- **操作系统**: Ubuntu 22.04 LTS
- **Python**: 3.11+
- **Node.js**: 20 LTS
- **内存**: 8GB RAM
- **磁盘**: 50GB SSD

## 快速开始

### 方式一：一键部署（推荐）

```bash
chmod +x deploy.sh
./deploy.sh all
```

### 方式二：手动部署

```bash
# 1. 安装后端依赖
cd backend
pip install -r requirements.txt

# 2. 安装前端依赖
cd ..
npm install

# 3. 构建前端
npm run build

# 4. 启动服务
./deploy.sh start
```

## 详细部署步骤

### 步骤 1：准备环境

#### 安装 Python 3.9+

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.9 python3-pip python3-venv
```

**macOS:**
```bash
brew install python@3.9
```

**Windows:**
下载安装包: https://www.python.org/downloads/

#### 安装 Node.js 18+

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS:**
```bash
brew install node@18
```

### 步骤 2：克隆项目

```bash
git clone <repository-url>
cd llm-test-platform
```

### 步骤 3：创建虚拟环境（可选但推荐）

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
.\venv\Scripts\activate  # Windows
```

### 步骤 4：安装依赖

```bash
# 安装后端依赖
cd backend
pip install -r requirements.txt
cd ..

# 安装前端依赖
npm install
```

### 步骤 5：配置环境

编辑 `backend/.env` 文件：

```env
# 数据库配置
DATABASE_URL=sqlite:///database.db

# API 服务配置
API_HOST=0.0.0.0
API_PORT=8000
```

### 步骤 6：初始化数据库

```bash
cd backend
python3 -c "from models import *; SQLModel.metadata.create_all(engine)"
```

### 步骤 7：启动服务

#### 开发模式

```bash
# 启动后端
cd backend
python3 main.py

# 新终端启动前端
cd ..
npm run dev
```

#### 生产模式

```bash
# 构建前端
npm run build

# 启动所有服务
./deploy.sh start
```

## 服务管理

### 查看服务状态

```bash
./deploy.sh status
```

### 启动服务

```bash
./deploy.sh start
```

### 停止服务

```bash
./deploy.sh stop
```

### 重启服务

```bash
./deploy.sh restart
```

### 查看日志

```bash
# 后端日志
tail -f logs/backend.log

# 前端日志
tail -f logs/frontend.log
```

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端界面 | http://localhost:5173 |
| 后端 API | http://localhost:8000/api |
| API 文档 | http://localhost:8000/docs |
| 健康检查 | http://localhost:8000/health |

## 常见问题

### Q1: 后端启动失败，提示端口已被占用

```bash
# 查看占用端口的进程
lsof -i :8000

# 或杀掉进程
kill -9 <PID>
```

### Q2: 前端无法连接后端 API

1. 检查后端是否运行：`./deploy.sh status`
2. 检查 CORS 配置
3. 检查防火墙设置

### Q3: 数据库初始化失败

```bash
# 删除旧数据库重新初始化
rm -f backend/database.db
python3 -c "from models import *; SQLModel.metadata.create_all(engine)"
```

### Q4: 依赖安装超时

```bash
# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/
npm install --registry=https://registry.npmmirror.com
```

## 生产环境配置

### 使用 PostgreSQL 替代 SQLite

1. 安装 PostgreSQL：
```bash
sudo apt install postgresql postgresql-contrib
```

2. 创建数据库：
```bash
sudo -u postgres psql
CREATE DATABASE llm_test_platform;
CREATE USER llm_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE llm_test_platform TO llm_user;
```

3. 修改环境配置：
```env
DATABASE_URL=postgresql://llm_user:your_password@localhost:5432/llm_test_platform
```

### 使用 PM2 管理 Node.js 进程

```bash
# 安装 PM2
npm install -g pm2

# 启动前端
pm2 start npm --name "llm-test-frontend" -- run dev

# 设置开机自启
pm2 startup
pm2 save
```

### 使用 Gunicorn 部署后端

```bash
# 安装 Gunicorn
pip install gunicorn

# 启动
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

### 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/llm-test-platform/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 监控与日志

### 日志位置

| 日志文件 | 说明 |
|---------|------|
| `logs/backend.log` | 后端运行日志 |
| `logs/frontend.log` | 前端运行日志 |

### 监控命令

```bash
# 实时监控日志
tail -f logs/*.log

# 检查磁盘使用
df -h

# 检查内存使用
free -h

# 检查进程状态
ps aux | grep python
ps aux | grep node
```

## 安全建议

1. **修改默认密码**
   - 修改数据库默认密码
   - 修改 SSH 连接密码

2. **配置防火墙**
```bash
# 只开放必要端口
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5173
sudo ufw allow 8000
sudo ufw enable
```

3. **启用 HTTPS**
- 使用 Let's Encrypt 获取免费证书
- 配置 Nginx HTTPS

4. **定期备份**
```bash
# 备份数据库
cp backend/database.db backups/database_$(date +%Y%m%d).db
```

## 获取帮助

- 项目 Issues: https://github.com/your-repo/issues
- 文档: 查看 `/docs` 目录
- API 文档: http://localhost:8000/docs
