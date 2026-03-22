import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useUserRole() {
  const [isMechanic, setIsMechanic] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mechanicId, setMechanicId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check mechanic
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsMechanic(!!mechanic);
      setMechanicId(mechanic?.id || null);

      // Check admin (hardcoded email – change to your admin email)
      const isAdminUser = user.email === 'teebaxy@gmail.com';
      setIsAdmin(isAdminUser);

      setLoading(false);
    };
    fetchRoles();
  }, []);

  return { isMechanic, isAdmin, loading, mechanicId };
}
