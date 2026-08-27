import { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.APP_URL || 'http://localhost:3001';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/settings', '/messages', '/onboarding'] }],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
