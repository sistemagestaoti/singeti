import { supabaseFetch } from '@/lib/supabase';

export async function getTickets() {
  try {
    // Busca os tickets ordenados
    const tickets = await supabaseFetch('/tickets?order=created_at.desc');
    
    // Como a relação nativa FK não foi estabelecida no script inicial simples do usuário,
    // buscamos os usuários manualmente (mock) ou da tabela users
    const users = await supabaseFetch('/users?select=id,name');
    const userMap = users.reduce((acc: any, user: any) => {
      acc[user.id] = user.name;
      return acc;
    }, {});

    return tickets.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      created_at: t.created_at,
      requester_name: userMap[t.requester_id] || 'Usuário Desconhecido'
    }));
  } catch (error) {
    console.error("Erro ao buscar tickets:", error);
    return [];
  }
}

export async function getTicketById(id: string) {
  try {
    const tickets = await supabaseFetch(`/tickets?id=eq.${id}`);
    if (!tickets || tickets.length === 0) return null;
    const ticket = tickets[0];

    // Busca o usuário
    const users = await supabaseFetch(`/users?id=eq.${ticket.requester_id}`);
    const requester_name = users && users.length > 0 ? users[0].name : 'Usuário Desconhecido';

    return {
      ...ticket,
      requester_name
    };
  } catch (error) {
    console.error("Erro ao buscar ticket por id:", error);
    return null;
  }
}

export async function getTicketComments(ticketId: string) {
  try {
    return await supabaseFetch(`/ticket_comments?ticket_id=eq.${ticketId}&order=created_at.asc`);
  } catch (error) {
    console.error("Erro ao buscar comentários do ticket:", error);
    return [];
  }
}
