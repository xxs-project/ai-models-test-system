import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5175;
const API_HOST = '127.0.0.1';
const API_PORT = 8001;

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(filePath, res) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return true;
  }
  return false;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;
  
  if (pathname.startsWith('/api/')) {
    const targetPath = pathname + url.search;
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: targetPath,
      method: req.method,
      headers: req.headers,
    };
    
    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, { 'Content-Type': 'application/json' });
      proxyRes.pipe(res);
    });
    
    proxy.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API代理错误', message: err.message }));
    });
    
    req.pipe(proxy);
  } else if (pathname === '/' || pathname === '/index.html') {
    const content = fs.readFileSync(indexPath);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  } else {
    const filePath = path.join(distPath, pathname);
    if (!serveStatic(filePath, res)) {
      const content = fs.readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('  大模型测试平台 - 前端服务');
  console.log('========================================');
  console.log(`  前端地址: http://localhost:${PORT}`);
  console.log(`  API代理:  http://localhost:${PORT}/api -> http://${API_HOST}:${API_PORT}`);
  console.log(`  后端API: http://localhost:${API_PORT}`);
  console.log(`  API文档:  http://localhost:${API_PORT}/docs`);
  console.log('========================================');
  console.log('  服务已启动');
  console.log('========================================');
  console.log('');
});
