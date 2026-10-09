const fs = require('fs');
const path = require('path');

const modules = [
  {
    name: 'Problem',
    route: 'problems',
    fields: [
      { name: 'title', label: 'Título do Problema', type: 'text', required: true },
      { name: 'description', label: 'Descrição', type: 'textarea', required: true },
      { name: 'priority', label: 'Prioridade', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      { name: 'status', label: 'Status', type: 'select', options: ['OPEN', 'INVESTIGATING', 'IDENTIFIED', 'RESOLVED', 'CLOSED'] },
    ]
  },
  {
    name: 'Change',
    route: 'changes',
    fields: [
      { name: 'title', label: 'Título da Mudança', type: 'text', required: true },
      { name: 'reason', label: 'Motivo', type: 'text', required: true },
      { name: 'description', label: 'Descrição', type: 'textarea', required: true },
      { name: 'risk', label: 'Risco', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      { name: 'impact', label: 'Impacto', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    ]
  },
  {
    name: 'Contract',
    route: 'contracts',
    fields: [
      { name: 'title', label: 'Título do Contrato', type: 'text', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: ['SUPPORT', 'LICENSING', 'LEASING', 'INTERNET', 'OTHER'] },
      { name: 'description', label: 'Descrição', type: 'textarea', required: false },
      { name: 'total_value', label: 'Valor Total', type: 'number', required: false },
    ]
  },
  {
    name: 'Supplier',
    route: 'suppliers',
    fields: [
      { name: 'name', label: 'Nome do Fornecedor', type: 'text', required: true },
      { name: 'cnpj', label: 'CNPJ', type: 'text', required: false },
      { name: 'email', label: 'E-mail de Contato', type: 'email', required: false },
      { name: 'phone', label: 'Telefone', type: 'text', required: false },
    ]
  },
  {
    name: 'Project',
    route: 'projects',
    fields: [
      { name: 'name', label: 'Nome do Projeto', type: 'text', required: true },
      { name: 'description', label: 'Descrição', type: 'textarea', required: false },
      { name: 'priority', label: 'Prioridade', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      { name: 'status', label: 'Status', type: 'select', options: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELED'] },
    ]
  },
  {
    name: 'KnowledgeArticle',
    route: 'knowledge',
    fields: [
      { name: 'title', label: 'Título do Artigo', type: 'text', required: true },
      { name: 'category', label: 'Categoria', type: 'select', options: ['FAQ', 'TUTORIAL', 'POLICY', 'TROUBLESHOOTING'] },
      { name: 'content', label: 'Conteúdo', type: 'textarea', required: true },
    ]
  },
  {
    name: 'Booking',
    route: 'bookings',
    fields: [
      { name: 'purpose', label: 'Propósito / Motivo', type: 'text', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED'] },
    ]
  }
];

const appDir = path.join(__dirname, 'src', 'app', '(authenticated)');
const apiDir = path.join(__dirname, 'src', 'app', 'api');

modules.forEach(mod => {
  const modDir = path.join(appDir, mod.route, 'new');
  if (!fs.existsSync(modDir)) fs.mkdirSync(modDir, { recursive: true });

  const apiModDir = path.join(apiDir, mod.route);
  if (!fs.existsSync(apiModDir)) fs.mkdirSync(apiModDir, { recursive: true });

  // 1. Generate Form Component
  const formStateObj = mod.fields.reduce((acc, f) => {
    acc[f.name] = f.type === 'number' ? 0 : (f.options ? f.options[0] : '');
    return acc;
  }, {});

  const formInputs = mod.fields.map(f => {
    if (f.type === 'select') {
      return `
          <div>
            <label className="block text-sm font-medium text-foreground">${f.label}${f.required ? ' *' : ''}</label>
            <select
              value={formData.${f.name}}
              onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              ${f.required ? 'required' : ''}
            >
              ${f.options.map(opt => `<option value="${opt}">${opt}</option>`).join('\n              ')}
            </select>
          </div>`;
    } else if (f.type === 'textarea') {
      return `
          <div className="col-span-full">
            <label className="block text-sm font-medium text-foreground">${f.label}${f.required ? ' *' : ''}</label>
            <textarea
              rows={4}
              value={formData.${f.name}}
              onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              ${f.required ? 'required' : ''}
            />
          </div>`;
    } else {
      return `
          <div className="col-span-full sm:col-span-1">
            <label className="block text-sm font-medium text-foreground">${f.label}${f.required ? ' *' : ''}</label>
            <input
              type="${f.type}"
              value={formData.${f.name}}
              onChange={(e) => setFormData({ ...formData, ${f.name}: ${f.type === 'number' ? 'Number(e.target.value)' : 'e.target.value'} })}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              ${f.required ? 'required' : ''}
            />
          </div>`;
    }
  }).join('');

  const formCode = `"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ${mod.name}Form() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(${JSON.stringify(formStateObj, null, 2)});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/${mod.route}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      router.push('/${mod.route}');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        ${formInputs}
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover disabled:opacity-50">
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
`;
  fs.writeFileSync(path.join(modDir, `${mod.name}Form.tsx`), formCode);

  // 2. Generate Page Component
  const pageCode = `import ${mod.name}Form from "./${mod.name}Form";

export default function New${mod.name}Page() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">Novo Registro (${mod.name})</h2>
        <p className="text-sm text-muted-foreground mt-1">Preencha os dados abaixo para cadastrar.</p>
      </div>
      <${mod.name}Form />
    </div>
  );
}
`;
  fs.writeFileSync(path.join(modDir, `page.tsx`), pageCode);

  // 3. Generate API Route
  // For simplicity, we assign a fake dummy or required relations dynamically if we can't infer them, 
  // but let's try to just use default string fields and bypass complex relations for the prototype.
  // Wait, if it fails due to missing company_id, we can inject it.
  const apiCode = `import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    
    // To satisfy Prisma required relations that aren't in the form
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) throw new Error("User not found");

    const dataToSave = { ...body };

    // Inject company_id and other relations if needed by schema:
    ${mod.name === 'Problem' ? 'dataToSave.company_id = user.company_id;\ndataToSave.code = "PB-" + Date.now();' : ''}
    ${mod.name === 'Change' ? 'dataToSave.company_id = user.company_id;\ndataToSave.requester_id = user.id;\ndataToSave.code = "CHG-" + Date.now();' : ''}
    ${mod.name === 'Contract' ? 'dataToSave.company_id = user.company_id;\ndataToSave.code = "CT-" + Date.now();\ndataToSave.start_date = new Date();\ndataToSave.end_date = new Date();\ndataToSave.supplier_id = (await prisma.supplier.findFirst({where: {company_id: user.company_id}}))?.id || "unknown";' : ''}
    ${mod.name === 'Supplier' ? 'dataToSave.company_id = user.company_id;' : ''}
    ${mod.name === 'Project' ? 'dataToSave.company_id = user.company_id;\ndataToSave.manager_id = user.id;\ndataToSave.code = "PRJ-" + Date.now();' : ''}
    ${mod.name === 'KnowledgeArticle' ? 'dataToSave.company_id = user.company_id;\ndataToSave.author_id = user.id;' : ''}
    ${mod.name === 'Booking' ? 'dataToSave.user_id = user.id;\ndataToSave.asset_id = (await prisma.asset.findFirst({where: {company_id: user.company_id}}))?.id || "unknown";\ndataToSave.start_time = new Date();\ndataToSave.end_time = new Date();' : ''}

    const newRecord = await prisma.${mod.name.charAt(0).toLowerCase() + mod.name.slice(1)}.create({
      data: dataToSave
    });

    return NextResponse.json(newRecord);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message, { status: 500 });
  }
}
`;
  fs.writeFileSync(path.join(apiModDir, `route.ts`), apiCode);
});
console.log("All missing CRUD components generated successfully.");
