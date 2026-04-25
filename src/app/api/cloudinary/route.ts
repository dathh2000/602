import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  if (!process.env.CLOUDINARY_API_KEY) {
    return NextResponse.json({ error: 'Cloudinary chưa cấu hình' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'phong_tro', resource_type: 'image' },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('Upload thất bại'))
          else resolve(result as { secure_url: string })
        }
      ).end(buffer)
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload thất bại'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
