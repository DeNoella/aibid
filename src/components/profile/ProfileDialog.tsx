'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { ProfilePictureSetup } from '@/components/profile/ProfilePictureSetup';
import { UserAvatar } from '@/components/profile/UserAvatar';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'overview' | 'avatar' | 'details';
}

export function ProfileDialog({ open, onOpenChange, initialTab = 'overview' }: ProfileDialogProps) {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
    }
  }, [open, initialTab, user]);

  if (!user) return null;

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setSaving(true);
    try {
      const updated = await api.put<{ name: string; email: string }>('/settings/profile', {
        name: name.trim(),
        email: email.trim(),
      });
      updateUser({ name: updated.name, email: updated.email });
      toast.success('Profile updated');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not update profile.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle>Your Profile</DialogTitle>
          <DialogDescription>
            View your account details, update your information, or change your avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 p-4">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-14 w-14" fallbackClassName="text-base" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-brand">
                {user.role === 'admin' ? 'System Admin' : 'Data Analyst'}
              </p>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="mt-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Account Details</TabsTrigger>
              <TabsTrigger value="avatar">Profile Picture</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email Address</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={saving}
                />
              </div>
              <Button onClick={() => void handleSave()} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </TabsContent>

            <TabsContent value="avatar" className="mt-4">
              <ProfilePictureSetup
                user={user}
                compact
                markSetupComplete={false}
                onAvatarUpdated={(avatarUrl) => updateUser({ avatarUrl })}
                onComplete={() => onOpenChange(false)}
                completeLabel="Done"
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
