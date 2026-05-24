sed -i '/if \[ -f "$WORKDIR\/structoutput-15-verifier.tar.gz" \]; then/,/fi/!b;//!d;/fi/a\
    if [ -f "$WORKDIR/cli-40-verifier.tar.gz" ]; then\
        echo "  加载 cli-40-verifier.tar.gz..."\
        docker load -i "$WORKDIR/cli-40-verifier.tar.gz" || true\
    fi' run_benchlocal.sh
