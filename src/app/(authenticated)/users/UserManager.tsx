"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Shield, Briefcase, Plus, X, Edit2, Power, Trash2, AtSign } from "lucide-react";
import UserForm from "./new/UserForm";

interface UserManagerProps {
  initialUsers: any[];
  roles: any[];
  departments: any[];
  jobTitles: string[];
  companyId: string;
}

export default function UserManager({
  initialUsers,
  roles,
  departments,
  jobTitles,
  companyId,
}: UserManagerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const openNewUserModal = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEditUserModal = (user: any) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleFormSuccess = () => {
    closeModal();
    router.refresh();
  };

  const toggleStatus = async (user: any) => {
    if (!confirm(`Deseja alterar o status do usuário ${user.name}?`)) return;
    setActionLoading(user.id);
    
    try {
      const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (e) {
      alert("Erro ao alterar status do usuário.");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (user: any) => {
    if (!confirm(`TEM CERTEZA que deseja excluir definitivamente o usuário ${user.name}?`)) return;
    setActionLoading(user.id);
    
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
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os acessos, logins de usuário, cargos e departamentos dos colaboradores.
          </p>
        </div>
        <button 
          onClick={openNewUserModal}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface shadow-sm border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Usuário & Login</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Cargo / Setor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {initialUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                initialUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden flex-shrink-0">
                          {u.avatar ? (
                            <Image src={u.avatar} alt={u.name} width={40} height={40} className="w-full h-full object-cover" />
                          ) : (
                            u.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {u.name}
                          </div>
                          <div className="text-xs text-primary font-medium flex items-center gap-0.5 mt-0.5">
                            <AtSign className="w-3 h-3 inline text-primary/70" />
                            <span>{u.username || 'sem usuário'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-foreground">{u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-foreground font-medium flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-muted-foreground" />
                        {u.job_title || 'Não definido'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{u.department?.name || 'Sem departamento'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        <Shield className="w-3 h-3" />
                        {u.role?.name || 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                        u.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' :
                        u.status === 'INACTIVE' ? 'bg-danger/10 text-danger border-danger/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>
                        {u.status === 'ACTIVE' ? 'Ativo' : u.status === 'INACTIVE' ? 'Inativo' : 'Externo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditUserModal(u)}
                          className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                          title="Editar Usuário"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => toggleStatus(u)}
                          disabled={actionLoading === u.id}
                          className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                            u.status === 'ACTIVE' 
                              ? 'bg-warning/10 text-warning hover:bg-warning/20' 
                              : 'bg-success/10 text-success hover:bg-success/20'
                          }`}
                          title={u.status === 'ACTIVE' ? 'Inativar Usuário' : 'Ativar Usuário'}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={() => deleteUser(u)}
                          disabled={actionLoading === u.id}
                          className="w-8 h-8 rounded bg-danger/10 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors"
                          title="Excluir Definitivamente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Usuário do Sistema */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 my-auto relative">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {editingUser ? "Editar Usuário do Sistema" : "Novo Usuário do Sistema"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingUser 
                    ? "Atualize as credenciais, nome de usuário, setor e permissões de acesso." 
                    : "Preencha as informações cadastrais e o nome de usuário (login) para acesso à plataforma."}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-9 h-9 rounded-lg border border-border bg-surface-hover hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <UserForm
              roles={roles}
              departments={departments}
              jobTitles={jobTitles}
              companyId={companyId}
              initialData={editingUser}
              onSuccess={handleFormSuccess}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
