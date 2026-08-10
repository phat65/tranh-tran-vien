import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Missing image file" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { message: "Only JPG, PNG, and WebP images are supported" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "Image must be 8 MB or smaller" },
        { status: 400 }
      )
    }

    const uploadDir = path.join(process.cwd(), "public", "custom-wall-uploads")
    await mkdir(uploadDir, { recursive: true })

    const extension = getExtension(file)
    const filename = `${Date.now()}-${randomUUID()}${extension}`
    const filePath = path.join(uploadDir, filename)
    const bytes = await file.arrayBuffer()

    await writeFile(filePath, new Uint8Array(bytes))

    return NextResponse.json({
      url: `/custom-wall-uploads/${filename}`,
      filename: file.name,
      mime_type: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error("[custom-wall-upload]", error)

    return NextResponse.json(
      { message: "Could not upload custom image" },
      { status: 500 }
    )
  }
}

function getExtension(file: File) {
  const filename = file.name.toLowerCase()
  const extension = path.extname(filename)

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return extension
  }

  if (file.type === "image/png") {
    return ".png"
  }

  if (file.type === "image/webp") {
    return ".webp"
  }

  return ".jpg"
}
