import { PaddleOCR } from '@paddleocr/paddleocr-js'

export type OcrRunner = Awaited<ReturnType<typeof PaddleOCR.create>>

let ocrPromise: Promise<OcrRunner> | undefined

export function getOcr(): Promise<OcrRunner> {
  if (!ocrPromise) {
    ocrPromise = PaddleOCR.create({
      worker: true,
      lang: 'ch',
      ocrVersion: 'PP-OCRv5',
      ortOptions: {
        backend: 'wasm'
      }
    }).catch((error) => {
      ocrPromise = undefined
      throw error
    })
  }
  return ocrPromise
}

export async function disposeOcr(): Promise<void> {
  const pending = ocrPromise
  ocrPromise = undefined
  if (!pending) return

  const settled = await pending.then(
    (ocr) => ({ ok: true, ocr } as const),
    () => ({ ok: false } as const)
  )
  if (settled.ok) {
    settled.ocr.dispose()
  }
}
