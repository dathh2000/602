import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST() {
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const apiKey = process.env.CLOUDINARY_API_KEY
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!apiSecret || !apiKey || !cloudName) {
    return NextResponse.json({ error: 'Cloudinary chưa cấu hình' }, { status: 500 })
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = 'phong_tro'

  const paramStr = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto
    .createHash('sha1')
    .update(paramStr + apiSecret)
    .digest('hex')

  return NextResponse.json({ signature, timestamp, apiKey, cloudName, folder })
}
