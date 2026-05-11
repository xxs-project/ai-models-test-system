import re

with open("BenchLocal/run_benchlocal.sh", "r") as f:
    content = f.read()

# Let's fix the specific sed command that failed
old_sed = "sed -i 's|git clone|git config --global url.\"https://gitclone.com/github.com/\".insteadOf \"https://github.com/\" \\&\\& git clone|g' \"$ver_dir\""
new_sed = "sed -i 's|git clone|git config --global url.\"https://gitclone.com/github.com/\".insteadOf \"https://github.com/\" \\&\\& git clone|g' \"$ver_dir\""

# Actually let's just make it simpler
new_sed = "sed -i 's|git clone|git config --global url.\"https://gitclone.com/github.com/\".insteadOf \"https://github.com/\" \\\\&\\\\& git clone|g' \"$ver_dir\""

content = content.replace(old_sed, new_sed)

with open("BenchLocal/run_benchlocal.sh", "w") as f:
    f.write(content)
