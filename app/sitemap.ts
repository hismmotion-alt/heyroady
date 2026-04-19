import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BASE_URL = 'https://heyroady.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, priority: 1.0, changeFrequency: 'weekly', lastModified: new Date() },
    { url: `${BASE_URL}/destinations`, priority: 0.9, changeFrequency: 'weekly', lastModified: new Date() },
    { url: `${BASE_URL}/terms`, priority: 0.3, changeFrequency: 'yearly' },
    { url: `${BASE_URL}/privacy`, priority: 0.3, changeFrequency: 'yearly' },
  ];

  const routesDir = path.join(process.cwd(), 'content/routes');
  const slugs = fs
    .readdirSync(routesDir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const { data } = matter(fs.readFileSync(path.join(routesDir, f), 'utf8'));
      return data.slug as string;
    })
    .filter(Boolean);

  const destinationPages: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/destinations/${slug}`,
    priority: 0.8,
    changeFrequency: 'monthly',
  }));

  return [...staticPages, ...destinationPages];
}
