sed -i 's/lastLineCount = newLines.length;/lastLineCount = newLines.length;\n              setProgress(prev => Math.min(prev + Math.floor(Math.random() * 10) + 5, 95));/' src/pages/EvalManage.tsx
