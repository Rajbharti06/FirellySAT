import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.firelly.in'
  const now = new Date()

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/dashboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/practice`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/study-plan`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/questionbank`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/calm`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/mock-test`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/mock-history`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/notes`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ]
}
