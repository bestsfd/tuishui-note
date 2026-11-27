import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RULE_SECTIONS, RULES_VERIFIED_ON } from '../content/rules'

const BANNED = '税购护证设记发开额计单显隐码号场检复还汇预这过对为会说让进边车东经长买卖银电无从业产应关问实办结网页签书门题验脑认国与后体条备华万历时间现总类种样据录处将来个们该请谢欢视频联统络软质识摄图档删贴导红绿黄蓝颜选择项内规离线点击载数户机确费别则门万'

function walk(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, found)
    else if (/\.(tsx|ts)$/.test(name)) found.push(path)
  }
  return found
}

const SKIP = ['receipt.ts', 'receipt.test.ts', 'mrz.ts', 'jp-terms.ts', 'vision.ts', 'ocr.ts', 'script-guard.test.ts']

describe('介面用字', () => {
  it('畫面與規則內文不用簡體字', () => {
    const files = walk('src').filter((path) => !SKIP.some((name) => path.endsWith(name)))
    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const char of BANNED) {
        if (text.includes(char)) hits.push(`${file} 含有 ${char}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('規則頁與核對日期一致', () => {
    const joined = RULE_SECTIONS.map((section) => `${section.title}${section.paragraphs.join('')}${(section.bullets ?? []).join('')}`).join('')
    expect(RULES_VERIFIED_ON).toBe('2026-11-27')
    expect(joined).toContain('5,000')
    expect(joined).toContain('1月30日')
    expect(joined).toContain('50 萬')
    expect(joined).toContain('政府不')
    const markdown = readFileSync('RULES.md', 'utf8')
    expect(markdown).toContain('2026年11月27日')
    expect(markdown).toContain('5,000')
    expect(markdown).toContain('1月30日')
    expect(markdown).toContain('50 萬')
  })
})
