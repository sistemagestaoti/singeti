"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, Trash2, UserPlus, FolderPlus, Laptop, 
  HelpCircle, CheckCircle2, AlertTriangle, Layers, 
  FileText, ShieldAlert, Cpu, Network, KeyRound, Printer, Box,
  ArrowLeft, UserCheck, X
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  job_title?: string | null;
  department?: { id: string; name: string } | null;
}

interface AssetItem {
  id: string;
  name: string;
  internal_id: string;
  asset_tag?: string | null;
  type: string;
}

interface CategoryItem {
  id: string;
  name: string;
  description?: string | null;
}

interface DepartmentItem {
  id: string;
  name: string;
}

interface RequestedItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category: string;
  details: string;
}

export default function TicketForm({
  categories: initialCategories,
  assets: initialAssets,
  departments: initialDepartments,
  users: initialUsers,
  currentUserId,
}: {
  categories: CategoryItem[];
  assets: AssetItem[];
  departments: DepartmentItem[];
  users: UserItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Dynamic Lists (allow live additions)
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>(initialCategories);
  const [assetsList, setAssetsList] = useState<AssetItem[]>(initialAssets);
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>(initialDepartments);
  const [usersList, setUsersList] = useState<UserItem[]>(initialUsers);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"INCIDENT" | "REQUEST">("INCIDENT");
  const [urgency, setUrgency] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [impact, setImpact] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [requesterId, setRequesterId] = useState(currentUserId || (initialUsers[0]?.id || ""));
  const [categoryId, setCategoryId] = useState(initialCategories[0]?.id || "");
  const [assetId, setAssetId] = useState("");
  const [customAssetNote, setCustomAssetNote] = useState("");
  const [groupId, setGroupId] = useState(initialDepartments[0]?.id || "");

  // Responsible State (Registered Technician OR Manual Name)
  const [assignedMode, setAssignedMode] = useState<"SELECT" | "MANUAL">("SELECT");
  const [assignedToId, setAssignedToId] = useState("");
  const [assignedToName, setAssignedToName] = useState("");

  // Dynamic Requested Items List (manual item addition)
  const [requestedItems, setRequestedItems] = useState<RequestedItem[]>([]);

  // Sair do Chamado (com confirmação se houver dados preenchidos)
  const handleExitTicket = () => {
    const isDirty = title.trim() || description.trim() || requestedItems.length > 0 || assignedToName.trim();
    if (isDirty) {
      if (!window.confirm("Atenção: Existem alterações não salvas. Deseja realmente sair do chamado sem salvar?")) {
        return;
      }
    }
    router.push("/service-desk");
  };

  // Modals for Manual Additions
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserJobTitle, setNewUserJobTitle] = useState("");
  const [newUserDeptId, setNewUserDeptId] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [savingDept, setSavingDept] = useState(false);

  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] = useState("COMPUTER");
  const [newAssetTag, setNewAssetTag] = useState("");
  const [newAssetManufacturer, setNewAssetManufacturer] = useState("");
  const [newAssetModel, setNewAssetModel] = useState("");
  const [savingAsset, setSavingAsset] = useState(false);

  // Calculate priority based on ITIL standard Matrix (Urgency x Impact)
  useEffect(() => {
    if (urgency === "CRITICAL" || impact === "CRITICAL") {
      setPriority("CRITICAL");
    } else if (urgency === "HIGH" && impact === "HIGH") {
      setPriority("CRITICAL");
    } else if ((urgency === "HIGH" && impact === "MEDIUM") || (urgency === "MEDIUM" && impact === "HIGH")) {
      setPriority("HIGH");
    } else if (urgency === "LOW" && impact === "LOW") {
      setPriority("LOW");
    } else {
      setPriority("MEDIUM");
    }
  }, [urgency, impact]);

  // Fast Templates
  const applyTemplate = (tmpl: {
    title: string;
    description: string;
    type: "INCIDENT" | "REQUEST";
    categoryKeyword: string;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    items?: Array<{ name: string; quantity: number; category: string; details: string }>;
  }) => {
    setTitle(tmpl.title);
    setDescription(tmpl.description);
    setType(tmpl.type);
    setUrgency(tmpl.urgency);
    setImpact(tmpl.impact);

    const matchedCat = categoriesList.find(c => c.name.toLowerCase().includes(tmpl.categoryKeyword.toLowerCase()));
    if (matchedCat) {
      setCategoryId(matchedCat.id);
    }

    if (tmpl.items && tmpl.items.length > 0) {
      setRequestedItems(tmpl.items.map((it, idx) => ({ ...it, id: String(Date.now() + idx) })));
    }
  };

  // Add Item to Requested Items list manually
  const handleAddRequestedItem = (preset?: Partial<RequestedItem>) => {
    const newItem: RequestedItem = {
      id: String(Date.now() + Math.random()),
      name: preset?.name || "",
      quantity: preset?.quantity || 1,
      unit: preset?.unit || "UN",
      category: preset?.category || "Hardware / Periférico",
      details: preset?.details || "",
    };
    setRequestedItems([...requestedItems, newItem]);
  };

  const handleUpdateRequestedItem = (id: string, field: keyof RequestedItem, value: any) => {
    setRequestedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveRequestedItem = (id: string) => {
    setRequestedItems(prev => prev.filter(item => item.id !== id));
  };

  // Save New User Manually Inline
  const handleSaveUserInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setSavingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: "tempPassword123!",
          job_title: newUserJobTitle.trim() || undefined,
          department_id: newUserDeptId || undefined,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar usuário");
      }

      const createdUser = await res.json();
      setUsersList(prev => [createdUser, ...prev]);
      setRequesterId(createdUser.id);
      setShowAddUserModal(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserJobTitle("");
    } catch (err: any) {
      alert(err.message || "Falha ao cadastrar solicitante");
    } finally {
      setSavingUser(false);
    }
  };

  // Save New Category Manually Inline
  const handleSaveCategoryInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setSavingCategory(true);
    try {
      const res = await fetch("/api/tickets/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDesc.trim() || undefined,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar categoria");
      }

      const createdCat = await res.json();
      setCategoriesList(prev => [...prev, createdCat]);
      setCategoryId(createdCat.id);
      setShowAddCategoryModal(false);
      setNewCategoryName("");
      setNewCategoryDesc("");
    } catch (err: any) {
      alert(err.message || "Falha ao cadastrar categoria");
    } finally {
      setSavingCategory(false);
    }
  };

  // Save New Department Manually Inline
  const handleSaveDeptInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    setSavingDept(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar setor");
      }

      const createdDept = await res.json();
      setDepartmentsList(prev => [...prev, createdDept]);
      setGroupId(createdDept.id);
      setShowAddDeptModal(false);
      setNewDeptName("");
    } catch (err: any) {
      alert(err.message || "Falha ao cadastrar setor");
    } finally {
      setSavingDept(false);
    }
  };

  // Save New Asset Manually Inline
  const handleSaveAssetInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;

    setSavingAsset(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAssetName.trim(),
          type: newAssetType,
          asset_tag: newAssetTag.trim() || undefined,
          manufacturer: newAssetManufacturer.trim() || undefined,
          model: newAssetModel.trim() || undefined,
          status: "IN_USE",
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao cadastrar equipamento");
      }

      const createdAsset = await res.json();
      setAssetsList(prev => [createdAsset, ...prev]);
      setAssetId(createdAsset.id);
      setShowAddAssetModal(false);
      setNewAssetName("");
      setNewAssetTag("");
      setNewAssetManufacturer("");
      setNewAssetModel("");
    } catch (err: any) {
      alert(err.message || "Falha ao cadastrar equipamento");
    } finally {
      setSavingAsset(false);
    }
  };

  // Main Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Por favor, preencha o título e a descrição do chamado.");
      return;
    }

    setLoading(true);

    try {
      let fullDescription = description.trim();
      if (customAssetNote.trim()) {
        fullDescription = `${fullDescription}\n\n[Identificação Manual do Dispositivo / Equipamento]: ${customAssetNote.trim()}`;
      }

      const targetAssignedToId = assignedMode === "SELECT" ? (assignedToId || null) : null;
      const targetAssignedToName = assignedMode === "MANUAL" 
        ? (assignedToName.trim() || null)
        : (usersList.find(u => u.id === assignedToId)?.name || null);

      const payload = {
        title: title.trim(),
        description: fullDescription,
        type,
        urgency,
        impact,
        priority,
        requester_id: requesterId,
        assigned_to_id: targetAssignedToId,
        assigned_to_name: targetAssignedToName,
        category_id: categoryId || null,
        asset_id: assetId || null,
        group_id: groupId || null,
        items: requestedItems.filter(i => i.name.trim() !== "").map(i => ({
          description: i.name.trim(),
          quantity: i.quantity,
          unit: i.unit || "UN",
          notes: i.details || "",
        })),
        requested_items: requestedItems.filter(i => i.name.trim() !== ""),
      };

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao abrir chamado");
      }

      const createdTicket = await res.json();
      router.push(`/service-desk/${createdTicket.id}`);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Erro ao registrar o chamado.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1-Click Fast Templates */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Modelos Rápidos Pré-formatados (Clique para preencher)
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => applyTemplate({
              title: "Computador não inicia ou tela azul",
              description: "Equipamento não responde ao ligar ou trava em tela de recuperação do sistema operacional. Necessita verificação física.",
              type: "INCIDENT",
              categoryKeyword: "Hardware",
              urgency: "HIGH",
              impact: "MEDIUM",
            })}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-surface-elevated hover:border-primary/50 hover:bg-surface-hover text-left transition-all text-xs font-medium text-foreground group"
          >
            <Cpu className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
            <span className="line-clamp-1">Falha em Computador</span>
          </button>

          <button
            type="button"
            onClick={() => applyTemplate({
              title: "Sem conexão com a Internet / Wi-Fi instável",
              description: "Queda na conexão com a rede local corporativa. Páginas e sistemas internos inacessíveis.",
              type: "INCIDENT",
              categoryKeyword: "Redes",
              urgency: "HIGH",
              impact: "HIGH",
            })}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-surface-elevated hover:border-primary/50 hover:bg-surface-hover text-left transition-all text-xs font-medium text-foreground group"
          >
            <Network className="w-4 h-4 text-info shrink-0 group-hover:scale-110 transition-transform" />
            <span className="line-clamp-1">Queda de Internet</span>
          </button>

          <button
            type="button"
            onClick={() => applyTemplate({
              title: "Solicitação de Acesso / Criação de Usuário",
              description: "Novo colaborador necessita de e-mail corporativo, acesso ao ERP e permissões nas pastas de rede.",
              type: "REQUEST",
              categoryKeyword: "Acessos",
              urgency: "MEDIUM",
              impact: "MEDIUM",
              items: [
                { name: "Criação de Conta de E-mail Corporativo", quantity: 1, category: "Acesso / Conta", details: "Domínio padrão da empresa" },
                { name: "Acesso ao Sistema ERP", quantity: 1, category: "Software / Licença", details: "Módulo Operacional" },
              ]
            })}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-surface-elevated hover:border-primary/50 hover:bg-surface-hover text-left transition-all text-xs font-medium text-foreground group"
          >
            <KeyRound className="w-4 h-4 text-warning shrink-0 group-hover:scale-110 transition-transform" />
            <span className="line-clamp-1">Acesso & Usuário</span>
          </button>

          <button
            type="button"
            onClick={() => applyTemplate({
              title: "Falha na Impressora / Solicitação de Toner",
              description: "Impressora apresentando aviso de toner baixo ou emperramento de papel no alimentador principal.",
              type: "INCIDENT",
              categoryKeyword: "Impressão",
              urgency: "MEDIUM",
              impact: "LOW",
              items: [
                { name: "Toner Preto para Impressora", quantity: 1, category: "Consumível", details: "Para impressora do setor" }
              ]
            })}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-surface-elevated hover:border-primary/50 hover:bg-surface-hover text-left transition-all text-xs font-medium text-foreground group"
          >
            <Printer className="w-4 h-4 text-accent shrink-0 group-hover:scale-110 transition-transform" />
            <span className="line-clamp-1">Impressora & Toner</span>
          </button>

          <button
            type="button"
            onClick={() => applyTemplate({
              title: "Solicitação de Kit de Periféricos de Trabalho",
              description: "Solicitação de periféricos complementares para melhoria da ergonomia e produtividade no posto de trabalho.",
              type: "REQUEST",
              categoryKeyword: "Solicitação",
              urgency: "LOW",
              impact: "LOW",
              items: [
                { name: "Mouse sem fio ergonômico", quantity: 1, category: "Hardware / Periférico", details: "Conexão USB" },
                { name: "Teclado ABNT2 com teclado numérico", quantity: 1, category: "Hardware / Periférico", details: "USB Padrão" }
              ]
            })}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-surface-elevated hover:border-primary/50 hover:bg-surface-hover text-left transition-all text-xs font-medium text-foreground group"
          >
            <Box className="w-4 h-4 text-success shrink-0 group-hover:scale-110 transition-transform" />
            <span className="line-clamp-1">Periféricos / Peças</span>
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-surface shadow-sm border border-border rounded-2xl p-6 sm:p-8 space-y-8">
        
        {/* Section 1: Classification & Requester */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-border mb-6">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">1</span>
              Classificação & Identificação
            </h3>
            <span className="text-xs text-muted-foreground font-medium">* Campos obrigatórios</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Requester with manual addition */}
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Solicitante do Chamado *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Novo Solicitante Manual
                </button>
              </div>
              <select
                value={requesterId}
                onChange={(e) => setRequesterId(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-foreground text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}){u.department?.name ? ` - Setor: ${u.department.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Tipo de Atendimento *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-foreground text-sm font-semibold focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="INCIDENT">🚨 Incidente (Falha / Algo parou)</option>
                <option value="REQUEST">📋 Requisição (Pedido de recurso / Acesso)</option>
              </select>
            </div>

            {/* Responsável pelo Chamado */}
            <div className="lg:col-span-3 bg-surface-elevated/70 p-4 rounded-xl border border-border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <div>
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-primary" />
                    Responsável pelo Chamado
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione um técnico da lista ou digite livremente qualquer nome (ex: João Marcos).
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAssignedMode("SELECT")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      assignedMode === "SELECT" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Selecionar Técnico
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignedMode("MANUAL")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      assignedMode === "MANUAL" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Digitar Nome Livre
                  </button>
                </div>
              </div>

              {assignedMode === "SELECT" ? (
                <select
                  value={assignedToId}
                  onChange={(e) => {
                    setAssignedToId(e.target.value);
                    const sel = usersList.find(u => u.id === e.target.value);
                    if (sel) setAssignedToName(sel.name);
                    else setAssignedToName("");
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-foreground text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                >
                  <option value="">Não atribuído (Fila de Atendimento)</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}){u.job_title ? ` - ${u.job_title}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Digite o nome do responsável (ex: João Marcos)..."
                  value={assignedToName}
                  onChange={(e) => setAssignedToName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-foreground text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              )}
            </div>

            {/* Category with manual addition */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Categoria *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(true)}
                  className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  + Nova Categoria
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-foreground text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="">Selecione uma categoria...</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Department with manual addition */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Setor / Grupo de Atendimento
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(true)}
                  className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Novo Setor
                </button>
              </div>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-foreground text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="">Nenhum / Triagem Geral N1</option>
                {departmentsList.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Asset with manual addition */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Ativo CMDB Relacionado
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(true)}
                  className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  + Cadastrar Ativo
                </button>
              </div>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-foreground text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="">Nenhum ativo específico do CMDB</option>
                {assetsList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.asset_tag ? `Tag: ${a.asset_tag}` : a.internal_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick manual identification for devices not in CMDB */}
          <div className="mt-3">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Ou digite a identificação manual do equipamento (caso não esteja no inventário CMDB):
            </label>
            <input
              type="text"
              value={customAssetNote}
              onChange={(e) => setCustomAssetNote(e.target.value)}
              placeholder="Ex: Notebook preto Lenovo da recepção / PC mesa 04 do Financeiro"
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-xs focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Section 2: Ticket Core Details */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-border mb-6">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">2</span>
              Conteúdo & Descrição do Problema
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Título Resumido do Chamado *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Lentidão severa no sistema de faturamento ao emitir notas"
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-foreground text-sm font-semibold focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Descrição Detalhada e Sintomas *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que ocorreu, mensagens de erro exibidas, quando começou e etapas já testadas..."
                className="w-full rounded-xl border border-border bg-surface-elevated p-4 text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-y"
              />
            </div>
          </div>
        </div>

        {/* Section 3: ITENS DO CHAMADO */}
        <div className="bg-surface-elevated p-6 rounded-2xl border border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-border mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Box className="w-4 h-4 text-primary" />
                ITENS DO CHAMADO
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adicione individualmente peças, periféricos, licenças, acessos ou cabos solicitados neste chamado.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddRequestedItem()}
                className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                + Adicionar Item
              </button>
            </div>
          </div>

          {requestedItems.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
              <Box className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-muted-foreground">
                Nenhum item adicionado ainda. Se o chamado requer peças ou itens específicos, adicione abaixo.
              </p>
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAddRequestedItem({ name: "Mouse sem fio", quantity: 1, unit: "UN", details: "Óptico USB" })}
                  className="text-xs bg-surface border border-border px-2.5 py-1 rounded-md text-foreground hover:bg-surface-hover font-medium transition-colors"
                >
                  + Mouse sem fio
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRequestedItem({ name: "Teclado USB", quantity: 1, unit: "UN", details: "ABNT2" })}
                  className="text-xs bg-surface border border-border px-2.5 py-1 rounded-md text-foreground hover:bg-surface-hover font-medium transition-colors"
                >
                  + Teclado USB
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRequestedItem({ name: "Monitor 24 polegadas", quantity: 1, unit: "UN", details: "HDMI/DisplayPort" })}
                  className="text-xs bg-surface border border-border px-2.5 py-1 rounded-md text-foreground hover:bg-surface-hover font-medium transition-colors"
                >
                  + Monitor
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRequestedItem({ name: "Cabo de Rede Cat6", quantity: 1, unit: "UN", details: "3 metros montado" })}
                  className="text-xs bg-surface border border-border px-2.5 py-1 rounded-md text-foreground hover:bg-surface-hover font-medium transition-colors"
                >
                  + Cabo de Rede
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRequestedItem({ name: "Licença de Software", quantity: 1, unit: "UN", details: "Assinatura anual" })}
                  className="text-xs bg-surface border border-border px-2.5 py-1 rounded-md text-foreground hover:bg-surface-hover font-medium transition-colors"
                >
                  + Licença
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {requestedItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 bg-surface border border-border rounded-xl items-center">
                  <div className="sm:col-span-1 text-xs font-bold text-muted-foreground text-center">
                    #{index + 1}
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 sm:hidden">Descrição do Item</label>
                    <input
                      type="text"
                      placeholder="Descrição do item *"
                      value={item.name}
                      onChange={(e) => handleUpdateRequestedItem(item.id, "name", e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-surface-elevated text-foreground"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 sm:hidden">Quantidade</label>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-muted-foreground hidden sm:inline">Qtd:</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleUpdateRequestedItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full text-xs font-bold px-2.5 py-2 rounded-lg border border-border bg-surface-elevated text-foreground text-center"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 sm:hidden">Unidade</label>
                    <input
                      type="text"
                      placeholder="Unidade (UN, CX...)"
                      value={item.unit || "UN"}
                      onChange={(e) => handleUpdateRequestedItem(item.id, "unit", e.target.value)}
                      className="w-full text-xs font-medium px-2.5 py-2 rounded-lg border border-border bg-surface-elevated text-foreground text-center"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 sm:hidden">Observação</label>
                    <input
                      type="text"
                      placeholder="Observação / detalhes"
                      value={item.details}
                      onChange={(e) => handleUpdateRequestedItem(item.id, "details", e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-surface-elevated text-foreground"
                    />
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveRequestedItem(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={() => handleAddRequestedItem()}
                  className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Adicionar Item
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: ITIL Matrix (Urgency x Impact = Priority) */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-border mb-6">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-extrabold">3</span>
              Priorização ITIL (Matriz de Atendimento)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            {/* Urgency */}
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Urgência (Velocidade requerida)
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-foreground text-sm font-semibold focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="LOW">Baixa (Pode aguardar fila normal)</option>
                <option value="MEDIUM">Média (Impacto operacional moderado)</option>
                <option value="HIGH">Alta (Necessidade rápida de intervenção)</option>
                <option value="CRITICAL">Crítica (Imediato / Parada iminente)</option>
              </select>
            </div>

            {/* Impact */}
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Impacto (Abrangência de usuários)
              </label>
              <select
                value={impact}
                onChange={(e) => setImpact(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-foreground text-sm font-semibold focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="LOW">Baixo (1 usuário ou equipamento secundário)</option>
                <option value="MEDIUM">Médio (Um departamento ou setor)</option>
                <option value="HIGH">Alto (Vários setores ou filial inteira)</option>
                <option value="CRITICAL">Crítico (Organização inteira paralisada)</option>
              </select>
            </div>

            {/* Calculated Priority Card */}
            <div className="p-4 rounded-xl border border-border bg-surface-elevated flex flex-col justify-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Prioridade Calculada (SLA)
              </span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                  priority === "CRITICAL" ? "bg-danger/10 text-danger border-danger/30 animate-pulse" :
                  priority === "HIGH" ? "bg-warning/10 text-warning border-warning/30" :
                  priority === "MEDIUM" ? "bg-info/10 text-info border-info/30" :
                  "bg-success/10 text-success border-success/30"
                }`}>
                  {priority === "CRITICAL" && <ShieldAlert className="w-3.5 h-3.5" />}
                  {priority === "CRITICAL" ? "CRÍTICA (SLA 4h)" :
                   priority === "HIGH" ? "ALTA (SLA 8h)" :
                   priority === "MEDIUM" ? "MÉDIA (SLA 24h)" :
                   "BAIXA (SLA 48h)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            type="button"
            onClick={handleExitTicket}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors text-center flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Sair do Chamado
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3 rounded-xl text-sm font-bold hover:bg-primary-hover transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Registrando Chamado...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Confirmar e Abrir Chamado
              </>
            )}
          </button>
        </div>
      </form>

      {/* MODAL: Adicionar Novo Solicitante Manualmente */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Adicionar Novo Solicitante Manual
              </h4>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserInline} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">E-mail Corporativo *</label>
                <input
                  type="email"
                  required
                  placeholder="carlos.silva@empresa.com.br"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    placeholder="Ex: Analista Contábil"
                    value={newUserJobTitle}
                    onChange={(e) => setNewUserJobTitle(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Setor</label>
                  <select
                    value={newUserDeptId}
                    onChange={(e) => setNewUserDeptId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                  >
                    <option value="">Selecione...</option>
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-surface-elevated"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary-hover"
                >
                  {savingUser ? "Cadastrando..." : "Cadastrar e Selecionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar Nova Categoria Manualmente */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                Adicionar Nova Categoria Manual
              </h4>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategoryInline} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Segurança da Informação"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Descrição / Escopo</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Incidentes relacionados a antivírus, spam, bloqueios e firewall"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-surface-elevated"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary-hover"
                >
                  {savingCategory ? "Salvando..." : "Salvar e Selecionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar Novo Setor Manualmente */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Adicionar Novo Setor / Departamento Manual
              </h4>
              <button
                type="button"
                onClick={() => setShowAddDeptModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDeptInline} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Nome do Setor / Departamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Suporte N2 - Infraestrutura"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-surface-elevated"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDept}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary-hover"
                >
                  {savingDept ? "Salvando..." : "Salvar e Selecionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cadastrar Ativo CMDB Manualmente */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                <Laptop className="w-5 h-5 text-primary" />
                Cadastrar Ativo no CMDB Manualmente
              </h4>
              <button
                type="button"
                onClick={() => setShowAddAssetModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssetInline} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Nome do Equipamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Notebook Dell Latitude 3420"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Tipo de Ativo</label>
                  <select
                    value={newAssetType}
                    onChange={(e) => setNewAssetType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                  >
                    <option value="COMPUTER">Computador / Notebook</option>
                    <option value="MONITOR">Monitor de Vídeo</option>
                    <option value="PRINTER">Impressora</option>
                    <option value="NETWORK">Equipamento de Rede</option>
                    <option value="OTHER">Outro Dispositivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Plaqueta / Patrimônio</label>
                  <input
                    type="text"
                    placeholder="Ex: PAT-0129"
                    value={newAssetTag}
                    onChange={(e) => setNewAssetTag(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ex: Dell / HP / Lenovo"
                    value={newAssetManufacturer}
                    onChange={(e) => setNewAssetManufacturer(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Inspiron 15"
                    value={newAssetModel}
                    onChange={(e) => setNewAssetModel(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-surface-elevated"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAsset}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary-hover"
                >
                  {savingAsset ? "Cadastrando..." : "Cadastrar e Vincular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
