import {
  Briefcase,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  type LucideIcon,
  Users,
  Wrench,
} from 'lucide-react';

const ICONS = {
  dashboard: LayoutDashboard,
  fleet: Truck,
  marketplace: ShoppingCart,
  accessories: ShoppingCart,
  diagnostics: Wrench,
  serviceHistory: History,
  controlCenter: Settings,
  mechanicHub: Briefcase,
  privacy: FileText,
  adminDashboard: ShieldCheck,
  adminJobs: Briefcase,
  adminMechanics: Wrench,
  adminUsers: Users,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

export type NavLink = {
  label: string;
  href: string;
  show?: boolean;
  icon?: LucideIcon;
  key?: IconKey;
};

export type NavGroup = {
  label: string;
  links: NavLink[];
};

export function getIconForLink(link: NavLink): LucideIcon {
  if (link.icon) return link.icon;
  if (link.key) return ICONS[link.key];
  return Menu;
}

export function getNavGroups(
  isMechanic: boolean,
  isAdmin: boolean
): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: 'Overview',
      links: [{ href: '/dashboard', label: 'Dashboard', key: 'dashboard' }],
    },
    {
      label: 'Fleet',
      links: [
        { href: '/fleet', label: 'My Fleet', key: 'fleet' },
        { href: '/diagnostics', label: 'Diagnostics', key: 'diagnostics' },
        {
          href: '/service-history',
          label: 'Service History',
          key: 'serviceHistory',
        },
      ],
    },
    {
      label: 'Marketplace',
      links: [
        {
          href: '/marketplace',
          label: 'Marketplace',
          key: 'marketplace',
        },
        {
          href: '/marketplace/affiliate',
          label: 'Car Accessories',
          key: 'accessories',
        },
        {
          href: '/marketplace/jobs',
          label: 'Mechanic Hub',
          key: 'mechanicHub',
          show: isMechanic,
        },
      ],
    },
    {
      label: 'System',
      links: [
        {
          href: '/control-center',
          label: 'Control Center',
          key: 'controlCenter',
        },
        {
          href: '/privacy',
          label: 'Privacy Policy',
          key: 'privacy',
        },
      ],
    },
  ];

  if (isAdmin) {
    groups.push({
      label: 'Admin',
      links: [
        {
          href: '/admin/dashboard',
          label: 'Admin Dashboard',
          key: 'adminDashboard',
        },
        {
          href: '/admin/jobs',
          label: 'Admin Jobs',
          key: 'adminJobs',
        },
        {
          href: '/admin/mechanics',
          label: 'Admin Mechanics',
          key: 'adminMechanics',
        },
        {
          href: '/admin/users',
          label: 'Admin Users',
          key: 'adminUsers',
        },
      ],
    });
  }

  return groups.map((group) => ({
    ...group,
    links: group.links.filter((link) => link.show !== false),
  }));
}