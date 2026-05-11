from sqlmodel import create_engine
from typing import Optional
from contextlib import asynccontextmanager

# 数据库配置
import os
sqlite_file_name = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")
sqlite_url = f"sqlite:///{sqlite_file_name}"

# 创建数据库引擎
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

# 数据库连接上下文管理器
@asynccontextmanager
async def async_session():
    async with engine.begin() as conn:
        yield conn

# 同步会话管理器
def get_session():
    from sqlmodel import Session
    return Session(engine)