export interface RouteFrontmatter {
  slug: string;
  title: string;
  region: string;
  miles: number;
  duration: string;
  stopsCount: number;
  tags: string[];
  heroImage: string;
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
