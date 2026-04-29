// components/NotificationBellWrapper.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import NotificationBell from './NotificationBell';

export default function NotificationBellWrapper() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  if (!isLoggedIn) return null;
  return <NotificationBell />;
}