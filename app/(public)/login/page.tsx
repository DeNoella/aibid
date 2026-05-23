'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { ParticleCanvas } from '@/components/ParticleCanvas';
import { useAuth } from '@/contexts/AuthContext';
import { getPasswordErrors } from '@/utils/validation';
import { api, ApiError } from '@/services/api';
import { motion } from 'motion/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'signup') setActiveTab('signup');
  }, [searchParams]);

  const handleTabChange = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    router.replace(tab === 'signup' ? '/login?tab=signup' : '/login', { scroll: false });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.post<{ mfaRequired?: boolean; attemptId?: string }>('/auth/login', { email, password });
      if (result?.mfaRequired && result?.attemptId) {
        router.push(`/mfa/pending?attemptId=${encodeURIComponent(result.attemptId)}`);
        return;
      }
      toast.error('Login failed', { description: 'Unexpected response from the server. Please try again.' });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to sign in. Please try again.';
      toast.error('Login failed', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordErrors = getPasswordErrors(formData.password);
    if (passwordErrors.length > 0) {
      toast.error('Invalid password', { description: passwordErrors[0] });
      return;
    }

    setIsLoading(true);
    try {
      await register(formData.name, formData.email, formData.password, formData.organization);
      toast.success('Account created successfully!', { description: 'Welcome to AIBID' });
      router.push('/onboarding/profile');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Please try again later.';
      toast.error('Registration failed', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <ParticleCanvas fullPage />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <AuthFormCard activeTab={activeTab} onTabChange={handleTabChange}>
            {activeTab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="bg-input-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <PasswordInput
                    id="signin-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-input-background"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand/90 text-brand-foreground font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isLoading}
                    className="bg-input-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isLoading}
                    className="bg-input-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput
                    id="signup-password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isLoading}
                    className="bg-input-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <PasswordInput
                    id="signup-confirm"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={isLoading}
                    className="bg-input-background"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand/90 text-brand-foreground font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </form>
            )}
          </AuthFormCard>
        </motion.div>
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen">
        <ParticleCanvas fullPage />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
