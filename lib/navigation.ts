// lib/navigation.ts
import { 
  LayoutDashboard, Truck, ShoppingCart, Wrench, History, 
  Settings, Briefcase, ShieldCheck, Menu, 
  type LucideIcon, 
  Users
} from 'lucide-react';

export type NavLink = {
  label: string;
  href: string;
  show?: boolean;
  icon?: LucideIcon; // optional, can be resolved in sidebar
};

export type NavGroup = {
  label: string;
  links: NavLink[];
};

// Helper: get icon component for a given link label
export function getIconForLabel(label: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    Dashboard: LayoutDashboard,
    'My Fleet': Truck,
    Marketplace: ShoppingCart,
    'Car Accessories': ShoppingCart,
    Diagnostics: Wrench,
    'Service History': History,
    'Control Center': Settings,
    'Mechanic Hub': Briefcase,
    'Admin Dashboard': ShieldCheck,
    'Admin Jobs': Briefcase,
    'Admin Mechanics': Wrench,
    'Admin Users': Users,
  };
  return iconMap[label] || Menu;
}

export function NAV_GROUPS(isMechanic: boolean, isAdmin: boolean): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: 'Operations',
      links: [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/fleet', label: 'My Fleet' },
      ],
    },
    {
      label: 'Marketplace',
      links: [
        { href: '/marketplace', label: 'Marketplace' },
        { href: '/marketplace/affiliate', label: 'Car Accessories' },
      ],
    },
    {
      label: 'Technical',
      links: [
        { href: '/diagnostics', label: 'Diagnostics' },
        { href: '/service-history', label: 'Service History' },
        { href: '/marketplace/jobs', label: 'Mechanic Hub', show: isMechanic },
      ],
    },
    {
      label: 'System',
      links: [
        { href: '/control-center', label: 'Control Center' },
        { href: '/privacy', label: 'Privacy Policy' },
      ],
    },
  ];
  if (isAdmin) {
    groups.push({
      label: 'Admin',
      links: [
        { href: '/admin', label: 'Admin Dashboard' },
        { href: '/admin/jobs', label: 'Admin Jobs' },
        { href: '/admin/mechanics', label: 'Admin Mechanics' },
        { href: '/admin/users', label: 'Admin Users' },
      ],
    });
  }
  return groups;
}