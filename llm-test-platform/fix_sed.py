import re

with open("BenchLocal/run_benchlocal.sh", "r") as f:
    content = f.read()

# Replace the problematic awk/sed command at line 275
old_awk = """    if [[ "$ver_dir" == *"hermesagent"* ]]; then
        sed -i 's|chromium \\|chromium curl \\|g' "$ver_dir"
        awk '{print}/apt-get.*chromium.*\\$/{print; print "RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \\"; print "  && apt-get install -y nodejs \\"; print "  && rm -rf /var/lib/apt/lists/*"; next}1' "$ver_dir" > "$ver_dir.tmp" && mv "$ver_dir.tmp" "$ver_dir"
    fi"""

new_awk = """    if [[ "$ver_dir" == *"hermesagent"* ]]; then
        sed -i 's|chromium \\\\|chromium curl \\\\|g' "$ver_dir"
        awk '/apt-get.*chromium.*/{print; print "RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \\\\"; print "  && apt-get install -y nodejs \\\\"; print "  && rm -rf /var/lib/apt/lists/*"; next}1' "$ver_dir" > "$ver_dir.tmp" && mv "$ver_dir.tmp" "$ver_dir"
    fi"""

content = content.replace(old_awk, new_awk)

with open("BenchLocal/run_benchlocal.sh", "w") as f:
    f.write(content)
