import { expect, test } from '@playwright/test'

const longOriginal = 'Quarterly-Financial-Report-Final-Really-Final-v27.pdf'
const shortOriginal = 'short.txt'
const endingOriginal = 'https://example.com/some/really/long/path/to/the/original/source/documentation/index.html'

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/truncate.html')
})

test('truncates overflowing text and keeps full text in title', async ({ page }) => {
  const long = page.locator('#long')

  await expect.poll(async () => await long.textContent()).not.toBe(longOriginal)

  const text = await long.textContent()
  await expect(text).toContain('...')
  await expect(long).toHaveAttribute('title', longOriginal)
})

test('does not truncate short text and keeps title empty', async ({ page }) => {
  const short = page.locator('#short')

  await expect(short).toHaveText(shortOriginal)
  await expect(short).not.toHaveAttribute('title', /.+/)
})

test('preserves end segment when min-end is set', async ({ page }) => {
  const ending = page.locator('#ending')

  await expect.poll(async () => await ending.textContent()).not.toBe(endingOriginal)

  const text = (await ending.textContent()) || ''
  await expect(text.endsWith('.html')).toBeTruthy()
  await expect(ending).toHaveAttribute('title', endingOriginal)
})

test('recalculates truncation when element width changes', async ({ page }) => {
  const resizable = page.locator('#resizable')
  const initial = await resizable.textContent()

  await page.evaluate(() => {
    const element = document.getElementById('resizable')
    element.style.width = '120px'
  })

  await expect.poll(async () => await resizable.textContent()).not.toBe(initial)
})

test('coalesces rapid ResizeObserver callbacks into one render per frame', async ({ page }) => {
  await page.goto('/tests/fixtures/resize_debounce.html')

  await expect.poll(async () => await page.evaluate(() => typeof window.__resizeObserver)).toBe('object')

  const before = await page.evaluate(() => window.__renderCount || 0)

  await page.evaluate(() => {
    window.__resizeObserver.trigger(8)
  })

  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())))

  const after = await page.evaluate(() => window.__renderCount || 0)
  await expect(after - before).toBe(1)
})

test('ignores fonts-ready rerender after disconnect', async ({ page }) => {
  await page.goto('/tests/fixtures/disconnect_fonts_ready.html')

  await page.evaluate(() => {
    const element = document.getElementById('subject')
    element.remove()
  })

  await page.evaluate(() => {
    window.__resolveFontsReady()
  })

  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())))

  const errors = await page.evaluate(() => window.__errors)
  await expect(errors).toEqual([])
})

test('reduces fit probes during binary search using precomputed widths', async ({ page }) => {
  await page.goto('/tests/fixtures/prepare_calls.html')

  await expect(page.locator('#subject')).toHaveAttribute('title', /.+/)

  const fitsCalls = await page.evaluate(() => window.__fitsCalls)
  await expect(fitsCalls).toBe(1)
})

test('tries one shorter arithmetic candidate before full fallback search', async ({ page }) => {
  await page.goto('/tests/fixtures/arithmetic_nudge.html')

  await expect(page.locator('#subject')).toHaveAttribute('title', /.+/)

  const fitsCalls = await page.evaluate(() => window.__fitsCalls)
  const fullFallbackCalls = await page.evaluate(() => window.__fullFallbackCalls)

  await expect(fitsCalls).toBe(2)
  await expect(fullFallbackCalls).toBe(0)
})

test('warns in dev when required truncation css is missing', async ({ page }) => {
  await page.goto('/tests/fixtures/css_validation.html')

  await expect.poll(async () => await page.evaluate(() => window.__warnings.length)).toBeGreaterThan(0)

  const warnings = await page.evaluate(() => window.__warnings)
  await expect(warnings.some(message => message.includes('[truncate-text-middle]'))).toBeTruthy()
})

test('reads computed style once within a render pass', async ({ page }) => {
  await page.goto('/tests/fixtures/computed_style_single_pass.html')

  await expect.poll(async () => await page.evaluate(() => Boolean(window.__controller))).toBeTruthy()

  await page.evaluate(() => {
    window.__computedStyleCalls = 0
    window.__controller.render()
  })

  const calls = await page.evaluate(() => window.__computedStyleCalls)
  await expect(calls).toBe(1)
})
