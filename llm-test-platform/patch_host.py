with open("BenchLocal/packages/benchpack-host/dist/index.js", "r") as f:
    content = f.read()

# Patch getGitHubArchiveUrl
content = content.replace(
    'return `https://codeload.github.com/${repo}/tar.gz/refs/tags/${tag}`;',
    'return `https://ghproxy.net/https://github.com/${repo}/archive/refs/tags/${tag}.tar.gz`;'
)

with open("BenchLocal/packages/benchpack-host/dist/index.js", "w") as f:
    f.write(content)
