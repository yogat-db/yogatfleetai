// app/admin/users/UsersTableClient.tsx
'use client';

import { useState } from 'react';
import { Mail, Calendar, Trash2, Loader2 } from 'lucide-react';
import theme from '@/app/theme';
import { updateUserRole, deleteUser } from './actions';

export function UsersTableClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingRole(userId);
    setError(null);
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('role', newRole);
    try {
      await updateUserRole(formData);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingRole(null);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Delete "${userName}" permanently?`)) return;
    setLoadingDelete(userId);
    setError(null);
    const formData = new FormData();
    formData.append('userId', userId);
    try {
      await deleteUser(formData);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingDelete(null);
    }
  };

  if (error) {
    return <div style={{ color: theme.colors.status.critical, padding: '20px' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Joined</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={styles.td}>
                  <div style={styles.userName}>{user.full_name || 'Anonymous'}</div>
                  <div style={styles.userEmail}><Mail size={12} /> {user.email}</div>
                </td>
                <td style={styles.td}>
                  <select
                    value={user.role || 'user'}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    disabled={loadingRole === user.id}
                    style={styles.select}
                  >
                    <option value="user">User</option>
                    <option value="mechanic">Mechanic</option>
                    <option value="admin">Admin</option>
                  </select>
                  {loadingRole === user.id && <Loader2 size={12} className="spin" style={{ marginLeft: 8 }} />}
                </td>
                <td style={styles.td}>
                  <Calendar size={12} /> {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style={styles.td}>
                  <button
                    onClick={() => handleDelete(user.id, user.full_name || user.email)}
                    disabled={loadingDelete === user.id}
                    style={styles.deleteBtn}
                  >
                    {loadingDelete === user.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tableWrapper: {
    overflowX: 'auto',
    background: theme.colors.background.card,
    borderRadius: '20px',
    border: `1px solid ${theme.colors.border.light}`,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '16px 20px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: theme.colors.text.muted, borderBottom: `1px solid ${theme.colors.border.light}` },
  td: { padding: '16px 20px', borderBottom: `1px solid ${theme.colors.border.light}`, verticalAlign: 'middle' },
  userName: { fontWeight: 600, marginBottom: 4 },
  userEmail: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: theme.colors.text.secondary },
  select: { background: theme.colors.background.subtle, border: `1px solid ${theme.colors.border.medium}`, borderRadius: '8px', padding: '6px 12px', color: theme.colors.text.primary, fontSize: '13px', cursor: 'pointer' },
  deleteBtn: { background: 'transparent', border: `1px solid ${theme.colors.status.critical}40`, borderRadius: '8px', padding: '6px 10px', color: theme.colors.status.critical, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
};