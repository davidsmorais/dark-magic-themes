const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const previewDir = path.join(rootDir, 'preview');
const defaultPort = Number(process.env.PORT || 4173);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveRequestPath(urlPath) {
  if (urlPath === '/') {
    return path.join(previewDir, 'index.html');
  }

  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  return path.join(rootDir, safePath);
}

function sendFile(filePath, response) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Internal server error');
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, 'http://127.0.0.1');
  const filePath = resolveRequestPath(requestUrl.pathname);

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      sendFile(path.join(filePath, 'index.html'), response);
      return;
    }

    sendFile(filePath, response);
  });
});

server.listen(defaultPort, () => {
  console.log(`Theme preview available at http://localhost:${defaultPort}`);
});
