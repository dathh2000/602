// VietQR helper — sinh URL ảnh QR thanh toán theo chuẩn NAPAS.
// Service: https://vietqr.io (free, không cần API key).

interface VietQROpts {
  bin: string
  accountNumber: string
  amount?: number
  addInfo?: string
  accountName?: string
  template?: 'compact' | 'compact2' | 'qr_only' | 'print'
}

export function buildVietQRUrl(opts: VietQROpts): string {
  const tpl = opts.template ?? 'compact2'
  const base = `https://img.vietqr.io/image/${opts.bin}-${opts.accountNumber}-${tpl}.png`
  const params = new URLSearchParams()
  if (opts.amount && opts.amount > 0) params.set('amount', String(Math.round(opts.amount)))
  if (opts.addInfo) params.set('addInfo', opts.addInfo)
  if (opts.accountName) params.set('accountName', opts.accountName)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
