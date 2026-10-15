export default function AuthenticatedLoading() {
  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center animate-in fade-in duration-150">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-muted-foreground">Carregando módulo...</span>
      </div>
    </div>
  );
}
