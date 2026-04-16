// lib/route-types.ts

export interface RouteFrontmatter {
  slug: string;
  title: string;
  region: string;
  miles: number;
  duration: string;
  stopsCount: number;
  stopNames: string[];
  stops: RouteStop[];
  tags: string[];
  heroImage: string;
  instagramReel?: string;
  metaDescription: string;
  metaKeywords: string[];
}

export interface RouteStop {
  name: string;
  description: string;
  duration: string;
}

export interface RouteGem {
  name: string;
  description: string;
  image: string;
}
