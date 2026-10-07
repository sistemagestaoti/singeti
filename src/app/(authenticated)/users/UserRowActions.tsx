"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit2, Power, Trash2 } from "lucide-react";
import { useState } from "react";

export default function UserRowActions({ 
  user 
}: { 
  user: { id: string; status: string; name: string }
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggleStatus = async () => {
    if (!confirm(`Deseja alterar o status do usuário ${user.name}?`)) return;
    setLoading(true);
    
    try {
      const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (e) {
      alert("Erro ao alterar status");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!confirm(`TEM CERTEZA que deseja excluir definitivamente o usuário ${user.name}?`)) return;
    setLoading(true);
    
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Não é possível excluir. O usuário provavelmente possui vínculos no sistema (chamados, projetos, etc). Recomenda-se Inativar.");
      }
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Link 
        href={`/users/${user.id}`}
        className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        title="Editar"
      >
        <Edit2 className="w-4 h-4" />
      </Link>
      
      <button 
        onClick={toggleStatus}
        disabled={loading}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          user.status === 'ACTIVE' 
            ? 'bg-warning/10 text-warning hover:bg-warning/20' 
            : 'bg-success/10 text-success hover:bg-success/20'
        }`}
        title={user.status === 'ACTIVE' ? 'Inativar Usuário' : 'Ativar Usuário'}
      >
        <Power className="w-4 h-4" />
      </button>

      <button 
        onClick={deleteUser}
        disabled={loading}
        className="w-8 h-8 rounded bg-danger/10 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors"
        title="Excluir Definitivamente"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
