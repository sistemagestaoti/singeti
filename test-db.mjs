import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'sqlite.db');

const client = createClient({
  url: `file:${dbPath}`,
});

async function runTest() {
  console.log("🔍 AUDITORIA DO BANCO DE DADOS (E2E CHECK)\n");

  const users = await client.execute("SELECT id, name, role FROM users");
  console.log("👥 USUÁRIOS NO SISTEMA:");
  console.table(users.rows);

  const tickets = await client.execute("SELECT id, title, status, priority FROM tickets");
  console.log("\n🎫 CHAMADOS CADASTRADOS:");
  console.table(tickets.rows);

  const comments = await client.execute("SELECT ticket_id, author_name, content FROM ticket_comments");
  console.log("\n💬 TIMELINE DE ATENDIMENTO (COMENTÁRIOS):");
  console.table(comments.rows);
}

runTest().catch(console.error);
