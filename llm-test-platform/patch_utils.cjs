const fs = require('fs');

const path = 'src/lib/utils.ts';
let code = fs.readFileSync(path, 'utf8');

const oldCode = `export function parseGpuCount(shardingConfig: string): number {
  const match = shardingConfig.match(/(\\d+)卡/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return 1
}`;

const newCode = `export function parseGpuCount(shardingConfig: string): number {
  if (!shardingConfig) return 1;
  // Match "2卡", "TP2", "PP2", etc.
  const match1 = shardingConfig.match(/(\\d+)卡/);
  if (match1) {
    return parseInt(match1[1], 10);
  }
  const match2 = shardingConfig.match(/TP(\\d+)/i);
  if (match2) {
    return parseInt(match2[1], 10);
  }
  // Try to find any standalone number if it contains TP or PP
  const match3 = shardingConfig.match(/(\\d+)/);
  if (match3 && (shardingConfig.toLowerCase().includes('tp') || shardingConfig.toLowerCase().includes('pp'))) {
    return parseInt(match3[1], 10);
  }
  return 1;
}`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(path, code);
