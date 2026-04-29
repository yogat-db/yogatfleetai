// lib/navigation.ts
export function NAV_GROUPS(isMechanic: boolean, isAdmin: boolean) {
  return [
    {
      name: 'Main',
      links: [
        { label: 'Dashboard', href: '/dashboard', icon: null, show: true },
        { label: 'Fleet', href: '/fleet', icon: null, show: true },
        { label: 'Marketplace', href: '/marketplace', icon: null, show: true },
        { label: 'Diagnostics', href: '/diagnostics', icon: null, show: true },
        { label: 'Service History', href: '/service-history', icon: null, show: true },
        { label: 'Control Center', href: '/control-center', icon: null, show: true },
      ],
    },
    ...(isMechanic ? [{
      name: 'Mechanic',
      links: [
        { label: 'Mechanic Dashboard', href: '/marketplace/mechanics/dashboard', icon: null, show: true },
      ],
    }] : []),
    ...(isAdmin ? [{
      name: 'Admin',
      links: [
        { label: 'Admin Dashboard', href: '/admin', icon: null, show: true },
        { label: 'Admin Jobs', href: '/admin/jobs', icon: null, show: true },
        { label: 'Admin Mechanics', href: '/admin/mechanics', icon: null, show: true },
        { label: 'Admin Users', href: '/admin/users', icon: null, show: true },
      ],
    }] : []),
  ];
}