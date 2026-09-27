'use strict'
const fs = require('node:fs')
const path = require('node:path')

function buildReport ({ cfg, results, findings }) {
  return {
    version: 1, tool: 'deep-link-contracts', generatedAt: new Date().toISOString(),
    summary: {
      contracts: (cfg.contracts || []).length,
      ok: (results || []).filter((r) => r.ok).length,
      broken: (findings || []).length,
      findings: (findings || []).length,
    },
    results, findings,
    meta: {
      reportEmail: 'support@devcentr.org',
      note: 'Marketing URL ↔ docs co-variance tests — NOT a general outbound link crawl.',
    },
  }
}

function writeOutputs (report, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  const lines = [
    '# Deep-link contracts', '',
    '> Marketing URL ↔ docs co-variance. **Not** a site-wide link crawl.', '',
    'Generated: ' + report.generatedAt, '',
    '```json', JSON.stringify(report.summary, null, 2), '```', '',
  ]
  for (const r of report.results || []) {
    lines.push('- ' + (r.ok ? 'OK' : 'BROKEN') + ' `' + r.id + '`: ' + r.externalUrl)
  }
  lines.push('', 'Support: support@devcentr.org', '')
  fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n'))
}
module.exports = { buildReport, writeOutputs }
