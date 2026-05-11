with open("BenchLocal/packages/benchpack-host/dist/index.js", "r") as f:
    content = f.read()

content = content.replace(
    'return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");',
    'return process.cwd();'
)

with open("BenchLocal/packages/benchpack-host/dist/index.js", "w") as f:
    f.write(content)
