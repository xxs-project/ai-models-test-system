const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
const importTarget = `import { Dashboard } from '@/pages/Dashboard'`;
const importNew = `import { Board } from '@/pages/Board'`;
code = code.replace(importTarget, `${importTarget}\n${importNew}`);

// Add route
const routeTarget = `<Route
          path="devices"
          element={
            <ErrorBoundary>
              <DeviceList />
            </ErrorBoundary>
          }
        />`;
const routeNew = `<Route
          path="board"
          element={
            <ErrorBoundary>
              <Board />
            </ErrorBoundary>
          }
        />`;
code = code.replace(routeTarget, `${routeNew}\n        ${routeTarget}`);

fs.writeFileSync('src/App.tsx', code);
