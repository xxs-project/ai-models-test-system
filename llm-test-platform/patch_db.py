with open("backend/database.py", "r") as f:
    content = f.read()

content = content.replace('sqlite_file_name = "database.db"', 'import os\nsqlite_file_name = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")')

with open("backend/database.py", "w") as f:
    f.write(content)
