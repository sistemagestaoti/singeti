"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

export default function CMDBFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [type, setType] = useState(searchParams.get("type") || "");

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      router.push(`/cmdb?${params.toString()}`);
    }, 400);

    return () => clearTimeout(timeout);
  }, [q, status, type, router]);

  return (
    <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Pesquisar por nome, patrimônio ou série..." 
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-primary focus:border-primary"
        />
      </div>
      <div className="flex gap-4 sm:w-auto">
        <select 
          value={type} 
          onChange={e => setType(e.target.value)}
          className="py-2 px-3 rounded-lg border border-border bg-background text-sm focus:ring-primary focus:border-primary"
        >
          <option value="">Todos os Tipos</option>
          <option value="COMPUTER">Computador / Notebook</option>
          <option value="MONITOR">Monitor</option>
          <option value="PRINTER">Impressora</option>
          <option value="NETWORK">Equipamento de Rede</option>
        </select>

        <select 
          value={status} 
          onChange={e => setStatus(e.target.value)}
          className="py-2 px-3 rounded-lg border border-border bg-background text-sm focus:ring-primary focus:border-primary"
        >
          <option value="">Todos os Status</option>
          <option value="IN_USE">Em Uso</option>
          <option value="IN_STOCK">Em Estoque</option>
          <option value="MAINTENANCE">Manutenção</option>
          <option value="RETIRED">Baixado</option>
        </select>
      </div>
    </div>
  );
}
