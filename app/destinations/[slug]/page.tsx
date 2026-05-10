import { redirect } from 'next/navigation';

interface PageProps {
  params: { slug: string };
}

export default function DestinationRouteRedirect({ params }: PageProps) {
  redirect(`/blog/${params.slug}`);
}
