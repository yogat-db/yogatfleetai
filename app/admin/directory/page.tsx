'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Mail, MapPin, Phone, 
  Search, Loader2, UserCog, Activity 
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import theme from '@/app/theme';

interface AdminMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  location?: string;
  phone?: string;
}

export default function AdminDirectoryPage() {
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAdminStaff();
  }, []);

  const fetchAdminStaff = async () => {
    setLoading(true);
    try {
      // We pull from 'profiles' where role is 'admin' 
      // This bypasses the 'mechanics' table entirely
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, location, phone')
        .eq('role', 'admin')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setAdmins(data || []);
    } catch (err) {
      console.error('Failed to load admin staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmins = admins.filter(a => 
    a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.container}>
      <header style={styles.header}>
        <div>
          <div style={styles.kicker}>Internal Operations</div>
          <h1 style={styles.title}>Staff Directory</h1>
          <p style={styles.subtitle}>Management and system administrators with elevated access.</p>
        </div>

        <div style={styles.searchBox}>
          <Search size={18} color={theme.colors.text.muted} />
          <input 
            style={styles.searchInput}
            placeholder="Search admins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {loading ? (
        <div style={styles.loaderArea}>
          <Loader2 className="animate-spin" size={32} color={theme.colors.primary} />
        </div>
      ) : (
        <div style={styles.adminGrid}>
          {filteredAdmins.map((admin) => (
            <motion.div key={admin.id} whileHover={{ y: -4 }} style={styles.adminCard}>
              <div style={styles.cardTop}>
                <div style={styles.avatar}>
                  <UserCog size={24} />
                </div>
                <div style={styles.roleBadge}>
                  <ShieldCheck size={12} />
                  <span>Verified Admin</span>
                </div>
              </div>

              <div style={styles.adminInfo}>
                <h3 style={styles.nameText}>{admin.full_name || 'System Administrator'}</h3>
                <div style={styles.detailRow}><Mail size={14} /> {admin.email}</div>
                {admin.location && <div style={styles.detailRow}><MapPin size={14} /> {admin.location}</div>}
              </div>

              <div style={styles.cardFooter}>
                <div style={styles.statusIndicator}>
                  <Activity size={12} /> System Active
                </div>
                <button style={styles.manageBtn}>Edit Access</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredAdmins.length === 0 && (
        <div style={styles.emptyState}>
          No administrative records found.
        </div>
      )}

      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `clamp(${theme.spacing[6]}, 5vw, ${theme.spacing[12]})`,
    background: theme.colors.background.main,
    minHeight: '100vh',
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '24px',
    marginBottom: '48px',
  },
  kicker: { fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: theme.colors.primary, marginBottom: '8px' },
  title: { fontSize: 'clamp(2.2rem, 7vw, 3.8rem)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1 },
  subtitle: { fontSize: '14px', color: theme.colors.text.secondary, marginTop: '12px', maxWidth: '500px' },
  
  searchBox: { 
    display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', 
    border: `1px solid ${theme.colors.border.light}`, borderRadius: '14px', padding: '12px 20px', width: '100%', maxWidth: '350px' 
  },
  searchInput: { background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '14px', width: '100%' },

  adminGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  adminCard: {
    background: 'rgba(15, 23, 42, 0.4)',
    border: `1px solid ${theme.colors.border.light}`,
    borderRadius: '24px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { 
    width: '52px', height: '52px', borderRadius: '16px', background: `${theme.colors.primary}20`, 
    color: theme.colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.colors.primary}40` 
  },
  roleBadge: { 
    display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', 
    color: theme.colors.primary, padding: '6px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' 
  },
  adminInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  nameText: { fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' },
  detailRow: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: theme.colors.text.secondary },
  
  cardFooter: { 
    marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${theme.colors.border.light}`, 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
  },
  statusIndicator: { fontSize: '10px', fontWeight: 800, color: theme.colors.primary, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' },
  manageBtn: { background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' },
  
  loaderArea: { display: 'flex', justifyContent: 'center', padding: '100px 0' },
  emptyState: { textAlign: 'center', color: theme.colors.text.muted, padding: '80px', gridColumn: '1 / -1' }
};