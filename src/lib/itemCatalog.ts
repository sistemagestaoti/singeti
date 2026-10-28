import { prisma } from "@/lib/prisma";

const DEFAULT_ITEMS = [
  { name: "Mouse óptico sem fio USB", unit: "UN", category: "Hardware / Periférico", notes: "Acompanha pilha" },
  { name: "Teclado ABNT2 USB", unit: "UN", category: "Hardware / Periférico", notes: "Com teclado numérico" },
  { name: "Monitor 24 polegadas", unit: "UN", category: "Hardware / Periférico", notes: "Entrada HDMI e DisplayPort" },
  { name: "Cabo de rede Cat6 montado", unit: "UN", category: "Redes & Cabos", notes: "Patch cord 3 metros" },
  { name: "Cabo HDMI 2.0 blindado", unit: "UN", category: "Acessórios", notes: "2 metros" },
  { name: "Adaptador USB para Rede RJ45", unit: "UN", category: "Acessórios", notes: "Gigabit Ethernet" },
  { name: "Headset USB com cancelamento de ruído", unit: "UN", category: "Comunicação", notes: "Para reuniões e telefonia" },
  { name: "Filtro de linha 5 tomadas", unit: "UN", category: "Infraestrutura", notes: "Padrão ABNT 10A" },
  { name: "Toner Preto para Impressora", unit: "UN", category: "Consumíveis", notes: "Alta capacidade" },
  { name: "Memória RAM DDR4 16GB", unit: "UN", category: "Componentes", notes: "3200MHz" },
  { name: "SSD NVMe M.2 512GB", unit: "UN", category: "Componentes", notes: "Alta performance" },
];

let cachedCatalogItems: any[] | null = null;
let catalogCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateCatalogCache() {
  cachedCatalogItems = null;
  catalogCacheTime = 0;
}

export async function getUnifiedCatalogItems() {
  const now = Date.now();
  if (cachedCatalogItems && now - catalogCacheTime < CACHE_TTL_MS) {
    return cachedCatalogItems;
  }

  let items = await prisma.itemCatalog.findMany({
    orderBy: { name: "asc" }
  });

  if (items.length === 0) {
    try {
      await prisma.itemCatalog.createMany({
        data: DEFAULT_ITEMS,
        skipDuplicates: true,
      });
      items = await prisma.itemCatalog.findMany({
        orderBy: { name: "asc" }
      });
    } catch {}
  }

  cachedCatalogItems = items;
  catalogCacheTime = now;
  return items;
}
