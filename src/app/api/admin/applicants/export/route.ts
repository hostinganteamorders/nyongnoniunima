import { getApplicantExportRows } from '@/server/applicant-export'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const scope = params.get('scope') || 'all'
  const search = params.get('q') || ''
  if (!['all', 'search'].includes(scope) || (scope === 'search' && search.length > 200)) {
    return Response.json({ error: 'Pilihan ekspor atau pencarian tidak valid.' }, { status: 400, headers: privateHeaders })
  }

  try {
    const rows = await getApplicantExportRows(scope === 'search' ? search : undefined)
    const { createApplicantWorkbook } = await import('@/server/applicant-workbook')
    const buffer = await createApplicantWorkbook(rows)
    const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(new Date())
    return new Response(new Uint8Array(buffer), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pendaftar-unima-${date}.xlsx"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return Response.json({ error: message === 'Unauthorized' ? 'Silakan login sebagai admin untuk mengekspor pendaftar.' : 'Hanya admin yang dapat mengekspor pendaftar.' }, {
        status: message === 'Unauthorized' ? 401 : 403, headers: privateHeaders,
      })
    }
    const reference = crypto.randomUUID()
    console.error('Applicant export error', { reference, name: error instanceof Error ? error.name : 'UnknownError' })
    return Response.json({ error: `Ekspor Excel gagal. Silakan coba lagi. Referensi: ${reference}` }, { status: 500, headers: privateHeaders })
  }
}
