import sys

with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# We need to move `scenario` and `features` so they are visible regardless of `startup_mode === 'api'`, since in the creation form they are visible for `container` mode too.
# Let's check where they are in the creation form.
# Ah, let's look at `startupMode === 'container'`.
