import re

with open("backend/main.py", "r") as f:
    content = f.read()

new_endpoint = """
@app.delete("/api/eval/tasks/{task_id}")
async def delete_eval_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(EvalTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == "running":
        raise HTTPException(status_code=400, detail="Cannot delete running task")
    session.delete(task)
    session.commit()
    return {"status": "success"}

@app.post("/api/eval/stop")
"""

content = content.replace("@app.post(\"/api/eval/stop\")", new_endpoint)

with open("backend/main.py", "w") as f:
    f.write(content)
