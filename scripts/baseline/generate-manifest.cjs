const fs = require('fs');
const crypto = require('crypto');
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
const files = [
  'prisma/migrations/20260101000000_baseline/migration.sql',
  'backups/production-catalog.json',
  'backups/catalog-tables.json',
  'backups/roles.json',
  'backups/table-row-counts.json',
];
const manifestLines = ['# Sanitized Backup Manifest', ''];
manifestLines.push(`Generated: ${new Date().toISOString()}`);
manifestLines.push('');
for (const f of files) {
  if (fs.existsSync(f)) {
    manifestLines.push(`- ${f}: SHA256 ${sha256(f)}`);
  } else {
    manifestLines.push(`- ${f}: MISSING`);
  }
}
fs.mkdirSync('docs/baseline-repair', { recursive: true });
fs.writeFileSync('docs/baseline-repair/sanitized-manifest.md', manifestLines.join('\n'));
console.log('Sanitized manifest generated');