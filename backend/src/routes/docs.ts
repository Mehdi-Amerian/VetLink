import express, { Router } from 'express';
import path from 'path';
import crypto from 'crypto';

// Paths to the OpenAPI spec and Redoc bundle
const SPEC_PATH = path.join(process.cwd(), 'openapi.yaml');
const REDOC_BUNDLE_PATH = require.resolve('redoc/bundles/redoc.standalone.js');

const router = Router();

// Middleware to generate a nonce for each request
function nonceMiddleware(_req: express.Request, res: express.Response, next: express.NextFunction) {
  // 16 bytes => 128-bit nonce (base64)
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
}

// Content Security Policy middleware
function cspMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const nonce: string = res.locals.nonce;
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' https: data:`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `frame-ancestors 'self'`,
    // Some Redoc environments may use workers; allow blob: workers safely
    `worker-src 'self' blob:`,
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
}

// Serve the spec (single file)
router.get('/openapi.yaml', (_req, res) => res.sendFile(SPEC_PATH));

// Serve the Redoc bundle (single file)
router.get('/redoc.standalone.js', (_req, res) => res.sendFile(REDOC_BUNDLE_PATH));

// Docs page: nonce + CSP applied only to this route
router.get('/docs', nonceMiddleware, cspMiddleware, (_req, res) => {
  const nonce = res.locals.nonce as string;
  res.type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>VetLink API</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
  </head>
  <body>
    <div id="redoc"></div>
    <script src="/redoc.standalone.js"></script>
    <script nonce="${nonce}">
      document.addEventListener('DOMContentLoaded', function () {
        Redoc.init('/openapi.yaml', {}, document.getElementById('redoc'));
      });
    </script>
  </body>
</html>`);
});

export default router;
