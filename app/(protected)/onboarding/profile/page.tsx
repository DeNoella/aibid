'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ProfilePictureSetup } from '@/components/profile/ProfilePictureSetup';
import { ParticleCanvas } from '@/components/ParticleCanvas';
import { useRouter } from 'next/navigation';

export default function OnboardingProfilePage() {
  const { user, updateUser, refreshUser } = useAuth();
  const router = useRouter();

  if (!user) {
    return null;
  }

  const finish = async () => {
    await refreshUser();
    router.push(user.role === 'admin' ? '/admin/overview' : '/dashboard');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ParticleCanvas fullPage />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          <ProfilePictureSetup
            user={user}
            showSkip
            onAvatarUpdated={(avatarUrl) => updateUser({ avatarUrl, profileSetupCompleted: false })}
            onComplete={finish}
          />
        </div>
      </div>
    </div>
  );
}
