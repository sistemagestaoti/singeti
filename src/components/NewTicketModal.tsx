"use client";

import { X, HeadphonesIcon } from "lucide-react";
import TicketForm from "@/app/(authenticated)/service-desk/new/TicketForm";

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTicket: any) => void;
  categories: any[];
  assets?: any[];
  departments: any[];
  users: any[];
  currentUserId: string;
}

export default function NewTicketModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  assets = [],
  departments,
  users,
  currentUserId,
}: NewTicketModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-surface-elevated/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <HeadphonesIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Novo Chamado (Service Desk)
              </h2>
              <p className="text-xs text-muted-foreground">
                Abertura instantânea sem recarregar a tela, com cadastro manual flexível e catálogo de itens.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-background/50">
          <TicketForm
            categories={categories}
            assets={assets}
            departments={departments}
            users={users}
            currentUserId={currentUserId}
            onClose={onClose}
            onSuccess={onSuccess}
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
}
