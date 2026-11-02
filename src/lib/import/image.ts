export interface ImageInput {
  id: string
  /** Object URL for the thumbnail; revoke it when the image is removed. */
  preview: string
  mediaType: 'image/jpeg'
  /** Base64 without the data: prefix. */
  data: string
}

const MAX_SIDE = 2000

/** Downscales an image so its long side is at most 2000px and re-encodes it as JPEG, which keeps uploads small. */
export async function readImage(file: Blob): Promise<ImageInput> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')!
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((out) => (out ? resolve(out) : reject(new Error('encode'))), 'image/jpeg', 0.88))
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  return { id: crypto.randomUUID(), preview: URL.createObjectURL(blob), mediaType: 'image/jpeg', data }
}
