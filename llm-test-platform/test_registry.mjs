import fs from 'fs/promises';
async function test() {
    const res = await fetch("https://ghproxy.net/https://raw.githubusercontent.com/stevibe/benchlocal-registry/main/registry.json");
    const registry = await res.json();
    console.log(registry.packs.find(e => e.id === 'bugfind-15'));
}
test();
