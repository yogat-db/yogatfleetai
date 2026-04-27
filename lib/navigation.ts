import { 
  LayoutDashboard, Car, ShoppingBag, Truck, 
  Wrench, Settings, ShieldCheck, Zap, Lock 
} from 'lucide-react';

export const NAV_GROUPS = (isMechanic: boolean, isAdmin: boolean) => [
  {
    label: 'Operations',
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/fleet', label: 'My Fleet', icon: Car },
    ]
  },
  {
    label: 'Marketplace',
    links: [
      { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
      { href: '/marketplace/affiliate', label: 'Car Accessories', icon: Truck },
    ]
  },
  {
    label: 'Technical',
    links: [
      { href: '/diagnostics', label: 'Diagnostics', icon: Zap },
      { href: '/service-history', label: 'Service History', icon: Wrench },
      { href: '/marketplace/jobs', label: 'Mechanic Hub', icon: ShieldCheck, show: isMechanic },
    ]
  },
  {
    label: 'System',
    links: [
      { href: '/control-center', label: 'Control Center', icon: Settings },
      { href: '/privacy', label: 'Privacy Policy', icon: Lock },
    ]
  }
];