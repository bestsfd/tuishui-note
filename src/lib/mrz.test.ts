import { describe, expect, it } from 'vitest'
import {
  buildTd3,
  checkDigit,
  maskPassportNumber,
  nationalityLabel,
  parseMrz,
  parseMrzText,
  sexLabel,
} from './mrz'

const TODAY = new Date('2026-11-27T00:00:00Z')

describe('護照機讀區', () => {
  it('校驗碼與手算範例一致', () => {
    expect(checkDigit('300123456')).toBe(6)
    expect(checkDigit('900515')).toBe(6)
    expect(checkDigit('281130')).toBe(5)
  })

  it('解析兩行機讀區的姓名、號碼、國籍、生日與效期', () => {
    const mrz = buildTd3({
      surname: 'WANG',
      givenNames: 'MEI LING',
      number: '300123456',
      birthDate: '1990-05-15',
      expiryDate: '2028-11-30',
      sex: 'F',
    })
    expect(mrz.line1).toHaveLength(44)
    expect(mrz.line2).toHaveLength(44)
    expect(mrz.line2.slice(0, 10)).toBe('3001234566')

    const parsed = parseMrz(mrz.line1, mrz.line2, TODAY)
    expect(parsed).toEqual({
      surname: 'WANG',
      givenNames: 'MEI LING',
      number: '300123456',
      nationalityCode: 'TWN',
      birthDate: '1990-05-15',
      expiryDate: '2028-11-30',
      sex: 'F',
    })
    expect(nationalityLabel('TWN')).toBe('臺灣')
    expect(sexLabel('F')).toBe('女')
    expect(maskPassportNumber('300123456', true)).toBe('•••• 3456')
    expect(maskPassportNumber('300123456', false)).toBe('300123456')
  })

  it('可從夾雜雜訊的文字找出機讀區，並修正數字位的字母誤認', () => {
    const mrz = buildTd3({
      surname: 'CHEN',
      givenNames: 'AN NA',
      number: 'AB1234567',
      birthDate: '2001-01-09',
      expiryDate: '2031-12-01',
      sex: 'M',
    })
    const brokenBirth = `${mrz.line2.slice(0, 13)}O${mrz.line2.slice(14)}`
    expect(brokenBirth).not.toBe(mrz.line2)
    const text = `REPUBLIC OF SOMETHING\n${mrz.line1}\n${brokenBirth}\n<<<`
    const parsed = parseMrzText(text, TODAY)
    expect(parsed?.surname).toBe('CHEN')
    expect(parsed?.givenNames).toBe('AN NA')
    expect(parsed?.number).toBe('AB1234567')
    expect(parsed?.birthDate).toBe('2001-01-09')
    expect(parsed?.sex).toBe('M')
  })

  it('校驗失敗時不回傳資料', () => {
    const mrz = buildTd3({
      surname: 'LIN',
      givenNames: 'BO',
      number: '300123456',
      birthDate: '1988-03-03',
      expiryDate: '2027-04-04',
      sex: 'M',
    })
    const tampered = `4${mrz.line2.slice(1)}`
    expect(parseMrz(mrz.line1, tampered, TODAY)).toBeNull()
    expect(parseMrzText('只有一行沒有機讀區', TODAY)).toBeNull()
  })

  it('兩行被黏成一行時仍可拆開', () => {
    const mrz = buildTd3({
      surname: 'HUANG',
      givenNames: 'YI',
      number: '111222333',
      birthDate: '1995-07-21',
      expiryDate: '2029-09-09',
      sex: 'X',
    })
    const parsed = parseMrzText(`xx${mrz.line1}${mrz.line2}yy`, TODAY)
    expect(parsed?.number).toBe('111222333')
    expect(parsed?.sex).toBe('X')
    expect(sexLabel('X')).toBe('未標示')
  })
})
