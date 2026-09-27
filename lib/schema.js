'use strict'

/**
 * Config schema for deep-link contracts.
 *
 * IMPORTANT: These are NOT general outbound link crawls.
 * Each contract asserts that a marketing / product / vanity URL continues
 * to resolve to an intended docs destination (page id or published path)
 * as the site IA changes — co-variance between external entry points and docs.
 */

const SCHEMA_VERSION = 1

function validateConfig (cfg) {
  const errors = []
  if (!cfg || typeof cfg !== 'object') return ['config must be an object']
  if (cfg.version != null && Number(cfg.version) !== SCHEMA_VERSION) {
    errors.push('unsupported version ' + cfg.version + '; expected ' + SCHEMA_VERSION)
  }
  if (!Array.isArray(cfg.contracts)) {
    errors.push('contracts must be an array')
    return errors
  }
  cfg.contracts.forEach((c, i) => {
    if (!c || typeof c !== 'object') { errors.push('contracts[' + i + '] must be an object'); return }
    if (!c.id) errors.push('contracts[' + i + '].id required')
    if (!c.externalUrl) errors.push('contracts[' + i + '].externalUrl required')
    if (!c.expected || typeof c.expected !== 'object') {
      errors.push('contracts[' + i + '].expected object required')
    } else if (!c.expected.pageId && !c.expected.pubPath && !c.expected.url) {
      errors.push('contracts[' + i + '].expected needs pageId, pubPath, or url')
    }
  })
  return errors
}

function exampleConfig () {
  return {
    version: SCHEMA_VERSION,
    description: 'Marketing URL ↔ docs co-variance (NOT a site-wide link crawl)',
    baseUrl: 'https://docs.example.com',
    contracts: [{
      id: 'docs-foo-home',
      externalUrl: 'https://www.example.com/docs/foo',
      expected: { pageId: 'foo::index.adoc', pubPath: '/foo/index.html' },
      notes: 'Partner / campaign vanity path must keep landing on Foo module home',
    }],
  }
}

module.exports = { SCHEMA_VERSION, validateConfig, exampleConfig }
