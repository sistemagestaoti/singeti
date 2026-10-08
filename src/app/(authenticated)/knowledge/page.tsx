import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import RowActions from "./RowActions";

export default async function KnowledgePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const articles = await prisma.knowledgeArticle.findMany({
    include: {
      author: true,
    },
    orderBy: { view_count: 'desc' }
  });

  return (
    <div className="flex-1">
      

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Base de Conhecimento (Wiki TI)</h2>
            <Link 
              href="/knowledge/new" 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              + Novo Artigo
            </Link>
          </div>

          <div className="bg-card shadow-sm border border-border rounded-lg overflow-hidden">
            <ul role="list" className="divide-y divide-border">
              {articles.length === 0 ? (
                <li className="px-6 py-10 text-center text-muted-foreground">
                  Nenhum artigo publicado.
                </li>
              ) : (
                articles.map((article) => (
                  <li key={article.id} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-background sm:px-6">
                    <div className="flex min-w-0 gap-x-4">
                      <div className="min-w-0 flex-auto">
                        <p className="text-sm font-semibold leading-6 text-foreground">
                          <Link href={`/knowledge/${article.id}`}>
                            <span className="absolute inset-x-0 -top-px bottom-0" />
                            {article.title}
                          </Link>
                        </p>
                        <p className="mt-1 flex text-xs leading-5 text-muted-foreground">
                          <span className="relative truncate">Autor: {article.author.name}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-x-4">
                      <div className="hidden sm:flex sm:flex-col sm:items-end">
                        <p className="text-sm leading-6 text-foreground">{article.category}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Visualizações: {article.view_count}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
