const cp = require('child_process');
cp.execFile('bench_test/BenchLocal/docker', ['inspect', 'benchlocal-hermesagent-20-verifier'], (err, stdout, stderr) => {
    console.log("stdout:", stdout);
    const parsed = JSON.parse(stdout);
    const details = parsed[0];
    const running = Boolean(details?.State?.Running);
    const portRecord = details?.NetworkSettings?.Ports?.[`4010/tcp`];
    console.log("running:", running);
    console.log("portRecord:", portRecord);
});
