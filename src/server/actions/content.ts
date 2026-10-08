'use server'

import { requireAdmin, getAdminClient } from '@/lib/supabase/admin'
import { newsSchema, eventSchema, gallerySchema } from '@/lib/validations/registration'
import { revalidatePath } from 'next/cache'
import { isUsingLocalDb, localInsert, localQuery, localDelete } from '@/lib/db/local'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export async function createNews(formData: FormData) {
  const { user } = await requireAdmin()
  const raw = Object.fromEntries(formData.entries())
  const parsed = newsSchema.safeParse({ ...raw, published: raw.published === 'true' })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const messages = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
    return { error: messages.join('; ') }
  }

  if (isUsingLocalDb()) {
    const data = localInsert('news', { ...parsed.data, author_id: user.id, id: crypto.randomUUID() })
    revalidatePath('/admin/news')
    return { data }
  }

  const supabase = await (await import('@/lib/supabase/server')).createServerSupabaseClient()
  const { data, error } = await supabase
    .from('news')
    .insert({ ...parsed.data, author_id: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/news')
  return { data }
}

export async function getNews() {
  await requireAdmin()

  if (isUsingLocalDb()) {
    return localQuery('news', { orderBy: { column: 'created_at', direction: 'DESC' } })
  }

  const supabase = await (await import('@/lib/supabase/server')).createServerSupabaseClient()
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function deleteNews(id: string) {
  await requireAdmin()

  if (isUsingLocalDb()) {
    localDelete('news', id)
    revalidatePath('/admin/news')
    return
  }

  const adminClient = getAdminClient()
  const { error } = await adminClient.from('news').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/news')
}

export async function createEvent(formData: FormData) {
  await requireAdmin()
  const raw = Object.fromEntries(formData.entries())
  const parsed = eventSchema.safeParse({ ...raw, published: raw.published === 'true' })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const messages = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
    return { error: messages.join('; ') }
  }

  if (isUsingLocalDb()) {
    const data = localInsert('events', { ...parsed.data, id: crypto.randomUUID() })
    revalidatePath('/admin/events')
    return { data }
  }

  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('events')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/events')
  return { data }
}

export async function getEvents() {
  await requireAdmin()

  if (isUsingLocalDb()) {
    return localQuery('events', { orderBy: { column: 'date', direction: 'DESC' } })
  }

  const supabase = await (await import('@/lib/supabase/server')).createServerSupabaseClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function deleteEvent(id: string) {
  await requireAdmin()

  if (isUsingLocalDb()) {
    localDelete('events', id)
    revalidatePath('/admin/events')
    return
  }

  const adminClient = getAdminClient()
  const { error } = await adminClient.from('events').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/events')
}

export async function createGalleryItem(formData: FormData) {
  await requireAdmin()
  const raw = Object.fromEntries(formData.entries())
  const parsed = gallerySchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const messages = Object.entries(fieldErrors).map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
    return { error: messages.join('; ') }
  }

  if (isUsingLocalDb()) {
    const data = localInsert('gallery', { ...parsed.data, id: crypto.randomUUID() })
    revalidatePath('/admin/gallery')
    return { data }
  }

  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from('gallery')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/gallery')
  return { data }
}

export async function getGallery() {
  await requireAdmin()

  if (isUsingLocalDb()) {
    return localQuery('gallery', { orderBy: { column: 'created_at', direction: 'DESC' } })
  }

  const supabase = await (await import('@/lib/supabase/server')).createServerSupabaseClient()
  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function deleteGalleryItem(id: string) {
  await requireAdmin()

  if (isUsingLocalDb()) {
    localDelete('gallery', id)
    revalidatePath('/admin/gallery')
    return
  }

  const adminClient = getAdminClient()
  const { error } = await adminClient.from('gallery').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/gallery')
}

export async function getPublicNews() {
  if (isUsingLocalDb()) {
    return localQuery<any>('news', {
      where: { published: 1 },
      orderBy: { column: 'created_at', direction: 'DESC' },
    }) || []
  }

  const supabase = await (await import('@/lib/supabase/server')).createServerSupabaseClient()
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getPublicEvents() {
  if (isUsingLocalDb()) {
    return localQuery<any>('events', {
      where: { published: 1 },
      orderBy: { column: 'date', direction: 'DESC' },
    }) || []
  }

  const supabase = await (await import('@/lib/supabase/server')).createServerSupabaseClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('published', true)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getPublicGallery() {
  if (isUsingLocalDb()) {
    return localQuery<any>('gallery', {
      orderBy: { column: 'created_at', direction: 'DESC' },
    }) || []
  }

  const supabase = await (await import('@/lib/supabase/server')).createServerSupabaseClient()
  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function uploadGalleryPhoto(formData: FormData) {
  await requireAdmin()
  const file = formData.get('file') as File | null
  if (!file) return { error: 'File tidak ditemukan' }
  const ext = IMAGE_TYPES[file.type]
  if (!ext) return { error: 'Hanya gambar JPG, PNG, WebP, atau AVIF yang diizinkan' }

  if (isUsingLocalDb()) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'gallery')
    await mkdir(uploadDir, { recursive: true })
    const filename = `${crypto.randomUUID()}.${ext}`
    await writeFile(path.join(uploadDir, filename), buffer)
    return { url: `/uploads/gallery/${filename}` }
  }

  const adminClient = getAdminClient()
  const filename = `${crypto.randomUUID()}.${ext}`
  const { error } = await adminClient.storage
    .from('gallery')
    .upload(filename, file, { contentType: file.type })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = adminClient.storage.from('gallery').getPublicUrl(filename)
  return { url: publicUrl }
}

