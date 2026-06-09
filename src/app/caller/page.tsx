'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallerIndex() {
  const router = useRouter();

  useEffect(() => {
    router.push('/caller/dashboard');
  }, [router]);

  return null;
}
