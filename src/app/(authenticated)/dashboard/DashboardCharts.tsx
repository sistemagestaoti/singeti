"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardCharts({ 
  ticketsData, 
  assetsData 
}: { 
  ticketsData: any[], 
  assetsData: any[] 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Gráfico de Barras - Chamados */}
      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Chamados por Status</h3>
        <div className="flex-1 min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ticketsData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                itemStyle={{ color: 'var(--foreground)' }}
              />
              <Bar dataKey="quantidade" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Pizza - Ativos */}
      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Ativos por Tipo</h3>
        <div className="flex-1 min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetsData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="quantidade"
                stroke="none"
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              >
                {assetsData.map((entry, index) => {
                  const colors = ['var(--primary)', 'var(--info)', 'var(--success)', 'var(--warning)', 'var(--danger)'];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                })}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                itemStyle={{ color: 'var(--foreground)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
