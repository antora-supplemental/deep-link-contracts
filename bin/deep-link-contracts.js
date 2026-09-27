#!/usr/bin/env node
'use strict'
const path = require('node:path')
const fs = require('node:fs')
const { loadConfig, loadSiteIndex, checkContracts, buildReport, writeOutputs, exampleConfig } = require('../lib/index.js')

function parseArgs (argv) {
  const opts = { config: 'deep-link-contracts.yml', out: 'deep-link-report', fail: false, siteDir: null, siteMap: null }
  const args = argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--config') opts.config = args[++i]
    else if (a === '--out') opts.out = args[++i]
    else if (a === '--site-dir') opts.siteDir = args[++i]
    else if (a === '--site-map') opts.siteMap = args[++i]
    else if (a === '--fail') opts.fail = true
    else if (a === '--init') opts.init = true
    else if (a === '--help' || a === '-h') opts.help = true
  }
  return opts
}

function main () {
  const opts = parseArgs(process.argv)
  if (opts.help) {
    console.log('Usage: deep-link-contracts --config FILE [--site-dir DIR|--site-map JSON] [--out DIR] [--fail]\n       deep-link-contracts --init\n\nMarketing URL ↔ docs path co-variance tests.\nThis is NOT a general outbound link crawler.\nSupport: support@devcentr.org')
    process.exit(0)
  }
  if (opts.init) {
    const yaml = require('js-yaml')
    fs.writeFileSync('deep-link-contracts.yml', yaml.dump(exampleConfig()))
    console.log('Wrote deep-link-contracts.yml')
    process.exit(0)
  }
  const cfg = loadConfig(path.resolve(opts.config))
  const index = loadSiteIndex({
    siteMap: opts.siteMap && path.resolve(opts.siteMap),
    siteDir: opts.siteDir && path.resolve(opts.siteDir),
  })
  const { results, findings } = checkContracts(cfg, index)
  const report = buildReport({ cfg, results, findings })
  writeOutputs(report, path.resolve(opts.out))
  console.log('deep-link-contracts: ' + report.summary.ok + '/' + report.summary.contracts + ' ok, ' + report.summary.broken + ' broken')
  if (opts.fail && report.summary.broken > 0) process.exit(1)
}
main()
