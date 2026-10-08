import SupplierForm from "./SupplierForm";

export default function NewSupplierPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">Novo Registro (Supplier)</h2>
        <p className="text-sm text-muted-foreground mt-1">Preencha os dados abaixo para cadastrar.</p>
      </div>
      <SupplierForm />
    </div>
  );
}
