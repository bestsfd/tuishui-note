export interface MrzFields {
  surname: string
  givenNames: string
  number: string
  nationalityCode: string
  birthDate: string
  expiryDate: string
  sex: 'M' | 'F' | 'X'
}

const WEIGHTS = [7, 3, 1] as const

const DIGIT_FIX: Record<string, string> = {
  O: '0',
  Q: '0',
  D: '0',
  I: '1',
  L: '1',
  Z: '2',
  S: '5',
  G: '6',
  B: '8',
}

const NATIONALITY: Record<string, string> = {
  TWN: '臺灣',
  JPN: '日本',
  USA: '美國',
  CHN: '中國',
  HKG: '香港',
  MAC: '澳門',
  KOR: '韓國',
  GBR: '英國',
  FRA: '法國',
  DEU: '德國',
  CAN: '加拿大',
  AUS: '澳洲',
  SGP: '新加坡',
  THA: '泰國',
  VNM: '越南',
  PHL: '菲律賓',
  MYS: '馬來西亞',
  IDN: '印尼',
}

export function mrzCharValue(char: string): number {
  if (char === '<') return 0
  if (char >= '0' && char <= '9') return char.charCodeAt(0) - 48
  if (char >= 'A' && char <= 'Z') return char.charCodeAt(0) - 55
  return -1
}

export function checkDigit(input: string): number | null {
  let sum = 0
  for (let index = 0; index < input.length; index += 1) {
    const value = mrzCharValue(input[index] ?? '')
    if (value < 0) return null
    sum += value * WEIGHTS[index % 3]
  }
  return sum % 10
}

export function nationalityLabel(code: string): string {
  return NATIONALITY[code] ?? code
}

export function sexLabel(sex: MrzFields['sex']): string {
  if (sex === 'M') return '男'
  if (sex === 'F') return '女'
  return '未標示'
}

export function maskPassportNumber(number: string, masked: boolean): string {
  if (!masked) return number
  const last = number.slice(-4)
  return `•••• ${last}`
}

function cleanName(value: string): string {
  return value.replace(/<+/g, ' ').trim().replace(/\s+/g, ' ')
}

function isoFromParts(year: number, month: string, day: string): string | null {
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return null
  const date = new Date(Date.UTC(year, monthNumber - 1, dayNumber))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthNumber - 1 || date.getUTCDate() !== dayNumber) {
    return null
  }
  return `${year.toString().padStart(4, '0')}-${month}-${day}`
}

function parseMrzDate(value: string, kind: 'birth' | 'expiry', today = new Date()): string | null {
  if (!/^\d{6}$/.test(value)) return null
  const yy = Number(value.slice(0, 2))
  const month = value.slice(2, 4)
  const day = value.slice(4, 6)
  let year = 2000 + yy
  if (kind === 'birth') {
    const currentYear = today.getUTCFullYear()
    if (year > currentYear) year -= 100
    const candidate = isoFromParts(year, month, day)
    if (!candidate) return null
    if (candidate > today.toISOString().slice(0, 10)) {
      return isoFromParts(year - 100, month, day)
    }
    return candidate
  }
  return isoFromParts(year, month, day)
}

function fitLine(line: string): string | null {
  const cleaned = line.toUpperCase().replace(/[^A-Z0-9<]/g, '')
  if (cleaned.length === 44) return cleaned
  if (cleaned.length > 44 && cleaned.length <= 46 && /^P</.test(cleaned)) {
    return cleaned.slice(0, 44)
  }
  if (cleaned.length >= 40 && cleaned.length < 44) return cleaned.padEnd(44, '<')
  return null
}

function digitFix(line: string, positions: number[]): string {
  const chars = line.split('')
  for (const position of positions) {
    const char = chars[position]
    if (char && DIGIT_FIX[char]) chars[position] = DIGIT_FIX[char]
  }
  return chars.join('')
}

function line2Variants(line: string): string[] {
  const dateAndChecks = [9, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 42, 43]
  const withDates = digitFix(line, dateAndChecks)
  const withNumber = digitFix(withDates, [0, 1, 2, 3, 4, 5, 6, 7, 8])
  return [...new Set([line, withDates, withNumber])]
}

