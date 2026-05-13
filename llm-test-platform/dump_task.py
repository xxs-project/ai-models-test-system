import sqlite3
conn = sqlite3.connect('backend/database.db')
cursor = conn.cursor()
cursor.execute("SELECT id, model_name, status FROM evaltask WHERE id=14;")
print(cursor.fetchall())
