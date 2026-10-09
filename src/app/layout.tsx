import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SYNGETI - Sistema Integrado de Gestão de TI',
  description: 'Plataforma centralizada de ITSM, CMDB, e gestão de TI',
}

import { ThemeProvider } from "@/components/ThemeProvider";
import { getBranding } from "@/lib/branding";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const branding = getBranding();
  
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {branding?.favicon && <link rel="icon" href={branding.favicon} />}
      </head>
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
