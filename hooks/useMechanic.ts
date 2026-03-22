import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useMechanic() {
  const [isMechanic, setIsMechanic] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: mechanic } = await supabase
        .from('mechanics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsMechanic(!!mechanic);
      setLoading(false);
    };
    check();
  }, []);

  return { isMechanic, loading };
}
