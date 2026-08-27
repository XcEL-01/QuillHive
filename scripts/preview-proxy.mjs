import http from 'node:http';

const sourcePort = Number(process.env.PORT || 8081);
const targetPort = Number(process.env.TARGET_PORT || 5000);
const targetHost = process.env.TARGET_HOST || '127.0.0.1';

const server = http.createServer((req, res) => {
  const options = {
    hostname: targetHost,
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${targetPort}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`QuillHive preview proxy could not reach port ${targetPort}: ${error.message}`);
  });

  req.pipe(proxyReq, { end: true });
});

server.on('upgrade', (req, socket) => {
  socket.destroy();
});

server.listen(sourcePort, '0.0.0.0', () => {
  console.log(`QuillHive preview proxy listening on ${sourcePort} -> ${targetHost}:${targetPort}`);
});
