import re
from datetime import datetime

test_time = "5/9/2026, 4:16:28 PM"
try:
    dt = datetime.strptime(test_time, "%m/%d/%Y, %I:%M:%S %p")
    print(dt.strftime("%Y-%m-%d %H:%M:%S"))
except Exception as e:
    print(e)
