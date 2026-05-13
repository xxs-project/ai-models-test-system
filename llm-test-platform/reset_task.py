import sqlite3

conn = sqlite3.connect('backend/database.db')
cursor = conn.cursor()
cursor.execute("UPDATE task SET status = 'pending' WHERE id = 15")
conn.commit()
conn.close()
print("Task 15 status reset to pending")
