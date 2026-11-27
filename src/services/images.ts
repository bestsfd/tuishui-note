async function drawToBlob(draw: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  draw(canvas, ctx)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob) throw new Error('blob')
  return blob
}

export async function shrinkImage(file: Blob, maxWidth = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const blob = await drawToBlob((canvas, ctx) => {
    canvas.width = width
    canvas.height = height
    ctx.drawImage(bitmap, 0, 0, width, height)
  })
  bitmap.close()
  return blob
}

export async function passportStrip(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const cropHeight = Math.round(bitmap.height * 0.42)
  const sourceY = bitmap.height - cropHeight
  const scale = Math.min(2.2, 1400 / bitmap.width)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(cropHeight * scale))
  const blob = await drawToBlob((canvas, ctx) => {
    canvas.width = width
    canvas.height = height
    ctx.filter = 'contrast(1.35) grayscale(1)'
    ctx.drawImage(bitmap, 0, sourceY, bitmap.width, cropHeight, 0, 0, width, height)
  })
  bitmap.close()
  return blob
}
