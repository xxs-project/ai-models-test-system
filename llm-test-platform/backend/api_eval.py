import os
import asyncio
from fastapi import HTTPException
from pydantic import BaseModel

class EvalStartRequest(BaseModel):
    packs: str
    model_name: str
    base_url: str
    api_key: str

