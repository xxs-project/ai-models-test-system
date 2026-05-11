with open("BenchLocal/run_benchlocal.sh", "r") as f:
    content = f.read()

# Replace the & escaping to be safer
content = content.replace(
    'sed -i \'s|git clone|git config --global url."https://gitclone.com/github.com/".insteadOf "https://github.com/" \\\\&\\\\& git clone|g\' "$ver_dir"',
    'sed -i \'s|git clone|git config --global url."https://gitclone.com/github.com/".insteadOf "https://github.com/" \\&\\& git clone|g\' "$ver_dir"'
)

with open("BenchLocal/run_benchlocal.sh", "w") as f:
    f.write(content)
