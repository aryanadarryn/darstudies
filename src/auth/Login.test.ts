import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Login from './Login'

describe('Login', () => {
  it('offers email + password sign-up for a new device, with no email link', () => {
    const html = renderToString(createElement(Login))
    expect(html).toContain('type="password"')
    expect(html).toContain('autoComplete="new-password"')
    expect(html).toContain('Create account')
    expect(html).not.toMatch(/sign-in link/i)
  })
})
