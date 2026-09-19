#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const root = new URL('../', import.meta.url)
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
const base = process.env.DESKTOP_URL || 'http://localhost:5833/'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

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
  await footer.waitFor()
  assert.equal(await footer.innerText(), `Allegretto ${pkg.version}`)
  assert.equal(await footer.getAttribute('title'), `Allegretto ${pkg.version} · Radiant engine ${pkg.radiantEngineVersion} · connected server 0.9.24`)
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Settings')?.click())
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'About')?.click())
  const aboutVersion = page.locator('.about-ver')
  await aboutVersion.waitFor()
  assert.equal(await aboutVersion.innerText(), `Version ${pkg.version}`)
  console.log(`version footer passed · ${await footer.innerText()} · engine ${pkg.radiantEngineVersion}`)
} finally {
  await browser.close()
}
