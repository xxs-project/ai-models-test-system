import subprocess
import shlex

dataset_args = "--dataset-name prefix_repetition --prefix_rate 0.5"

# Simulate CommandBuilder._escape_shell_arg
sanitized = dataset_args
escaped_args = shlex.quote(sanitized)

command = f"cd /tmp && bash run_vllmbench.sh --dataset-args {escaped_args}"

# Simulate main.py here-document
script = f"""
cat << 'IN' > /tmp/benchmark.sh
#!/bin/bash
echo "Total args to benchmark: \$$#"
for i in "\$$@"; do
    echo "Arg: \$$i"
done
IN
chmod +x /tmp/benchmark.sh

cat << 'IN' > /tmp/run_vllmbench.sh
#!/bin/bash
DATASET_ARGS=""
while [[ \$$# -gt 0 ]]; do
    case "\$$1" in
        --dataset-args)
            DATASET_ARGS="\$$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done
INNER_ARGS=""
[ -n "\$$DATASET_ARGS" ] && INNER_ARGS="--dataset-args \\"\$$DATASET_ARGS\\""
bash -c "cd /tmp && bash benchmark.sh \$$INNER_ARGS"
IN
chmod +x /tmp/run_vllmbench.sh

nohup bash << 'INNER_EOF' > /tmp/test9.log 2>&1 &
{command} 2>&1
INNER_EOF
wait
sleep 0.1
cat /tmp/test9.log
"""
# Need to replace \$$ with $
script = script.replace("\$$", "$")

subprocess.run(["bash", "-c", script])
