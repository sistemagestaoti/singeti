import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SINGETI - Sistema Integrado de Gestão de TI',
  description: 'Plataforma centralizada de ITSM, CMDB, e gestão de TI',
}

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="h-full text-foreground bg-background antialiased transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={['light', 'dark', 'tokyo-night', 'dlamb']}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