function parsePair(line1Raw: string, line2Raw: string, today?: Date): MrzFields | null {
  const line1 = fitLine(line1Raw)
  if (!line1?.startsWith('P<')) return null
  const baseLine2 = fitLine(line2Raw)
  if (!baseLine2) return null

  for (const line2 of line2Variants(baseLine2)) {
    const number = line2.slice(0, 9).replace(/<+$/g, '')
    const numberCheck = Number(line2[9])
    const nationalityCode = line2.slice(10, 13).replace(/</g, '')
    const birthRaw = line2.slice(13, 19)
    const birthCheck = Number(line2[19])
    const sexRaw = line2[20]
    const expiryRaw = line2.slice(21, 27)
    const expiryCheck = Number(line2[27])
    const optional = line2.slice(28, 42)
    const optionalCheck = Number(line2[42])
    const composite = Number(line2[43])

    if (
      checkDigit(line2.slice(0, 9)) !== numberCheck ||
      checkDigit(birthRaw) !== birthCheck ||
      checkDigit(expiryRaw) !== expiryCheck ||
      checkDigit(optional) !== optionalCheck
    ) {
      continue
    }
    const compositeSource = `${line2.slice(0, 10)}${line2.slice(13, 20)}${line2.slice(21, 43)}`
    if (checkDigit(compositeSource) !== composite) continue

    const birthDate = parseMrzDate(birthRaw, 'birth', today)
    const expiryDate = parseMrzDate(expiryRaw, 'expiry', today)
    if (!birthDate || !expiryDate || !number || nationalityCode.length !== 3) continue
    if (sexRaw !== 'M' && sexRaw !== 'F' && sexRaw !== '<') continue

    const nameBody = line1.slice(5)
    const [surnameRaw, givenRaw = ''] = nameBody.split('<<')
    return {
      surname: cleanName(surnameRaw ?? ''),
      givenNames: cleanName(givenRaw),
      number,
      nationalityCode,
      birthDate,
      expiryDate,
      sex: sexRaw === '<' ? 'X' : sexRaw,
    }
  }
  return null
}

export function parseMrz(line1: string, line2: string, today?: Date): MrzFields | null {
  return parsePair(line1, line2, today)
}

export function parseMrzText(text: string, today?: Date): MrzFields | null {
  const upper = text.toUpperCase().replace(/\r/g, '')
  const rough = upper.split('\n').map((line) => line.replace(/ /g, ''))
  const cleaned = rough
    .map((line) => line.replace(/[^A-Z0-9<]/g, ''))
    .filter((line) => line.length >= 30)

  for (let index = 0; index < cleaned.length; index += 1) {
    const line = cleaned[index] ?? ''
    if (line.includes('P<') && line.length >= 80) {
      const start = line.indexOf('P<')
      const merged = line.slice(start)
      const parsed = parsePair(merged.slice(0, 44), merged.slice(44, 88), today)
      if (parsed) return parsed
    }
    if (!line.startsWith('P<')) continue
    const next = cleaned[index + 1]
    if (!next) continue
    const parsed = parsePair(line, next, today)
    if (parsed) return parsed
  }
  return null
}

export function buildTd3(input: {
  surname: string
  givenNames: string
  number: string
  nationalityCode?: string
  birthDate: string
  expiryDate: string
  sex: 'M' | 'F' | 'X'
}): { line1: string; line2: string } {
  const surname = input.surname.toUpperCase().replace(/ /g, '<')
  const given = input.givenNames.toUpperCase().replace(/ /g, '<')
  const line1 = `P<TWN${surname}<<${given}`.padEnd(44, '<').slice(0, 44)
  const number = input.number.toUpperCase().padEnd(9, '<').slice(0, 9)
  const nationality = (input.nationalityCode ?? 'TWN').toUpperCase().padEnd(3, '<').slice(0, 3)
  const birth = toMrzDate(input.birthDate)
  const expiry = toMrzDate(input.expiryDate)
  const sex = input.sex === 'X' ? '<' : input.sex
  const optional = '<'.repeat(14)
  const numberCheck = String(checkDigit(number))
  const birthCheck = String(checkDigit(birth))
  const expiryCheck = String(checkDigit(expiry))
  const optionalCheck = String(checkDigit(optional))
  const head = `${number}${numberCheck}${nationality}${birth}${birthCheck}${sex}${expiry}${expiryCheck}${optional}${optionalCheck}`
  const compositeSource = `${number}${numberCheck}${birth}${birthCheck}${expiry}${expiryCheck}${optional}${optionalCheck}`
  const line2 = `${head}${checkDigit(compositeSource)}`
  return { line1, line2 }
}

function toMrzDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${(year ?? '').slice(-2)}${month}${day}`
}
