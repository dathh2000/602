import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!apiKey || !apiSecret || !cloudName) {
    return NextResponse.json({ error: 'Cloudinary chưa cấu hình' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 })

  const timestamp = Math.round(Date.now() / 1000)
  const folder = 'phong_tro'
  const paramStr = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto.createHash('sha1').update(paramStr + apiSecret).digest('hex')

  const uploadData = new FormData()
  uploadData.append('file', file)
  uploadData.append('api_key', apiKey)
  uploadData.append('timestamp', String(timestamp))
  uploadData.append('signature', signature)
  uploadData.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: uploadData,
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message ?? 'Upload thất bại' }, { status: res.status })
  }
  return NextResponse.json({ url: data.secure_url })
}
