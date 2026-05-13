import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateUniqueId(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export function parseCardCount(shardingConfig: string): number {
  if (!shardingConfig) return 1;
  // Match "2卡", "TP2", "PP2", etc.
  const match1 = shardingConfig.match(/(\d+)卡/);
  if (match1) {
    return parseInt(match1[1], 10);
  }
  const match2 = shardingConfig.match(/TP(\d+)/i);
  if (match2) {
    return parseInt(match2[1], 10);
  }
  // Try to find any standalone number if it contains TP or PP
  const match3 = shardingConfig.match(/(\d+)/);
  if (match3 && (shardingConfig.toLowerCase().includes('tp') || shardingConfig.toLowerCase().includes('pp'))) {
    return parseInt(match3[1], 10);
  }
  return 1;
}
