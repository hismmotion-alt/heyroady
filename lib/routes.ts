// lib/routes.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { RouteFrontmatter } from './route-types';

const ROUTES_DIR = path.join(process.cwd(), 'content/routes');

export function getAllRoutes(): RouteFrontmatter[] {
  const files = fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.mdx'));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf-8');
    const { data } = matter(raw);
    const fm = data as RouteFrontmatter;
    if (!fm.slug || !fm.title || !fm.heroImage) {
      throw new Error(`Route file "${file}" is missing required frontmatter fields (slug, title, heroImage)`);
    }
    return fm;
  });
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(ROUTES_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''));
}

export function getRouteRaw(slug: string): string {
  const filePath = path.join(ROUTES_DIR, `${slug}.mdx`);
  if (!filePath.startsWith(ROUTES_DIR + path.sep)) {
    throw new Error(`Invalid slug: ${slug}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}
