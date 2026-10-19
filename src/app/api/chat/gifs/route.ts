import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface GifItem {
  id: string;
  title: string;
  category: string;
  url: string;
  preview: string;
  tags: string[];
}

// Catálogo curado de GIFs animados de alta velocidade e qualidade (sem necessidade de API keys externas)
const CURATED_GIFS: GifItem[] = [
  // Comemoração & Sucesso
  {
    id: "gif_celebrate_1",
    title: "Comemoração e Confetes",
    category: "comemoracao",
    url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
    preview: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
    tags: ["festa", "parabens", "sucesso", "conquista", "comemorar", "confete"]
  },
  {
    id: "gif_celebrate_2",
    title: "Dança da Vitória",
    category: "comemoracao",
    url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif",
    preview: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif",
    tags: ["vitoria", "danca", "ganhou", "comemorar", "boa"]
  },
  {
    id: "gif_celebrate_3",
    title: "Palmas e Celebração",
    category: "comemoracao",
    url: "https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif",
    preview: "https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif",
    tags: ["parabens", "palmas", "yes", "consegui", "top"]
  },
  {
    id: "gif_celebrate_4",
    title: "Foguete Subindo",
    category: "comemoracao",
    url: "https://media.giphy.com/media/mi6DsSSNKDbUY/giphy.gif",
    preview: "https://media.giphy.com/media/mi6DsSSNKDbUY/giphy.gif",
    tags: ["foguete", "deploy", "producao", "subiu", "lancamento"]
  },

  // Joinha & Aprovado
  {
    id: "gif_thumbs_1",
    title: "Joinha Duplo",
    category: "joinha",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    preview: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    tags: ["ok", "joinha", "positivo", "aprovado", "beleza", "fechado"]
  },
  {
    id: "gif_thumbs_2",
    title: "Legal / Aprovado",
    category: "joinha",
    url: "https://media.giphy.com/media/GCvktC0KFy9l6/giphy.gif",
    preview: "https://media.giphy.com/media/GCvktC0KFy9l6/giphy.gif",
    tags: ["legal", "aprovado", "ok", "concordo", "certo"]
  },
  {
    id: "gif_thumbs_3",
    title: "Pode Deixar / Combinado",
    category: "joinha",
    url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
    preview: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
    tags: ["combinado", "ok", "entendido", "certo", "tranquilo"]
  },

  // TI, Código & Trabalho
  {
    id: "gif_tech_1",
    title: "Digitando Rápido no Teclado",
    category: "ti",
    url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif",
    preview: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif",
    tags: ["ti", "codigo", "digitando", "hacker", "trabalho", "suporte", "resolvendo"]
  },
  {
    id: "gif_tech_2",
    title: "Gato no Computador",
    category: "ti",
    url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
    preview: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
    tags: ["gato", "computador", "ti", "trabalhando", "teclado"]
  },
  {
    id: "gif_tech_3",
    title: "Café da Manhã TI",
    category: "ti",
    url: "https://media.giphy.com/media/oZEBLugoTdzxK/giphy.gif",
    preview: "https://media.giphy.com/media/oZEBLugoTdzxK/giphy.gif",
    tags: ["cafe", "coffee", "energia", "trabalho", "manha", "foco"]
  },
  {
    id: "gif_tech_4",
    title: "Deploy / Servidor Funcionando",
    category: "ti",
    url: "https://media.giphy.com/media/ule4akeXnY9fb432nG/giphy.gif",
    preview: "https://media.giphy.com/media/ule4akeXnY9fb432nG/giphy.gif",
    tags: ["deploy", "servidor", "ti", "nuvem", "sistema", "online"]
  },

  // Risadas & Memes
  {
    id: "gif_laugh_1",
    title: "Rindo Muito",
    category: "risos",
    url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif",
    preview: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif",
    tags: ["rindo", "risada", "kkk", "haha", "engracado", "meme"]
  },
  {
    id: "gif_laugh_2",
    title: "Gargalhada",
    category: "risos",
    url: "https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif",
    preview: "https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif",
    tags: ["gargalhada", "risos", "piada", "meme", "demais"]
  },

  // Aplausos
  {
    id: "gif_applause_1",
    title: "Aplausos Leonardo DiCaprio",
    category: "aplausos",
    url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
    preview: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
    tags: ["palmas", "aplausos", "parabens", "brinde", "leo", "cheers"]
  },
  {
    id: "gif_applause_2",
    title: "Palmas de Pé",
    category: "aplausos",
    url: "https://media.giphy.com/media/nbvFVEldHM4EVy2LYj/giphy.gif",
    preview: "https://media.giphy.com/media/nbvFVEldHM4EVy2LYj/giphy.gif",
    tags: ["palmas", "parabens", "reconhecimento", "show", "excelente"]
  },

  // Pensando / Analisando
  {
    id: "gif_thinking_1",
    title: "Pensando / Analisando",
    category: "pensando",
    url: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif",
    preview: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif",
    tags: ["pensando", "analisando", "ideia", "inteligente", "mindset"]
  },
  {
    id: "gif_thinking_2",
    title: "Cálculos e Fórmulas",
    category: "pensando",
    url: "https://media.giphy.com/media/4JVTF9fR99WYo/giphy.gif",
    preview: "https://media.giphy.com/media/4JVTF9fR99WYo/giphy.gif",
    tags: ["calculos", "conta", "pensando", "analise", "formula", "duvida"]
  },

  // Bom dia & Saudações
  {
    id: "gif_hello_1",
    title: "Tchauzinho / Olá",
    category: "saudacoes",
    url: "https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif",
    preview: "https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif",
    tags: ["ola", "oi", "bom dia", "boa tarde", "tchau", "acenando"]
  },
  {
    id: "gif_hello_2",
    title: "Bom Dia Café Quente",
    category: "saudacoes",
    url: "https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif",
    preview: "https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif",
    tags: ["bom dia", "cafe", "manha", "inicio", "trabalho"]
  }
];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  const category = searchParams.get("category")?.toLowerCase().trim();

  // Se houver uma chave da API Giphy configurada no ambiente pelo administrador, busca ao vivo
  const giphyKey = process.env.GIPHY_API_KEY;
  if (giphyKey) {
    try {
      const endpoint = q 
        ? `https://api.giphy.com/v1/gifs/search?api_key=${giphyKey}&q=${encodeURIComponent(q)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${giphyKey}&limit=24&rating=g`;

      const res = await fetch(endpoint, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
          const liveGifs: GifItem[] = data.data.map((item: any) => ({
            id: item.id,
            title: item.title || "GIF",
            category: "giphy",
            url: item.images?.downsized_medium?.url || item.images?.original?.url || item.url,
            preview: item.images?.fixed_height_small?.url || item.images?.preview_gif?.url || item.images?.downsized?.url,
            tags: [q || "trending"]
          }));
          return NextResponse.json(liveGifs);
        }
      }
    } catch (e) {
      console.warn("Falha ao consultar Giphy API, usando catálogo local curado:", e);
    }
  }

  // Filtragem no catálogo curado embutido
  let filtered = CURATED_GIFS;

  if (category && category !== "todos" && category !== "trending") {
    filtered = filtered.filter(g => g.category === category);
  }

  if (q) {
    filtered = filtered.filter(g => 
      g.title.toLowerCase().includes(q) || 
      g.tags.some(t => t.includes(q)) ||
      g.category.toLowerCase().includes(q)
    );
  }

  return NextResponse.json(filtered);
}
