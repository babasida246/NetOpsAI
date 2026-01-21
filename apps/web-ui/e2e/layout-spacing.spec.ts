import { test, expect } from '@playwright/test'

const primaryPages = ['/chat', '/stats', '/models', '/tools']

test.describe('Layout spacing', () => {
  test('page shells use the available viewport', async ({ page, request }) => {
    let reachable = true
    try {
      const res = await request.get('/')
      reachable = res.ok()
    } catch {
      reachable = false
    }

    expect(reachable, 'Web UI base URL must be reachable for layout checks.').toBe(true)

    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'ui-test-token')
      localStorage.setItem('userEmail', 'ui-tester@example.com')
      localStorage.setItem('userRole', 'super_admin')
    })

    for (const path of primaryPages) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => null)
      expect(
        response?.ok(),
        `Expected ${path} to load successfully (response: ${response ? response.status() : 'offline'}).`
      ).toBe(true)
      const shell = page.locator('main .page-shell').first()
      const count = await shell.count()
      expect(count, `Expected .page-shell on ${path}.`).toBeGreaterThan(0)
      await expect(shell).toBeVisible({ timeout: 10000 })

      const metrics = await shell.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        const leftGap = rect.left
        const rightGap = window.innerWidth - rect.right
        return {
          width: rect.width,
          viewport: window.innerWidth,
          leftGap,
          rightGap
        }
      })

      expect(metrics.width).toBeGreaterThanOrEqual(metrics.viewport * 0.82)
      expect(Math.abs(metrics.leftGap - metrics.rightGap)).toBeLessThanOrEqual(32)
    }
  })
})
