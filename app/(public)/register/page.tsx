'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ParticleCanvas } from '@/components/ParticleCanvas';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login?tab=signup');
  }, [router]);

  return (
    <div className="relative min-h-screen">
      <ParticleCanvas fullPage />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
