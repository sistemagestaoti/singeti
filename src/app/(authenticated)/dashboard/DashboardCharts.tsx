"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function DashboardCharts({ 
  chartData 
}: { 
  chartData: any[] 
}) {
  // Use explicit colors from the array if provided, otherwise fallback
  const fallbackColors = ['var(--primary)', '#8B5CF6', 'var(--success)', 'var(--warning)', '#6366F1'];
  
  // Calculate total for center label
  const total = chartData.reduce((sum, item) => sum + item.quantidade, 0);

  return (
    <div className="flex-1 min-h-[250px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="40%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="quantidade"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || fallbackColors[index % fallbackColors.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
            itemStyle={{ color: 'var(--foreground)' }}
          />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: 'var(--muted-foreground)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Total Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ left: '-10%' }}>
        <span className="text-2xl font-bold text-foreground">{total}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Total</span>
      </div>
    </div>
  );
}
