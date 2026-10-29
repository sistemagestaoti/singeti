import { jsPDF } from "jspdf";
import "jspdf-autotable";

export interface ManualPdfOptions {
  title: string;
  module: string;
  version: string;
  contentMarkdown: string;
}

/**
 * Gera um arquivo PDF vetorial, pesquisável, leve (menos de 200 KB) e profissional
 * utilizando o padrão visual institucional do SYNGETI.
 */
export function generateManualPdf(options: ManualPdfOptions): Uint8Array {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const primaryColor = [23, 101, 245] as const; // #1765F5 (Azul Syngeti)
  const darkTextColor = [20, 30, 45] as const;
  const mutedTextColor = [100, 116, 139] as const;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // --- CABEÇALHO MODERNO SYNGETI ---
  doc.setFillColor(23, 101, 245);
  doc.rect(0, 0, pageWidth, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SYNGETI", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("MANUAL OFICIAL • BASE DE CONHECIMENTO TI", margin, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`VERSÃO ${options.version.toUpperCase()}`, pageWidth - margin, 15, { align: "right" });

  // --- TÍTULO PRINCIPAL ---
  let cursorY = 36;
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(options.title, contentWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 7 + 2;

  // Linha divisória
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  // --- METADADOS (TAGS / MÓDULO) ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(`Módulo: ${options.module.toUpperCase()} | Status: Publicado | Sistema: SYNGETI ERP`, margin, cursorY);
  cursorY += 8;

  // --- PROCESSAMENTO DO CONTEÚDO MARKDOWN ---
  const lines = options.contentMarkdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) {
      cursorY += 3;
      continue;
    }

    // Se aproximar do rodapé, adiciona nova página
    if (cursorY > pageHeight - 25) {
      doc.addPage();
      // Repete cabeçalho simples
      doc.setFillColor(23, 101, 245);
      doc.rect(0, 0, pageWidth, 8, "F");
      cursorY = 20;
    }

    if (rawLine.startsWith("# ")) {
      // Ignora título duplicado
      continue;
    } else if (rawLine.startsWith("### ") || rawLine.startsWith("## ")) {
      cursorY += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const sectionTitle = rawLine.replace(/^###?\s+/, "");
      doc.text(sectionTitle, margin, cursorY);
      cursorY += 6;
    } else if (rawLine.startsWith("- ") || rawLine.startsWith("* ")) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      const bulletText = rawLine.replace(/^[-*]\s+/, "");
      const wrapped = doc.splitTextToSize(bulletText, contentWidth - 6);
      doc.circle(margin + 2, cursorY - 1, 0.8, "F");
      doc.text(wrapped, margin + 5, cursorY);
      cursorY += wrapped.length * 4.8;
    } else if (/^\d+\.\s/.test(rawLine)) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      const numMatch = rawLine.match(/^(\d+)\.\s+(.*)/);
      const num = numMatch ? numMatch[1] : "1";
      const itemText = numMatch ? numMatch[2] : rawLine;
      const wrapped = doc.splitTextToSize(itemText, contentWidth - 7);
      doc.setFont("helvetica", "bold");
      doc.text(`${num}.`, margin, cursorY);
      doc.setFont("helvetica", "normal");
      doc.text(wrapped, margin + 6, cursorY);
      cursorY += wrapped.length * 4.8;
    } else if (rawLine.startsWith("---")) {
      cursorY += 2;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 4;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      const cleanLine = rawLine.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`(.*?)`/g, "$1");
      const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
      doc.text(wrapped, margin, cursorY);
      cursorY += wrapped.length * 4.8;
    }
  }

  // --- RODAPÉ EM TODAS AS PÁGINAS ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text("SYNGETI • Sistema Integrado de Gestão de TI — Documentação Confidencial e Interna", margin, pageHeight - 7);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
