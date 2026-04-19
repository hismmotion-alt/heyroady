import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/my-trips',
        '/saved/',
        '/trip',
        '/preferences',
        '/suggest',
        '/suggestions',
        '/customize',
        '/auth',
      ],
    },
    sitemap: 'https://heyroady.com/sitemap.xml',
  };
}
