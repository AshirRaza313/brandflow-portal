// scripts/baseline/capture-production-catalog.cjs
// Production catalog capture - thin wrapper around shared capture engine.
// Validates PRODUCTION_DATABASE_URL via safety-guard.cjs, then delegates
// to capture-full-catalog.cjs (CI-tested, sequential queries, full provenance).

const path = require('path');
const { execFileSync } = require('child_process');
const fs = require('fs');

// Use shared safety guard for production URL validation
const { validateProductionUrl } = require('./safety-guard.cjs');

var parsed = validateProductionUrl('PRODUCTION_DATABASE_URL');

console.log('=== Production Catalog Capture ===');
console.log('Target host:', parsed.host);
console.log('Target port:', parsed.port);
console.log('Target dbname:', parsed.dbname);

// Delegate to shared capture engine
var captureScript = path.resolve(__dirname, 'capture-full-catalog.cjs');
var outputPath = 'backups/production-full-catalog.json';

// Pass production project ref so provenance records Supabase identity, not package name
var env = Object.assign({}, process.env, {
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF || 'wqwsagnxkamblnefhpzx'
});

try {
  execFileSync('node', [captureScript, process.env.PRODUCTION_DATABASE_URL, outputPath], {
    env: env,
    stdio: 'inherit'
  });
} catch (e) {
  console.error('Production catalog capture failed');
  process.exit(1);
}

if (!fs.existsSync(outputPath)) {
  console.error('FATAL: Production catalog file not created at ' + outputPath);
  process.exit(1);
}

console.log('Production catalog capture complete: ' + outputPath);
