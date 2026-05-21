'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/components/ui/utils';
import {
  LayoutDashboard,
  Users,
  Brain,
  Shield,
  Database,
  HardDrive,
  Wrench,
  CheckCircle,
  GitBranch,
  FileText,
  History,
  Upload,
  Mic,
  MessageSquare,
  Bell,
  LucideIcon,
} from 'lucide-react';
import { adminNavItems, analystNavItems } from './navConfig';

const iconMap: Record<string, LucideIcon> = {
  '/admin/overview': LayoutDashboard,
  '/admin/users': Users,
  '/admin/ai-health': Brain,
  '/admin/audit': Shield,
  '/admin/datasources': Database,
  '/admin/backup': HardDrive,
  '/admin/maintenance': Wrench,
  '/dashboard': LayoutDashboard,
  '/insights/validate': CheckCircle,
  '/insights/lineage': GitBranch,
  '/reports/builder': FileText,
  '/reports/history': History,
  '/data/upload': Upload,
  '/ai-assistant': MessageSquare,
  '/notifications': Bell,
};

export function AppSidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const items = user?.role === 'admin' ? adminNavItems : analystNavItems;

  const content = (
    <nav className={cn('space-y-1', mobile ? 'p-0' : 'p-3')}>
      {items.map((item) => {
        const Icon = iconMap[item.href] ?? (item.label === 'Voice query' ? Mic : LayoutDashboard);
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-secondary text-brand border border-brand/20'
                : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-brand')} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  if (mobile) return content;

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-sidebar shrink-0">
      <div className="p-4 border-b border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {user?.role === 'admin' ? 'System Admin' : 'Data Analyst'}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">{content}</div>
    </aside>
  );
}
