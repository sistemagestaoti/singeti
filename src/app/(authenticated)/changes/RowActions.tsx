"use client";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RowActions({ id, route }: { id: string, route: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Deseja realmente excluir este registro?")) return;
    try {
      const res = await fetch(`/api/${route}/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Erro ao excluir.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      <Link 
        href={`/${route}/${id}`} 
        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
        title="Visualizar/Editar"
      >
        <Eye className="w-4 h-4" />
      </Link>
      <button 
        onClick={handleDelete}
        className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
        title="Excluir"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
