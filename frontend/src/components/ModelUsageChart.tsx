import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ModelUsage {
  model: string;
  count: number;
}

export default function ModelUsageChart({ data }: { data: ModelUsage[] }) {
  if (!data || data.length === 0) {
    return <div className="empty-state">No requests recorded yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#262b38" vertical={false} />
        <XAxis
          dataKey="model"
          tick={{ fill: '#9096a8', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
          axisLine={{ stroke: '#262b38' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9096a8', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
          axisLine={{ stroke: '#262b38' }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(91,141,239,0.08)' }}
          contentStyle={{
            background: '#1b1f2a',
            border: '1px solid #262b38',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'IBM Plex Mono',
          }}
          labelStyle={{ color: '#e8eaf0' }}
        />
        <Bar dataKey="count" fill="#5b8def" radius={[3, 3, 0, 0]} maxBarSize={46} />
      </BarChart>
    </ResponsiveContainer>
  );
}
