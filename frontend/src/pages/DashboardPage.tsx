import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import StatsCards from '../components/StatsCards';
import ModelUsageChart from '../components/ModelUsageChart';
import PolicyEventsTable from '../components/PolicyEventsTable';
import AuditLogTable from '../components/AuditLogTable';
import ModelAccessPanel from '../components/ModelAccessPanel';

interface Stats {
  totals: { total: number; allowed: number; blocked: number; errored: number };
  byModel: { model: string; count: number }[];
  recentPolicyEvents: any[];
  suspiciousUsers: any[];
}

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!accessToken || user?.role !== 'Admin') return;
    const load = () => api.getStats(accessToken).then(setStats).catch(() => setStats(null));
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [accessToken, user]);

  if (user?.role !== 'Admin') {
    return (
      <>
        <h1 className="page-title">Audit log</h1>
        <p className="page-subtitle">Your own request history, scoped to your account.</p>
        <AuditLogTable />
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">Monitoring</h1>
      <p className="page-subtitle">Live view of gateway traffic, policy enforcement, and access grants.</p>

      {stats && <StatsCards totals={stats.totals} />}

      <div className="panel">
        <div className="panel-header">
          <h2>Requests by model</h2>
        </div>
        <div className="panel-body">
          <ModelUsageChart data={stats?.byModel ?? []} />
        </div>
      </div>

      {stats && (
        <PolicyEventsTable events={stats.recentPolicyEvents} suspiciousUsers={stats.suspiciousUsers} />
      )}

      <AuditLogTable />

      <ModelAccessPanel />
    </>
  );
}
