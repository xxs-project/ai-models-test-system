const fs = require('fs');
const file = 'src/components/BenchmarkDetailDialog.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import { parseCardCount } from '@/lib/utils'")) {
  content = content.replace(
    "import { toast } from 'sonner'",
    "import { toast } from 'sonner'\nimport { parseCardCount } from '@/lib/utils'"
  );
}

fs.writeFileSync(file, content);
console.log("Added import to BenchmarkDetailDialog.tsx");
