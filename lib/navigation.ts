// lib/navigation.ts
export type NavLink = {
  label: string;
  href: string;
  show?: boolean;
};

export type NavGroup = {
  label: string;
  links: NavLink[];
};

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