while [[ $# -gt 0 ]]; do
    case "$1" in
        --dataset-args)
            DATASET_ARGS="$2"
            shift 2
            ;;
        *)
            echo "Unknown parameter: $1"
            exit 1
            ;;
    esac
done
echo "DATASET_ARGS is [$DATASET_ARGS]"
