import http from 'http';
const server = http.createServer((req, res) => {
    if (req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [{ id: 'gemma-4-31B-it' }] }));
        return;
    }
    if (req.url === '/v1/chat/completions') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            id: 'mock-123',
            choices: [{ message: { role: 'assistant', content: 'Mock response' } }]
        }));
        return;
    }
    res.writeHead(404);
    res.end();
});
server.listen(10092, '0.0.0.0', () => console.log('Mock server running on 10092'));
