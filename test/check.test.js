'use strict'
const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {
  validateConfig, exampleConfig, loadConfig, loadSiteIndex, checkContracts, buildReport,
} = require('../lib/index.js')

describe('deep-link-contracts', () => {
  it('validates example config', () => {
    assert.deepEqual(validateConfig(exampleConfig()), [])
    assert.ok(validateConfig({ contracts: [{ id: 'x' }] }).length > 0)
  })

  let tmp
  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dlc-'))
    fs.mkdirSync(path.join(tmp, 'site', 'foo'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'site', 'foo', 'index.html'), '<html></html>')
    fs.writeFileSync(path.join(tmp, 'site-map.json'), JSON.stringify({
      pages: [{ pageId: 'foo::index.adoc', url: '/foo/index.html' }],
    }))
    const yaml = require('js-yaml')
    fs.writeFileSync(path.join(tmp, 'contracts.yml'), yaml.dump({
      version: 1,
      contracts: [
        { id: 'ok', externalUrl: 'https://www.example.com/docs/foo', expected: { pubPath: '/foo/index.html', pageId: 'foo::index.adoc' } },
        { id: 'broken', externalUrl: 'https://www.example.com/docs/bar', expected: { pubPath: '/bar/index.html' } },
      ],
    }))
  })
  after(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('checks co-variance against site map / site dir', () => {
    const cfg = loadConfig(path.join(tmp, 'contracts.yml'))
    const index = loadSiteIndex({ siteMap: path.join(tmp, 'site-map.json'), siteDir: path.join(tmp, 'site') })
    const { results, findings } = checkContracts(cfg, index)
    assert.equal(results.find((r) => r.id === 'ok').ok, true)
    assert.equal(results.find((r) => r.id === 'broken').ok, false)
    assert.equal(findings.length, 1)
    assert.match(buildReport({ cfg, results, findings }).meta.note, /NOT a general/)
  })
})
