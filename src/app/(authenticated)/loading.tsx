export default function AuthenticatedLoading() {
  return (
    <div className="flex flex-col gap-5 w-full animate-in fade-in duration-150">
      {/* Header Placeholder Estável */}
      <div className="h-16 w-full rounded-2xl bg-surface/40 border border-border/30 flex items-center justify-between px-6 animate-pulse">
        <div className="space-y-1.5">
          <div className="h-4 w-40 bg-muted/50 rounded-md"></div>
          <div className="h-3 w-64 bg-muted/30 rounded-md"></div>
        </div>
        <div className="h-8 w-28 bg-muted/40 rounded-xl"></div>
      </div>

      {/* Área de Conteúdo Suave sem Layout Shift */}
      <div className="min-h-[380px] w-full rounded-2xl bg-surface/20 border border-border/20 p-8 flex flex-col justify-center items-center gap-3 select-none">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium text-muted-foreground/80">Carregando módulo...</p>
      </div>
    </div>
  );
}
