"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function NewTicketModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "NORMAL"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsOpen(false);
        setFormData({ title: "", description: "", priority: "NORMAL" });
        router.refresh(); // Atualiza a tabela na tela de chamados
      } else {
        alert("Erro ao criar chamado.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Novo Chamado
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Abrir Novo Chamado</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título do Incidente / Solicitação <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-[#020817] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ex: Computador não liga"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição Detalhada</label>
                <textarea 
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-[#020817] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  placeholder="Descreva o problema com o máximo de detalhes possível..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prioridade</label>
                <select 
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-[#020817] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="BAIXA">Baixa (Pode aguardar)</option>
                  <option value="NORMAL">Normal (Impacta o trabalho, mas há contorno)</option>
                  <option value="ALTA">Alta (Trabalho totalmente parado)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-70"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Salvando...' : 'Abrir Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
