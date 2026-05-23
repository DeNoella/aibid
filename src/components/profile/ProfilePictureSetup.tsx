'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { api, ApiError } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/components/ui/utils';
import type { User } from '@/contexts/AuthContext';

type SetupMode = 'upload' | 'camera' | 'generate';

interface ProfilePictureSetupProps {
  user: User;
  onAvatarUpdated?: (avatarUrl: string) => void;
  showSkip?: boolean;
  onComplete?: () => void;
  compact?: boolean;
  markSetupComplete?: boolean;
  completeLabel?: string;
}

export function ProfilePictureSetup({
  user,
  onAvatarUpdated,
  showSkip = false,
  onComplete,
  compact = false,
  markSetupComplete = true,
  completeLabel,
}: ProfilePictureSetupProps) {
  const [mode, setMode] = useState<SetupMode>('generate');
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(user.avatarUrl ?? null);
  }, [user.avatarUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError('Camera permission was denied or unavailable. You can upload a photo instead.');
    }
  };

  useEffect(() => {
    if (mode === 'camera') {
      void startCamera();
    } else {
      stopCamera();
    }
  }, [mode]);

  const uploadImageData = async (imageData: string) => {
    setBusy(true);
    try {
      const result = await api.post<{ avatarUrl: string }>('/settings/avatar', { imageData });
      setPreviewUrl(result.avatarUrl);
      onAvatarUpdated?.(result.avatarUrl);
      toast.success('Profile picture updated');
      return result.avatarUrl;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not upload profile picture.';
      toast.error(message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/settings/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token') ?? ''}`,
        },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new ApiError(result.error || 'Upload failed', response.status);
      }
      setPreviewUrl(result.avatarUrl);
      onAvatarUpdated?.(result.avatarUrl);
      toast.success('Profile picture updated');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not upload profile picture.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.92);
    await uploadImageData(imageData);
  };

  const generateAvatar = async () => {
    setBusy(true);
    try {
      const result = await api.post<{ avatarUrl: string }>('/settings/avatar/generate', {
        seed: `${user.name}-${Date.now()}`,
      });
      setPreviewUrl(result.avatarUrl);
      onAvatarUpdated?.(result.avatarUrl);
      toast.success('Generated a new system avatar');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not generate avatar.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = async () => {
    setBusy(true);
    try {
      if (markSetupComplete) {
        await api.post('/settings/profile-setup');
      }
      onComplete?.();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not complete profile setup.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const modeButtons = [
    { id: 'generate' as const, label: 'System Avatar', icon: Sparkles },
    { id: 'upload' as const, label: 'Upload', icon: Upload },
    { id: 'camera' as const, label: 'Camera', icon: Camera },
  ];

  return (
    <Card className={cn('border border-border bg-card/95 p-6 sm:p-8', compact && 'p-4 sm:p-6')}>
      <div className="flex flex-col items-center text-center">
        <UserAvatar
          name={user.name}
          avatarUrl={previewUrl}
          className={cn('h-24 w-24', compact && 'h-20 w-20')}
          fallbackClassName="text-lg"
        />
        <h2 className={cn('mt-4 font-serif text-2xl font-bold text-foreground', compact && 'text-xl')}>
          {compact ? 'Profile Picture' : 'Set up your profile picture'}
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Upload a photo, take one with your camera, or use a generated AIBID avatar.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl bg-secondary/50 p-1">
        {modeButtons.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              mode === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {mode === 'upload' && (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-center">
            <ImageUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="mb-4 text-sm text-muted-foreground">Choose a JPG, PNG, WEBP, or GIF up to 5MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFileUpload(file);
                event.target.value = '';
              }}
            />
            <Button type="button" variant="outline" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              Choose Image
            </Button>
          </div>
        )}

        {mode === 'camera' && (
          <div className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
            {cameraError ? (
              <p className="text-sm text-destructive">{cameraError}</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-black">
                <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => void startCamera()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Camera
              </Button>
              <Button type="button" disabled={busy || !cameraReady} onClick={() => void capturePhoto()}>
                <Camera className="mr-2 h-4 w-4" />
                Capture Photo
              </Button>
            </div>
          </div>
        )}

        {mode === 'generate' && (
          <div className="rounded-xl border border-border bg-secondary/20 p-6 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-brand" />
            <p className="mb-4 text-sm text-muted-foreground">
              We can generate a unique avatar from your name. You can regenerate it anytime.
            </p>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void generateAvatar()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Avatar
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {showSkip && (
          <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={() => void finishSetup()}>
            Use System Avatar
          </Button>
        )}
        <Button type="button" className="flex-1" disabled={busy} onClick={() => void finishSetup()}>
          {completeLabel ?? (compact ? 'Save Profile Picture' : 'Continue to Dashboard')}
        </Button>
      </div>
    </Card>
  );
}
