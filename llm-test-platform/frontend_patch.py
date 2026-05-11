import re

with open("src/pages/EvalResults.tsx", "r") as f:
    content = f.read()

# We need to change the fetch endpoint and adapt the state
content = content.replace("fetch('/api/tasks/')", "fetch('/api/eval/results')")
content = content.replace("data => setTasks(data)", "data => setTasks(data.reports || [])")

# Replace getDeterministicScores logic with our real data
# Well, we need to completely rewrite the component if it expects task data.
# Let's inspect how tasks are rendered.
