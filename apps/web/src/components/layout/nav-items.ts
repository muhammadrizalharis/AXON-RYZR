import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Wand2,
  Images,
  FolderKanban,
  Users,
  Code2,
  Settings,
  User,
  UserCog,
  MonitorPlay,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only visible to ADMIN / SUPER_ADMIN. */
  adminOnly?: boolean;
};

export const NAV_MAIN: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/create', label: 'Creation Hub', icon: Wand2 },
  { href: '/gallery', label: 'My Gallery', icon: Images },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/api', label: 'API', icon: Code2, adminOnly: true },
];

export const NAV_SYSTEM: NavItem[] = [
  { href: '/users', label: 'Users', icon: UserCog, adminOnly: true },
  {
    href: '/creations',
    label: 'All Creations',
    icon: MonitorPlay,
    adminOnly: true,
  },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
];

export function isAdminRole(role?: string | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}
