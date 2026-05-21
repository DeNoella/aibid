'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, User, Bell, Shield, Palette, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { api, ApiError } from '@/services/api';
import { getPasswordErrors } from '@/utils/validation';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_name: string;
}

interface Preferences {
  theme: string;
  language: string;
  timezone: string;
  date_format: string;
  notify_email: number;
  notify_push: number;
  notify_reports: number;
  notify_insights: number;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', organizationName: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [profileData, prefsData] = await Promise.all([
          api.get<Profile>('/settings/profile'),
          api.get<Preferences>('/settings/preferences'),
        ]);
        setProfile(profileData);
        setPreferences(prefsData);
        setProfileForm({ name: profileData.name, email: profileData.email, organizationName: profileData.organization_name });
      } catch {
        toast.error('Failed to load settings');
      }
    }
    loadSettings();
  }, []);

  const handleSaveProfile = async () => {
    try {
      const updated = await api.put<Profile>('/settings/profile', profileForm);
      setProfile(updated);
      toast.success('Profile saved successfully');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to save profile';
      toast.error(message);
    }
  }

  const handleSavePreferences = async () => {
    if (!preferences) return;
    try {
      await api.put('/settings/preferences', {
        theme: preferences.theme,
        language: preferences.language,
        timezone: preferences.timezone,
        dateFormat: preferences.date_format,
        notifyEmail: !!preferences.notify_email,
        notifyPush: !!preferences.notify_push,
        notifyReports: !!preferences.notify_reports,
        notifyInsights: !!preferences.notify_insights,
      });
      toast.success('Preferences saved successfully');
    } catch {
      toast.error('Failed to save preferences');
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordErrors = getPasswordErrors(passwordForm.newPassword);
    if (passwordErrors.length > 0) {
      toast.error('Invalid password', { description: passwordErrors[0] });
      return;
    }

    try {
      await api.put('/settings/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to update password';
      toast.error(message);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-800 rounded-xl flex items-center justify-center flex-shrink-0">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your account and system preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-neutral-100 dark:bg-neutral-800 w-full justify-start overflow-x-auto h-auto p-1 flex-nowrap no-scrollbar">
          <TabsTrigger value="profile" className="px-4 py-2">Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="px-4 py-2">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="px-4 py-2">Security</TabsTrigger>
          <TabsTrigger value="preferences" className="px-4 py-2">Preferences</TabsTrigger>
          <TabsTrigger value="data" className="px-4 py-2 text-nowrap">Data & Privacy</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-4 mb-6">
              <User className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Profile Information</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={profileForm.email} onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={profile?.role || ''} disabled className="bg-neutral-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input id="organization" value={profileForm.organizationName} onChange={(e) => setProfileForm({...profileForm, organizationName: e.target.value})} />
              </div>
              <Button onClick={handleSaveProfile} className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Notification Preferences</h3>
            </div>
            {preferences && (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={!!preferences.notify_email}
                    onCheckedChange={(checked) => setPreferences({...preferences, notify_email: checked ? 1 : 0})}
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                  <div>
                    <p className="font-medium text-foreground">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Browser push notifications</p>
                  </div>
                  <Switch
                    checked={!!preferences.notify_push}
                    onCheckedChange={(checked) => setPreferences({...preferences, notify_push: checked ? 1 : 0})}
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                  <div>
                    <p className="font-medium text-foreground">Report Notifications</p>
                    <p className="text-sm text-muted-foreground">Get notified when reports are ready</p>
                  </div>
                  <Switch
                    checked={!!preferences.notify_reports}
                    onCheckedChange={(checked) => setPreferences({...preferences, notify_reports: checked ? 1 : 0})}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">AI Insights</p>
                    <p className="text-sm text-muted-foreground">Receive AI-generated insights</p>
                  </div>
                  <Switch
                    checked={!!preferences.notify_insights}
                    onCheckedChange={(checked) => setPreferences({...preferences, notify_insights: checked ? 1 : 0})}
                  />
                </div>
                <Button onClick={handleSavePreferences} className="bg-neutral-800 hover:bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                  Save Preferences
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Security Settings</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <PasswordInput id="currentPassword" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInput id="newPassword" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <PasswordInput id="confirmPassword" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
              </div>
              <Button onClick={handleChangePassword} className="bg-neutral-800 hover:bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                Update Password
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add an extra layer of security to your account
            </p>
            <Button variant="outline">Enable 2FA</Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Active Sessions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Current Session</p>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
                <Button size="sm" variant="outline" className="dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">Revoke</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Preferences Settings */}
        <TabsContent value="preferences" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Palette className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Display Preferences</h3>
            </div>
            {preferences && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={preferences.language} onValueChange={(v) => setPreferences({...preferences, language: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="rw">Kinyarwanda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={preferences.timezone} onValueChange={(v) => setPreferences({...preferences, timezone: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cat">CAT (Africa/Kigali)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="eat">EAT (Africa/Nairobi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={preferences.date_format} onValueChange={(v) => setPreferences({...preferences, date_format: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSavePreferences} className="bg-neutral-800 hover:bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                  Save Preferences
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Data & Privacy Settings */}
        <TabsContent value="data" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Database className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Data & Privacy</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Data Retention</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Your data is retained for 24 months for analytics purposes
                </p>
                <Button variant="outline" size="sm" className="dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">Manage Retention</Button>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Export Your Data</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Download a copy of all your data and analytics
                </p>
                <Button variant="outline" size="sm" className="dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">Request Export</Button>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900">
                <h4 className="font-medium text-red-900 dark:text-red-400 mb-2">Delete Account</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  Permanently delete your account and all associated data
                </p>
                <Button variant="outline" size="sm" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/40">
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
