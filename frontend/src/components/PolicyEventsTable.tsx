interface PolicyEvent {
  id: string;
  userId: string;
  ruleTriggered: string;
  action: string;
  createdAt: string;
}

interface SuspiciousUser {
  userId: string;
  blockedInLastHour: number;
}

export default function PolicyEventsTable({
  events,
  suspiciousUsers,
}: {
  events: PolicyEvent[];
  suspiciousUsers: SuspiciousUser[];
}) {
  return (
    <div className="grid-2">
      <div className="panel">
        <div className="panel-header">
          <h2>Recent policy events</h2>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {events.length === 0 ? (
            <div className="empty-state">No policy events recorded yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Rule</th>
                  <th>Action</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.userId.slice(0, 8)}</td>
                    <td>{e.ruleTriggered}</td>
                    <td>
                      <span className={`pill ${e.action}`}>{e.action}</span>
                    </td>
                    <td>{new Date(e.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Suspicious activity</h2>
        </div>
        <div className="panel-body">
          {suspiciousUsers.length === 0 ? (
            <div className="empty-state">No suspicious patterns in the last hour.</div>
          ) : (
            suspiciousUsers.map((s) => (
              <div className="suspicious-item" key={s.userId}>
                <span className="mono">{s.userId.slice(0, 8)}</span>
                <span className="pill blocked">{s.blockedInLastHour} blocked / 1h</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
