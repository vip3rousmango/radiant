#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const root = new URL('../', import.meta.url)
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
const base = process.env.DESKTOP_URL || 'http://localhost:5833/'
const remoteServer = process.env.REMOTE_SERVER_URL || 'http://localhost:5964'
const remoteHost = new URL(remoteServer).host
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript(() => localStorage.setItem('radiant.sidebarWidth', '190'))

try {
  await page.route('**/api/version', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: '0.9.24',
      product: 'Allegretto',
      engine: { name: 'Radiant', version: '0.9.24' }
    })
  }))
  await page.goto(base, { waitUntil: 'networkidle' })
  const footer = page.locator('.sidebar-version')
  assert.equal(await footer.innerText(), `Allegretto ${pkg.version}`)
  assert.equal(await footer.getAttribute('title'), `Allegretto ${pkg.version} · Radiant engine ${pkg.radiantEngineVersion} · server 0.9.24`)
  await footer.hover()
  const localTip = await footer.evaluate(el => {
    const after = getComputedStyle(el, '::after')
    return { content: after.content, visibility: after.visibility, overflow: getComputedStyle(el).overflow }
  })
  assert.match(localTip.content, /Radiant engine/)
  assert.equal(localTip.visibility, 'visible')
  await page.evaluate(remote => localStorage.setItem('radiant.server', JSON.stringify({ base: remote })), remoteServer)
  await page.reload({ waitUntil: 'networkidle' })
  const remoteFooter = page.locator('.sidebar-version')
  await remoteFooter.waitFor()
  assert.equal(await remoteFooter.innerText(), `Allegretto ${pkg.version} · connected to ${remoteHost}`)
  const remoteTitle = `${'Allegretto'} ${pkg.version} · connected to ${remoteHost} · server 0.9.24 · Radiant engine ${pkg.radiantEngineVersion}`
  assert.equal(await remoteFooter.getAttribute('title'), remoteTitle)
  assert.equal(await remoteFooter.getAttribute('aria-label'), remoteTitle)
  await remoteFooter.hover()
  const remoteTip = await remoteFooter.evaluate(el => {
    const after = getComputedStyle(el, '::after')
    const inner = el.querySelector('.sidebar-version-text')
    return {
      content: after.content,
      visibility: after.visibility,
      overflow: getComputedStyle(el).overflow,
      innerOverflow: getComputedStyle(inner).overflow,
      innerWidth: inner.clientWidth,
      innerScrollWidth: inner.scrollWidth
    }
  })
  await remoteFooter.focus()
  const focusContent = await remoteFooter.evaluate(el => getComputedStyle(el, '::after').content)
  assert.match(focusContent, /Radiant engine/)
  assert.match(remoteTip.content, /Radiant engine/)
  assert.equal(remoteTip.visibility, 'visible')
  assert.equal(remoteTip.overflow, 'visible')
  assert.equal(remoteTip.innerOverflow, 'hidden')
  assert.ok(remoteTip.innerScrollWidth >= remoteTip.innerWidth)
  await page.getByRole('button', { name: 'Settings', exact: true }).click({ force: true })
  await page.getByRole('button', { name: 'About', exact: true }).click({ force: true })
  const aboutVersion = page.locator('.about-ver')
  await aboutVersion.waitFor()
  assert.equal(await aboutVersion.innerText(), `Version ${pkg.version}`)
  console.log(`version footer passed · ${await footer.innerText()} · engine ${pkg.radiantEngineVersion}`)
} finally {
  await browser.close()
}
