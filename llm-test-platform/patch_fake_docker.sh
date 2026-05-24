sed -i 's/echo "\[\]"/echo "\[\]" \&\& echo "INSPECT [] RETURNED FOR $CONTAINER" >> \/tmp\/fake-docker-inspect.log/' bench_test/BenchLocal/docker
sed -i 's/echo "\[{\\"State/echo "[{\"State" \&\& echo "INSPECT SUCCESS FOR $CONTAINER" >> \/tmp\/fake-docker-inspect.log/g' bench_test/BenchLocal/docker
