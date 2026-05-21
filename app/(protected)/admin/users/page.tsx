'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/services/api';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { toDisplayRole, type DisplayRole } from '@/utils/roleDisplay';
import { formatRelativeTime, getUserActivityStatus } from '@/utils/dateFormat';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Eye, Trash2 } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  last_login: string | null;
  is_active: number;
  created_at: string;
}

const emptyForm = { name: '', email: '', role: 'DATA_ANALYST' as DisplayRole, department: '' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [createTempPassword, setCreateTempPassword] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const qs = params.toString();
      const result = await api.get<AdminUser[]>(`/admin/users${qs ? `?${qs}` : ''}`);
      setUsers(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: toDisplayRole(user.role),
      department: user.department ?? '',
    });
  };

  const handleCreate = async () => {
    try {
      const result = await api.post<{ id: string; tempPassword: string }>('/admin/users', {
        name: createForm.name,
        email: createForm.email,
        role: createForm.role,
        department: createForm.department || undefined,
      });
      setCreateTempPassword(result.tempPassword);
      toast.success('User created');
      fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create user');
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      await api.put(`/admin/users/${editUser.id}`, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        department: editForm.department || null,
      });
      toast.success('User updated');
      setEditUser(null);
      fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await api.delete(`/admin/users/${deleteUser.id}`);
      toast.success('User deleted');
      setDeleteUser(null);
      if (viewUser?.id === deleteUser.id) setViewUser(null);
      fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete user');
    }
  };

  const activityBadge = (lastLogin: string | null) => {
    const status = getUserActivityStatus(lastLogin);
    const map = {
      active: 'bg-green-100 text-green-700 border-green-200',
      idle: 'bg-amber-100 text-amber-700 border-amber-200',
      inactive: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    };
    return <Badge variant="outline" className={map[status]}>{status}</Badge>;
  };

  if (loading && users.length === 0) return <div className="p-6"><PageLoadingSkeleton /></div>;
  if (error && users.length === 0) return <div className="p-6"><PageError message={error} onRetry={fetchUsers} /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">View, update, and delete user accounts</p>
        </div>
        <Button onClick={() => { setCreateForm(emptyForm); setCreateTempPassword(null); setCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="SYSTEM_ADMIN">SYSTEM_ADMIN</SelectItem>
              <SelectItem value="DATA_ANALYST">DATA_ANALYST</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchUsers}>Apply</Button>
        </div>
      </Card>

      <Card>
        {users.length === 0 ? (
          <EmptyState title="No users found" description="Adjust filters or create a new user." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell><RoleBadge role={user.role} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.department || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(user.last_login)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewUser(user)} title="View user">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Edit user">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteUser(user)} title="Delete user">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
          {createTempPassword ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Share this temporary password once. The user must change it on first login.</p>
              <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-mono text-sm">{createTempPassword}</div>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setCreateTempPassword(null); }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as DisplayRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SYSTEM_ADMIN">SYSTEM_ADMIN</SelectItem>
                      <SelectItem value="DATA_ANALYST">DATA_ANALYST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Department</Label><Input value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Edit User</SheetTitle></SheetHeader>
          {editUser && (
            <div className="space-y-4 mt-6">
              <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div>
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as DisplayRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SYSTEM_ADMIN">SYSTEM_ADMIN</SelectItem>
                    <SelectItem value="DATA_ANALYST">DATA_ANALYST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Department</Label><Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} /></div>
              <Button className="w-full" onClick={handleUpdate}>Save changes</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>User Details</SheetTitle></SheetHeader>
          {viewUser && (
            <div className="space-y-4 mt-6 text-sm">
              <div><p className="text-muted-foreground">Name</p><p className="font-medium">{viewUser.name}</p></div>
              <div><p className="text-muted-foreground">Email</p><p className="font-medium">{viewUser.email}</p></div>
              <div><p className="text-muted-foreground">Role</p><RoleBadge role={viewUser.role} /></div>
              <div><p className="text-muted-foreground">Department</p><p className="font-medium">{viewUser.department || '—'}</p></div>
              <div><p className="text-muted-foreground">Activity</p>{activityBadge(viewUser.last_login)}</div>
              <div><p className="text-muted-foreground">Last login</p><p className="font-medium">{formatRelativeTime(viewUser.last_login)}</p></div>
              <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(viewUser.created_at.replace(' ', 'T')).toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">Status</p><Badge variant={viewUser.is_active ? 'outline' : 'secondary'}>{viewUser.is_active ? 'Active' : 'Deactivated'}</Badge></div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteUser?.name} ({deleteUser?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
