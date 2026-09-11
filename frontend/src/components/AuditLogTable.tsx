import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface LogRow {
  id: string;
  userId: string;
  model: string;
  status: 'allowed' | 'blocked' | 'error';
  tokenUsage: number | null;
  latencyMs: number | null;
  timestamp: string;
  promptHash: string;
}

export default function AuditLogTable() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [model, setModel] = useState('');
  const pageSize = 10;

  useEffect(() => {
    if (!accessToken) return;
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
    };
    if (status) params.status = status;
    if (model) params.model = model;

    api
      .getLogs(accessToken, params)
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      });
  }, [accessToken, page, status, model]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Audit log</h2>
      </div>
      <div className="panel-body">
        <div className="filters-row">
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="allowed">Allowed</option>
            <option value="blocked">Blocked</option>
            <option value="error">Error</option>
          </select>
          <input
            placeholder="Filter by model…"
            value={model}
            onChange={(e) => {
              setPage(1);
              setModel(e.target.value);
            }}
          />
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">No matching requests.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Model</th>
                <th>Status</th>
                <th>Tokens</th>
                <th>Latency</th>
                <th>Prompt hash</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.userId?.slice(0, 8) ?? '—'}</td>
                  <td>{r.model}</td>
                  <td>
                    <span className={`pill ${r.status}`}>{r.status}</span>
                  </td>
                  <td>{r.tokenUsage ?? '—'}</td>
                  <td>{r.latencyMs ? `${r.latencyMs}ms` : '—'}</td>
                  <td title={r.promptHash}>{r.promptHash?.slice(0, 10)}…</td>
                  <td>{new Date(r.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pagination">
          <button
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
