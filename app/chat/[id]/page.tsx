'use client';

import { useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

function ConversationLoader() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    if (!id) { router.replace('/chat'); return; }
    const supabase = createClient();
    supabase
      .from('conversations')
      .select('messages')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          router.replace('/chat');
          return;
        }
        // Store messages in sessionStorage, redirect to /chat?load=<id>
        sessionStorage.setItem(`roady_conv_${id}`, JSON.stringify(data.messages));
        router.replace(`/chat?load=${id}`);
      });
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F3F4F2' }}>
      <div className="animate-spin w-8 h-8 border-4 border-gray-200 rounded-full" style={{ borderTopColor: '#D85A30' }} />
    </div>
  );
}

export default function ConversationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#F3F4F2' }} />}>
      <ConversationLoader />
    </Suspense>
  );
}
