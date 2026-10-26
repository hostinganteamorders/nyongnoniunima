import { NextResponse } from 'next/server'
import { submitRegistration } from '@/server/actions/applicants'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Pengiriman harus dilakukan dari website pendaftaran.' }, { status: 403 })
  }

  const contentType = request.headers.get('content-type') || ''
  if (!/^(multipart\/form-data|application\/x-www-form-urlencoded)(?:;|$)/i.test(contentType)) {
    return NextResponse.json({ error: 'Format formulir tidak valid.' }, { status: 415 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Formulir tidak dapat dibaca. Silakan coba lagi dari halaman yang sama.' }, { status: 400 })
  }

  try {
    const result = await submitRegistration(formData)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    if (!result.data?.id) throw new Error('Missing registration acknowledgement')
    return NextResponse.json({ data: { id: result.data.id } }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const reference = crypto.randomUUID()
    console.error('Registration response error', { reference, name: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({
      error: `Respons pengiriman belum dapat dikonfirmasi. Data mungkin sudah tersimpan. Silakan coba lagi dari halaman yang sama. Referensi: ${reference}`,
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
