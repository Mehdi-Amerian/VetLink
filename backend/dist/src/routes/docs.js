"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
// Paths to the OpenAPI spec and Redoc bundle
const SPEC_PATH = path_1.default.join(process.cwd(), 'openapi.yaml');
const REDOC_BUNDLE_PATH = require.resolve('redoc/bundles/redoc.standalone.js');
const router = (0, express_1.Router)();
// Middleware to generate a nonce for each request
function nonceMiddleware(_req, res, next) {
    // 16 bytes => 128-bit nonce (base64)
    res.locals.nonce = crypto_1.default.randomBytes(16).toString('base64');
    next();
}
// Content Security Policy middleware
function cspMiddleware(req, res, next) {
    const nonce = res.locals.nonce;
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
    const nonce = res.locals.nonce;
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
exports.default = router;
