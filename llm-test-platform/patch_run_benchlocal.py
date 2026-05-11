with open("BenchLocal/run_benchlocal.sh", "r") as f:
    content = f.read()

old_code = """                    const core = await import('@benchlocal/core');
                    await core.saveConfigFile(config, core.getConfigPath());
                    console.log("Config updated in memory:", config.benchpacks[pack]);"""

new_code = """                    const core = await import('@benchlocal/core');
                    await core.saveConfigFile(config, core.getConfigPath());"""

content = content.replace(old_code, new_code)
with open("BenchLocal/run_benchlocal.sh", "w") as f:
    f.write(content)
