// Optional Vercel endpoint. The access key stays on the server.
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' })
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key)
    return res
      .status(503)
      .json({
        error:
          'Photo search is not configured. Upload a background photo, or add an Unsplash API key in Vercel',
      })
  const url = new URL(req.url, 'https://openshot.local')
  const download = url.searchParams.get('download')
  let endpoint
  if (download) {
    // Never proxy arbitrary URLs or send the key outside api.unsplash.com.
    const target = new URL(download)
    if (
      target.origin !== 'https://api.unsplash.com' ||
      !/^\/photos\/[^/]+\/download$/.test(target.pathname)
    )
      return res.status(400).json({ error: 'Invalid photo download URL' })
    endpoint = target
  } else {
    const query = (url.searchParams.get('query') || 'nature').slice(0, 120)
    endpoint = new URL('https://api.unsplash.com/search/photos')
    endpoint.searchParams.set('query', query)
    endpoint.searchParams.set('per_page', '24')
    endpoint.searchParams.set('content_filter', 'high')
  }
  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok)
      return res
        .status(response.status === 429 || response.status === 403 ? 429 : 502)
        .json({ error: 'Unsplash could not complete this request. Try again later' })
    const body = await response.json()
    if (download) return res.status(200).json({ ok: true })
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return res
      .status(200)
      .json({
        photos: body.results.map((photo) => ({
          url: photo.urls.regular,
          thumb: photo.urls.small,
          credit: photo.user.name,
          link: `${photo.user.links.html}?utm_source=openshot&utm_medium=referral`,
          download: photo.links.download_location,
        })),
      })
  } catch {
    return res.status(502).json({ error: 'Photo search timed out. Try again later' })
  }
}
