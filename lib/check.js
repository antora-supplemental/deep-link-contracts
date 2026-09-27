'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { validateConfig } = require('./schema.js')

let yaml
try { yaml = require('js-yaml') } catch (_) { yaml = null }

function loadConfig (file) {
  const text = fs.readFileSync(file, 'utf8')
  let cfg
  if (/\.json$/i.test(file)) cfg = JSON.parse(text)
  else {
    if (!yaml) throw new Error('js-yaml required for YAML configs')
    cfg = yaml.load(text)
  }
  const errors = validateConfig(cfg)
  if (errors.length) {
    const err = new Error('Invalid deep-link-contracts config:\n  - ' + errors.join('\n  - '))
    err.validationErrors = errors
    throw err
  }
  return cfg
}

function loadSiteIndex ({ siteMap, siteDir } = {}) {
  const byPath = new Map()
  const byPageId = new Map()
  if (siteMap && fs.existsSync(siteMap)) {
    const data = JSON.parse(fs.readFileSync(siteMap, 'utf8'))
    const pages = data.pages || data || []
    for (const p of pages) {
      const url = p.url || p.puburl || p.pubPath || p.path
      const pageId = p.pageId || p.srcpath || p.srcPath || p.id
      if (url) byPath.set(normalizePath(url), p)
      if (pageId) byPageId.set(String(pageId), p)
    }
  }
  if (siteDir && fs.existsSync(siteDir)) {
    walkHtml(siteDir, (file) => {
      const rel = path.relative(siteDir, file).split(path.sep).join('/')
      const url = '/' + rel.replace(/\\/g, '/')
      byPath.set(normalizePath(url), { url, file: rel })
    })
  }
  return { byPath, byPageId }
}

function walkHtml (root, cb) {
  if (!fs.existsSync(root)) return
  const st = fs.statSync(root)
  if (st.isFile()) { if (root.endsWith('.html')) cb(root); return }
  for (const name of fs.readdirSync(root)) {
    if (name === 'node_modules' || name === '.git') continue
    walkHtml(path.join(root, name), cb)
  }
}

function normalizePath (p) {
  let s = String(p).trim()
  try { if (/^https?:/i.test(s)) s = new URL(s).pathname } catch (_) {}
  if (!s.startsWith('/')) s = '/' + s
  if (s.endsWith('/') && s.length > 1) s = s.slice(0, -1)
  return s
}

function pathMatches (expected, index) {
  if (expected.url) {
    const pathOnly = normalizePath(expected.url)
    return index.byPath.has(pathOnly) || index.byPath.has(pathOnly + '/index.html')
  }
  if (expected.pubPath) {
    const p = normalizePath(expected.pubPath)
    if (index.byPath.has(p)) return true
    if (index.byPath.has(p + '/index.html')) return true
    if (p.endsWith('/index.html') && index.byPath.has(p.replace(/\/index\.html$/, ''))) return true
    return false
  }
  if (expected.pageId) return index.byPageId.has(expected.pageId)
  return false
}

/** Run contracts against a site index. Does NOT crawl arbitrary outbound links. */
function checkContracts (cfg, index, opts = {}) {
  const findings = []
  const results = []
  const onProgress = opts.onProgress
  let i = 0
  const total = (cfg.contracts || []).length
  for (const c of cfg.contracts) {
    i += 1
    if (typeof onProgress === 'function') onProgress(i, total)
    const okExpected = pathMatches(c.expected, index)
    const result = {
      id: c.id, externalUrl: c.externalUrl, expected: c.expected,
      ok: okExpected, classification: okExpected ? 'ok' : 'broken-contract',
    }
    results.push(result)
    if (!okExpected) {
      findings.push({
        target: c.externalUrl, classification: 'broken-contract', kind: 'broken-contract',
        sources: [c.id], expected: c.expected,
      })
    }
  }
  return { results, findings }
}

module.exports = { loadConfig, loadSiteIndex, checkContracts, normalizePath, pathMatches }
