import { parseMrzText, type MrzFields } from '../lib/mrz'
import { parseReceiptText, type ParsedReceipt } from '../lib/receipt'
import type { Settings } from '../lib/types'
import { passportStrip, shrinkImage } from './images'
import { recognizeWithVision } from './vision'
import Tesseract from 'tesseract.js'

export type ProgressNote = (message: string) => void

function statusLabel(status: string, progress: number): string {
  const percent = Math.round(progress * 100)
  if (status.includes('language')) return `正在載入辨識語料 ${percent}%`
  if (status.includes('recogniz')) return `正在讀取文字 ${percent}%`
  return `正在準備辨識 ${percent}%`
}

async function readImage(
  image: Blob,
  lang: string,
  note: ProgressNote,
  whitelist?: string,
): Promise<{ text: string; confidence: number }> {
  const worker = await Tesseract.createWorker(lang, 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/tesseract-core-simd-lstm.wasm.js',
    langPath: '/tessdata',
    gzip: false,
    workerBlobURL: false,
    logger: (message) => note(statusLabel(message.status, message.progress)),
  })
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: whitelist ? Tesseract.PSM.SINGLE_BLOCK : Tesseract.PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1',
      ...(whitelist ? { tessedit_char_whitelist: whitelist } : {}),
    })
    const result = await worker.recognize(image)
    return { text: result.data.text ?? '', confidence: result.data.confidence ?? 0 }
  } finally {
    await worker.terminate()
  }
}

function cjkCount(text: string): number {
  return (text.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) ?? []).length
}

export async function recognizeReceiptImage(
  file: Blob,
  settings: Settings,
  note: ProgressNote,
): Promise<ParsedReceipt> {
  const image = await shrinkImage(file).catch(() => file)
  if (settings.visionEnabled && settings.visionApiKey.trim()) {
    note('正在用你設定的辨識服務')
    try {
      const parsed = await recognizeWithVision(image, settings)
      if (parsed && (parsed.lines.length > 0 || parsed.storeName || parsed.date)) return parsed
    } catch {
      note('辨識服務沒有成功，改在手機上讀取')
    }
  }
  const horizontal = await readImage(image, 'jpn', note)
  let text = horizontal.text
  let weak = horizontal.confidence < 55 || cjkCount(text) < 8
  if (weak) {
    note('橫排讀得很少，改讀直排')
    const vertical = await readImage(image, 'jpn_vert', note)
    if (cjkCount(vertical.text) > cjkCount(text)) text = vertical.text
  }
  const parsed = parseReceiptText(text)
  if (!text.trim()) parsed.warnings.unshift('沒有讀到文字，請重拍或改手動填')
  return parsed
}

export async function recognizePassportImage(file: Blob, note: ProgressNote): Promise<MrzFields | null> {
  const whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'
  note('正在讀取護照底部')
  const strip = await passportStrip(file).catch(() => file)
  const first = await readImage(strip, 'eng', note, whitelist)
  const parsed = parseMrzText(first.text)
  if (parsed) return parsed
  note('改看整頁再讀一次')
  const shrunk = await shrinkImage(file, 1800).catch(() => file)
  const second = await readImage(shrunk, 'eng', note, whitelist)
  return parseMrzText(`${first.text}\n${second.text}`)
}
