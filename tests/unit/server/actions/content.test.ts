import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLocalInsert = vi.fn((table: string, data: any) => ({ ...data, id: 'mock-id' })) as any
const mockLocalQuery = vi.fn(() => []) as any
const mockLocalDelete = vi.fn(() => true) as any

vi.mock('@/lib/db/local', () => ({
  isUsingLocalDb: () => true,
  localInsert: mockLocalInsert,
  localQuery: mockLocalQuery,
  localDelete: mockLocalDelete,
}))

vi.mock('@/lib/supabase/admin', () => ({
  requireAdmin: vi.fn(() => Promise.resolve({
    user: { id: 'admin-1', email: 'admin@test.com' },
    supabase: null,
  })),
  getAdminClient: vi.fn(() => ({})),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
})

/* ─── NEWS ─── */

describe('createNews', () => {
  it('creates news with valid data', async () => {
    const { createNews } = await import('@/server/actions/content')
    const fd = new FormData()
    fd.append('title', 'Grand Final 2026')
    fd.append('slug', 'grand-final-2026')
    fd.append('content', 'Acara grand final Nyong Noni UNIMA 2026 akan diselenggarakan di Manado. Acara ini spektakuler.')
    fd.append('excerpt', 'Grand final akan digelar di Manado')
    fd.append('published', 'true')

    const result = await createNews(fd)
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
  })

  it('rejects missing title', async () => {
    const { createNews } = await import('@/server/actions/content')
    const fd = new FormData()
    fd.append('title', '')
    fd.append('slug', 'test')
    fd.append('content', 'Test content that is long enough to pass validation')
    fd.append('excerpt', 'Test excerpt')

    const result = await createNews(fd)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('title')
  })

  it('rejects short content', async () => {
    const { createNews } = await import('@/server/actions/content')
    const fd = new FormData()
    fd.append('title', 'Valid Title')
    fd.append('slug', 'valid-title')
    fd.append('content', 'Short')
    fd.append('excerpt', 'Excerpt')

    const result = await createNews(fd)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('content')
  })
})

describe('getNews', () => {
  it('returns news items', async () => {
    mockLocalQuery.mockReturnValueOnce([{ id: '1', title: 'News 1', slug: 'news-1', content: 'Content that is long enough...', excerpt: 'Excerpt' }])
    const { getNews } = await import('@/server/actions/content')
    const result = await getNews()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('News 1')
  })

  it('returns empty array when no news', async () => {
    mockLocalQuery.mockReturnValueOnce([])
    const { getNews } = await import('@/server/actions/content')
    const result = await getNews()
    expect(result).toHaveLength(0)
  })
})

describe('deleteNews', () => {
  it('deletes news by id', async () => {
    const { deleteNews } = await import('@/server/actions/content')
    await expect(deleteNews('news-id')).resolves.not.toThrow()
    expect(mockLocalDelete).toHaveBeenCalledWith('news', 'news-id')
  })
})

/* ─── EVENTS ─── */

describe('createEvent', () => {
  it('creates event with valid data', async () => {
    const { createEvent } = await import('@/server/actions/content')
    const fd = new FormData()
    fd.append('title', 'Grand Final 2026')
    fd.append('slug', 'grand-final-2026')
    fd.append('description', 'Acara puncak Nyong Noni UNIMA 2026')
    fd.append('date', '2026-08-15')
    fd.append('location', 'Manado Convention Center')
    fd.append('published', 'true')

    const result = await createEvent(fd)
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
  })

  it('rejects missing date', async () => {
    const { createEvent } = await import('@/server/actions/content')
    const fd = new FormData()
    fd.append('title', 'Event Title')
    fd.append('slug', 'event-title')
    fd.append('description', 'A description that is long enough to pass validation')
    fd.append('date', '')
    fd.append('location', 'Manado')

    const result = await createEvent(fd)
    expect(result.error).toBeDefined()
  })
})

describe('getEvents', () => {
  it('returns events', async () => {
    mockLocalQuery.mockReturnValueOnce([{ id: '1', title: 'Event 1', date: '2026-08-15' }])
    const { getEvents } = await import('@/server/actions/content')
    const result = await getEvents()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Event 1')
  })

  it('returns empty array when no events', async () => {
    mockLocalQuery.mockReturnValueOnce([])
    const { getEvents } = await import('@/server/actions/content')
    const result = await getEvents()
    expect(result).toHaveLength(0)
  })
})

describe('deleteEvent', () => {
  it('deletes event by id', async () => {
    const { deleteEvent } = await import('@/server/actions/content')
    await expect(deleteEvent('event-id')).resolves.not.toThrow()
    expect(mockLocalDelete).toHaveBeenCalledWith('events', 'event-id')
  })
})

/* ─── GALLERY ─── */

describe('createGalleryItem', () => {
  it('creates gallery item with valid data', async () => {
    const { createGalleryItem } = await import('@/server/actions/content')
    const fd = new FormData()
    fd.append('title', 'Photo Session')
    fd.append('image_url', 'https://example.com/photo.jpg')
    fd.append('category', 'Photo Shoot')

    const result = await createGalleryItem(fd)
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
  })

  it('rejects invalid image URL', async () => {
    const { createGalleryItem } = await import('@/server/actions/content')
    const fd = new FormData()
    fd.append('title', 'Photo')
    fd.append('image_url', 'not-a-url')
    fd.append('category', 'Test')

    const result = await createGalleryItem(fd)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('image_url')
  })
})

describe('getGallery', () => {
  it('returns gallery items', async () => {
    mockLocalQuery.mockReturnValueOnce([{ id: '1', title: 'Photo 1', image_url: 'https://example.com/1.jpg' }])
    const { getGallery } = await import('@/server/actions/content')
    const result = await getGallery()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Photo 1')
  })

  it('returns empty array when no gallery items', async () => {
    mockLocalQuery.mockReturnValueOnce([])
    const { getGallery } = await import('@/server/actions/content')
    const result = await getGallery()
    expect(result).toHaveLength(0)
  })
})

describe('deleteGalleryItem', () => {
  it('deletes gallery item by id', async () => {
    const { deleteGalleryItem } = await import('@/server/actions/content')
    await expect(deleteGalleryItem('gallery-id')).resolves.not.toThrow()
    expect(mockLocalDelete).toHaveBeenCalledWith('gallery', 'gallery-id')
  })
})
