"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function DashboardCharts({ 
  chartData 
}: { 
  chartData: any[] 
}) {
  const fallbackColors = ['#F59E0B', '#EF4444', '#6366F1', '#10B981', '#00C2FF'];
  
  // Total para o rótulo central
  const total = chartData ? chartData.reduce((sum, item) => sum + (item.quantidade || 0), 0) : 0;

  if (!chartData || chartData.length === 0 || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground w-full flex-1">
        <div className="relative w-[140px] h-[140px] rounded-full border-2 border-dashed border-border/60 flex flex-col items-center justify-center mb-3">
          <span className="text-3xl font-black text-foreground leading-none">0</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total</span>
        </div>
        <p className="text-xs text-muted-foreground">Nenhum chamado categorizado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full py-2">
      {/* Círculo do gráfico com o número 48 perfeitamente centralizado */}
      <div className="relative w-[180px] h-[180px] flex-shrink-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={78}
              paddingAngle={2}
              dataKey="quantidade"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || fallbackColors[index % fallbackColors.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)', 
                borderRadius: '8px', 
                color: 'var(--foreground)' 
              }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Número Total 100% Centralizado no Vazio do Círculo */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-3xl font-black text-foreground leading-none">{total}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total</span>
        </div>
      </div>

      {/* Legenda dos Dados alinhada ao lado */}
      <div className="flex flex-col gap-2.5 min-w-[120px]">
        {chartData.map((item, index) => {
          const label = item.name || item.categoria || `Item ${index + 1}`;
          const color = item.color || fallbackColors[index % fallbackColors.length];
          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground font-medium">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
