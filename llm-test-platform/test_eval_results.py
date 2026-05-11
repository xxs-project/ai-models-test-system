import asyncio
from backend.main import get_eval_results

async def main():
    res = await get_eval_results()
    import json
    print(json.dumps(res, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())