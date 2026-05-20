DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"
input_len=1024
output_len=1024
dataset_name="random"

    if [[ -n "${DATASET_ARGS:-}" ]]; then
        eval "dataset_args_arr=(${DATASET_ARGS})"
        
        # 提取 current_dataset_name 
        current_dataset_name="$dataset_name"
        if [[ "$DATASET_ARGS" =~ --dataset-name[[:space:]=]+([^[:space:]]+) ]]; then
            current_dataset_name="${BASH_REMATCH[1]}"
            # 去除可能包含的引号
            current_dataset_name="${current_dataset_name%\"}"
            current_dataset_name="${current_dataset_name#\"}"
            current_dataset_name="${current_dataset_name%\'}"
            current_dataset_name="${current_dataset_name#\'}"
        fi

        # 解析 --prefix_rate 值
        if [[ "$DATASET_ARGS" =~ --prefix_rate[[:space:]=]+([0-9.]+) ]]; then
            PREFIX_RATE="${BASH_REMATCH[1]}"
        fi

        # 去掉 dataset_args_arr 中的 --prefix_rate 参数
        if [[ "$DATASET_ARGS" =~ --prefix_rate ]]; then
            temp_args=()
            for arg in "${dataset_args_arr[@]}"; do
                if [[ "$arg" != "--prefix_rate" && "$arg" != "$PREFIX_RATE" ]]; then
                    temp_args+=("$arg")
                fi
            done
            dataset_args_arr=("${temp_args[@]}")
        fi
        
        # 4、根据 dataset-name 追加长度参数
        if [[ "$current_dataset_name" == "sonnet" ]]; then
            dataset_args_arr+=(--sonnet-input-len "$input_len" --sonnet-output-len "$output_len")
        elif [[ "$current_dataset_name" == "sharegpt" ]]; then
            dataset_args_arr+=(--input-len "$input_len" --sharegpt-output-len "$output_len")
        elif [[ "$current_dataset_name" == "burstgpt" ]]; then
            dataset_args_arr+=(--burstgpt-input-len "$input_len" --burstgpt-output-len "$output_len")
        elif [[ "$current_dataset_name" == "prefix_repetition" ]]; then
            if [[ -n "$PREFIX_RATE" ]]; then
                prefix_len=$(awk "BEGIN {printf \"%.0f\", $input_len * $PREFIX_RATE}")
                suffix_len=$(awk "BEGIN {printf \"%.0f\", $input_len - $input_len * $PREFIX_RATE}")
                dataset_args_arr+=(--prefix-repetition-prefix-len "$prefix_len" --prefix-repetition-suffix-len "$suffix_len" --prefix-repetition-output-len "$output_len")
            else
                default_dataset_args=(
            	     --dataset-name "$dataset_name"
                     --random-input-len "$input_len"
                     --random-output-len "$output_len"
        	)
	        dataset_args_arr=("${default_dataset_args[@]}")

            fi
        fi
    fi
echo "${dataset_args_arr[@]}"
