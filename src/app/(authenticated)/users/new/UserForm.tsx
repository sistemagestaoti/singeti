"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User as UserIcon, Eye, EyeOff } from "lucide-react";
import ImageCropperModal from "@/components/ImageCropperModal";

export default function UserForm({
  roles,
  departments,
  jobTitles = [],
  companyId,
  initialData = null
}: {
  roles: any[];
  departments: any[];
  jobTitles?: string[];
  companyId: string;
  initialData?: any;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localDepartments, setLocalDepartments] = useState(departments);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "", // Senha vazia por padrão na edição
    job_title: initialData?.job_title || "",
    phone: initialData?.phone || "",
    status: initialData?.status || "ACTIVE",
    role_id: initialData?.role_id || roles[0]?.id || "",
    department_id: initialData?.department_id || "",
    company_id: initialData?.company_id || companyId,
    avatar: initialData?.avatar || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/users/${initialData.id}` : "/api/users";
      const method = isEditing ? "PUT" : "POST";

      const payload = { ...formData };
      if (isEditing && !payload.password) {
        delete (payload as any).password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar usuário");
      }

      router.push(`/users`);
      router.refresh();
    } catch (error: any) {
      alert(error.message);
      setLoading(false);
    }
  };

  const handleDepartmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "NEW_DEPARTMENT") {
      const name = window.prompt("Digite o nome do novo setor:");
      if (name && name.trim()) {
        try {
          const res = await fetch("/api/departments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim(), company_id: companyId }),
          });
          if (res.ok) {
            const newDept = await res.json();
            setLocalDepartments([...localDepartments, newDept]);
            setFormData({ ...formData, department_id: newDept.id });
          } else {
            alert("Erro ao criar o setor.");
            setFormData({ ...formData, department_id: "" });
          }
        } catch (error) {
          console.error(error);
          alert("Erro na requisição ao criar o setor.");
          setFormData({ ...formData, department_id: "" });
        }
      } else {
        setFormData({ ...formData, department_id: "" });
      }
    } else {
      setFormData({ ...formData, department_id: val });
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setImageToCrop(null);
    const uploadData = new FormData();
    uploadData.append("file", croppedFile);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: uploadData });
      if (res.ok) {
        const { url } = await res.json();
        setFormData({ ...formData, avatar: url });
      } else {
        alert("Erro no upload da imagem recortada.");
      }
    } catch(err) {
      console.error(err);
      alert("Erro ao enviar a imagem.");
    }
  };

  return (
    <>
    {imageToCrop && (
      <ImageCropperModal
        imageSrc={imageToCrop}
        onClose={() => setImageToCrop(null)}
        onCropComplete={handleCropComplete}
      />
    )}
    <form onSubmit={handleSubmit} className="bg-surface shadow-sm border border-border rounded-xl p-6 space-y-8">
      
      <div>
        <h3 className="text-lg font-bold text-foreground border-b border-border pb-2 mb-4">Dados Principais</h3>
        
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-surface shadow-sm bg-muted flex items-center justify-center flex-shrink-0 relative group cursor-pointer">
            {formData.avatar ? (
              <Image src={formData.avatar} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-8 h-8 text-muted-foreground" />
            )}
            
            {/* Overlay for clicking */}
            <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-[10px] font-bold text-center cursor-pointer transition-all">
              ALTERAR
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={onFileSelect}
              />
            </label>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium leading-6 text-foreground">Foto de Perfil (Avatar)</label>
            <div className="mt-2 flex items-center gap-4">
              <label className="cursor-pointer bg-surface hover:bg-surface-hover text-foreground border border-border px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors">
                Escolher Arquivo...
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={onFileSelect}
                />
              </label>
              
              {formData.avatar && (
                <button 
                  type="button" 
                  onClick={() => setFormData({ ...formData, avatar: "" })}
                  className="text-sm font-bold text-danger hover:text-danger/80"
                >
                  Remover Foto
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Importe uma imagem (JPG, PNG) do seu computador. Ela será salva na pasta pública do servidor.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          
          <div className="col-span-full">
            <label className="block text-sm font-medium leading-6 text-foreground">Nome Completo *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-foreground">E-mail *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-foreground">
              {isEditing ? "Nova Senha (deixe em branco para manter)" : "Senha Provisória *"}
            </label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required={!isEditing}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                autoComplete="new-password"
                className="block w-full rounded-md border-0 py-2 px-3 pr-10 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-foreground">Telefone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-foreground">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="mt-2 block w-full rounded-md border-0 py-2 pl-3 pr-10 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm font-medium"
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="EXTERNAL">Externo / Cliente</option>
            </select>
          </div>

        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground border-b border-border pb-2 mb-4">Organizacional e Acesso</h3>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          
          <div>
            <label className="block text-sm font-medium leading-6 text-foreground">Cargo / Função</label>
            <input
              type="text"
              list="jobTitlesList"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
              placeholder="Digite ou selecione..."
            />
            <datalist id="jobTitlesList">
              {jobTitles.map((job, idx) => (
                <option key={idx} value={job} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-foreground">Setor / Departamento</label>
            <select
              value={formData.department_id || ""}
              onChange={handleDepartmentChange}
              className="mt-2 block w-full rounded-md border-0 py-2 pl-3 pr-10 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
            >
              <option value="">Sem setor</option>
              {localDepartments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
              <option value="NEW_DEPARTMENT" className="font-bold text-primary">+ Adicionar novo Setor...</option>
            </select>
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-medium leading-6 text-foreground">Perfil de Acesso do Sistema (Role) *</label>
            <select
              required
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="mt-2 block w-full rounded-md border-0 py-2 pl-3 pr-10 text-foreground ring-1 ring-inset ring-input focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm font-bold bg-muted"
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      <div className="mt-8 flex justify-end gap-x-4 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-bold leading-6 text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar Usuário"}
        </button>
      </div>
    </form>
    </>
  );
}
