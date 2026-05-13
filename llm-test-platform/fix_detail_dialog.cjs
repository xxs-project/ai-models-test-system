const fs = require('fs');
const file = 'src/components/BenchmarkDetailDialog.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure import parseCardCount exists
if (!content.includes('parseCardCount')) {
  content = content.replace(
    /import \{ generateUniqueId \} from '@\/lib\/utils'/,
    "import { generateUniqueId, parseCardCount } from '@/lib/utils'"
  );
  if (!content.includes('parseCardCount')) {
    // If it still doesn't exist, we just add it to the top
    content = content.replace(
      /import \{ generateUniqueId \} from '@\/lib\/utils'/,
      "import { generateUniqueId, parseCardCount } from '@/lib/utils'"
    );
  }
}

// Add the definition inside the component
// Look for `const [editConfig, setEditConfig] = useState`
const searchStr = `  const [editConfig, setEditConfig] = useState<Benchmark['config'] | null>(null)`;
const insertStr = `  const cardCount = benchmark ? parseCardCount(benchmark.config.shardingConfig) : 1;\n  const [editConfig, setEditConfig] = useState<Benchmark['config'] | null>(null)`;

if (!content.includes('const cardCount = benchmark')) {
  content = content.replace(searchStr, insertStr);
}

fs.writeFileSync(file, content);
console.log("Fixed BenchmarkDetailDialog.tsx");
