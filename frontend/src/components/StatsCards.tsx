interface Totals {
  total: number;
  allowed: number;
  blocked: number;
  errored: number;
}

export default function StatsCards({ totals }: { totals: Totals }) {
  const blockedRate = totals.total > 0 ? Math.round((totals.blocked / totals.total) * 100) : 0;

  return (
    <div className="stat-row">
      <div className="stat-panel hero">
        <div>
          <div className="stat-label">Total AI requests</div>
          <div className="stat-value">{totals.total.toLocaleString()}</div>
        </div>
        <div className="stat-delta">{blockedRate}% blocked overall</div>
      </div>
      <div className="stat-panel">
        <div className="stat-label">Allowed</div>
        <div className="stat-value success">{totals.allowed.toLocaleString()}</div>
      </div>
      <div className="stat-panel">
        <div className="stat-label">Blocked</div>
        <div className="stat-value danger">{totals.blocked.toLocaleString()}</div>
      </div>
      <div className="stat-panel">
        <div className="stat-label">Errored</div>
        <div className="stat-value">{totals.errored.toLocaleString()}</div>
      </div>
    </div>
  );
}
