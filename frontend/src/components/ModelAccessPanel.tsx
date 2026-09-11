import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../api/client';

interface UserRow {
  id: string;
  email: string;
  role: string;
}

interface AccessRow {
  id: string;
  userId: string;
  model: string;
  permission: 'allow' | 'deny';
  grantedAt: string;
}

export default function ModelAccessPanel() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [userId, setUserId] = useState('');
  const [model, setModel] = useState('');
  const [permission, setPermission] = useState<'allow' | 'deny'>('allow');
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    if (!accessToken) return;
    api.listUsers(accessToken).then(setUsers).catch(() => setUsers([]));
    api.listAllAccess(accessToken).then(setAccess).catch(() => setAccess([]));
  };

  useEffect(refresh, [accessToken]);

  const emailFor = (id: string) => users.find((u) => u.id === id)?.email ?? id.slice(0, 8);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken || !userId || !model) return;
    setError(null);
    try {
      await api.grantAccess(accessToken, userId, model, permission);
      setModel('');
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update access');
    }
  };

  const onRevoke = async (id: string) => {
    if (!accessToken) return;
    await api.revokeAccess(accessToken, id);
    refresh();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Model access grants</h2>
      </div>
      <div className="panel-body">
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={onSubmit} className="form-grid" style={{ marginBottom: 18 }}>
          <div className="field">
            <label>User</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Model</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="mock-model-a" required />
          </div>
          <div className="field">
            <label>Permission</label>
            <select value={permission} onChange={(e) => setPermission(e.target.value as 'allow' | 'deny')}>
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
            </select>
          </div>
          <button className="btn-primary" type="submit" style={{ width: 'auto', padding: '9px 16px' }}>
            Save
          </button>
        </form>

        {access.length === 0 ? (
          <div className="empty-state">No access grants yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Model</th>
                <th>Permission</th>
                <th>Granted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {access.map((a) => (
                <tr key={a.id}>
                  <td>{emailFor(a.userId)}</td>
                  <td>{a.model}</td>
                  <td>
                    <span className={`pill ${a.permission === 'allow' ? 'allowed' : 'blocked'}`}>
                      {a.permission}
                    </span>
                  </td>
                  <td>{new Date(a.grantedAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => onRevoke(a.id)}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
