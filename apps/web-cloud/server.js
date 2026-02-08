// SvelteKit standalone server with static file serving
import { Server } from './build/server/index.js';
import { manifest } from './build/server/manifest.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.join(__dirname, 'build/client');

const server = new Server(manifest);

// Initialize server
await server.init({
    env: process.env
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// MIME types mapping
const MIME_TYPES = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.webp': 'image/webp',
};

function serveStaticFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.statusCode = 404;
            res.end('Not Found');
            return;
        }

        const ext = path.extname(filePath);
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        res.statusCode = 200;
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.end(data);
    });
}

const httpServer = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

        // Serve static files from _app directory
        if (url.pathname.startsWith('/_app/')) {
            const filePath = path.join(CLIENT_DIR, url.pathname);

            // Security check - prevent directory traversal
            if (!filePath.startsWith(CLIENT_DIR)) {
                res.statusCode = 403;
                res.end('Forbidden');
                return;
            }

            // Check if file exists
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                serveStaticFile(filePath, res);
                return;
            }
        }

        // Handle SvelteKit routes
        const request = new Request(url.href, {
            method: req.method,
            headers: req.headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined
        });

        const response = await server.respond(request, {
            getClientAddress: () => {
                return req.socket.remoteAddress || '127.0.0.1';
            },
            platform: {},
            prerendering: false
        });

        // Set response status and headers
        res.statusCode = response.status;
        for (const [key, value] of response.headers) {
            res.setHeader(key, value);
        }

        // Send response body
        if (response.body) {
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        }
        res.end();
    } catch (err) {
        console.error('Request error:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
    }
});

httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 SvelteKit server running at http://${HOST}:${PORT}`);
    console.log(`📁 Serving static files from: ${CLIENT_DIR}`);
});
