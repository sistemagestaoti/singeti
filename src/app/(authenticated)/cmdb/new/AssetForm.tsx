"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Entity = { id: string; name?: string; corporate_name?: string };
type UserEntity = { id: string; name: string };

export default function AssetForm({
  companies,
  locations,
  departments,
  users,
  initialData,
  assetId
}: {
  companies: Entity[];
  locations: Entity[];
  departments: Entity[];
  users?: UserEntity[];
  initialData?: any;
  assetId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    type: initialData?.type || "COMPUTER",
    asset_tag: initialData?.asset_tag || "",
    manufacturer: initialData?.manufacturer || "",
    model: initialData?.model || "",
    serial_number: initialData?.serial_number || "",
    status: initialData?.status || "IN_USE",
    company_id: initialData?.company_id || companies[0]?.id || "",
    location_id: initialData?.location_id || "",
    department_id: initialData?.department_id || "",
    user_id: initialData?.user_id || "",
    purchase_date: initialData?.purchase_date ? new Date(initialData.purchase_date).toISOString().split('T')[0] : "",
    warranty_end: initialData?.warranty_end ? new Date(initialData.warranty_end).toISOString().split('T')[0] : "",
    purchase_value: initialData?.purchase_value || "",
    notes: initialData?.notes || "",
    
    // Computer Specific
    ip_address: initialData?.computer?.ip_address || "",
    mac_address: initialData?.computer?.mac_address || "",
    os_name: initialData?.computer?.os_name || "",
    processor: initialData?.computer?.processor || "",
    memory_mb: initialData?.computer?.memory_mb || "",
    storage_gb: initialData?.computer?.storage_gb || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = assetId ? `/api/assets/${assetId}` : "/api/assets";
      const method = assetId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Falha ao salvar ativo");
      }

      router.push("/cmdb");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Erro ao salvar ativo");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card shadow-sm border border-border rounded-lg p-6 space-y-8">
      
      {/* Identificação Patrimonial */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">Identificação Patrimonial</h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground">Nome do Equipamento *</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Ex: Notebook Dell Inspiron" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Patrimônio</label>
            <input type="text" value={formData.asset_tag} onChange={e => setFormData({...formData, asset_tag: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Ex: PAT-001" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Categoria *</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm">
              <option value="COMPUTER">Computador / Notebook</option>
              <option value="MONITOR">Monitor</option>
              <option value="PRINTER">Impressora</option>
              <option value="NETWORK">Equipamento de Rede</option>
              <option value="OTHER">Outros Diversos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Fabricante</label>
            <input type="text" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Ex: Dell, HP" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Modelo</label>
            <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Ex: Inspiron 15" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground">Número de Série</label>
            <input type="text" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Ex: S/N 123456" />
          </div>
        </div>
      </div>

      {/* Responsabilidade e Localização */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">Responsabilidade e Localização</h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          
          <div>
            <label className="block text-sm font-medium text-foreground">Usuário Responsável</label>
            <select value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm">
              <option value="">Não atribuído</option>
              {users?.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Departamento / Setor</label>
            <select value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm">
              <option value="">Selecione...</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Localização Física</label>
            <select value={formData.location_id} onChange={e => setFormData({...formData, location_id: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm">
              <option value="">Selecione...</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Empresa Contábil *</label>
            <select required value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm">
              <option value="">Selecione...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Especificações Técnicas (Mostra apenas se for Computador/Servidor) */}
      {formData.type === 'COMPUTER' && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">Informações Técnicas</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-foreground">Endereço IP</label>
              <input type="text" value={formData.ip_address} onChange={e => setFormData({...formData, ip_address: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="192.168.1.x" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Endereço MAC</label>
              <input type="text" value={formData.mac_address} onChange={e => setFormData({...formData, mac_address: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="00:00:00:00:00:00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Sistema Operacional</label>
              <input type="text" value={formData.os_name} onChange={e => setFormData({...formData, os_name: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Windows 11, Ubuntu" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Processador</label>
              <input type="text" value={formData.processor} onChange={e => setFormData({...formData, processor: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Intel i5 11ª Gen" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Memória RAM (MB)</label>
              <input type="number" value={formData.memory_mb} onChange={e => setFormData({...formData, memory_mb: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Ex: 8192 (para 8GB)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Armazenamento (GB)</label>
              <input type="number" value={formData.storage_gb} onChange={e => setFormData({...formData, storage_gb: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Ex: 512" />
            </div>
          </div>
        </div>
      )}

      {/* Aquisição e Manutenção */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-2">Aquisição e Ciclo de Vida</h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-foreground">Status Operacional *</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm font-semibold">
              <option value="IN_USE">Em Uso</option>
              <option value="IN_STOCK">Em Estoque (Disponível)</option>
              <option value="MAINTENANCE">Em Manutenção</option>
              <option value="RETIRED">Desativado / Baixado</option>
              <option value="LOST">Extraviado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Data de Aquisição</label>
            <input type="date" value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Fim da Garantia</label>
            <input type="date" value={formData.warranty_end} onChange={e => setFormData({...formData, warranty_end: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-foreground">Observações</label>
            <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-2 block w-full rounded-md border-border bg-background px-3 py-2 text-foreground focus:ring-primary focus:border-primary sm:text-sm" placeholder="Observações de uso, condições físicas, etc..."></textarea>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-x-4 border-t border-border pt-6">
        <button type="button" onClick={() => router.back()} className="text-sm font-semibold leading-6 text-foreground hover:text-muted-foreground">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">
          {loading ? "Salvando..." : (assetId ? "Atualizar Equipamento" : "Cadastrar Equipamento")}
        </button>
      </div>
    </form>
  );
}
