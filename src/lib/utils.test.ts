import { describe, expect, it } from 'vitest'
import { safeHttpUrl } from './utils'

describe('網址', () => {
  it('只接受 http 與 https', () => {
    expect(safeHttpUrl(' https://gtf-planet.co.jp/faq/customer/ ')).toBe('https://gtf-planet.co.jp/faq/customer/')
    expect(safeHttpUrl('http://example.com/a')).toBe('http://example.com/a')
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('不是網址')).toBeNull()
    expect(safeHttpUrl('')).toBeNull()
  })
})