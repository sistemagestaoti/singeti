import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'sqlite.db');

const client = createClient({
  url: `file:${dbPath}`,
});

async function main() {
  console.log("Creating tables...");
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'USER',
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      requester_id TEXT,
      assigned_to_id TEXT,
      priority TEXT DEFAULT 'NORMAL',
      status TEXT DEFAULT 'OPEN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ticket_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert Mock Admin if not exists
  try {
    await client.execute(`
      INSERT INTO users (id, name, email, password_hash, role) 
      VALUES ('1', 'Administrador', 'admin', '$2a$10$xyz', 'ADMIN');
    `);
    console.log("Admin user created.");
  } catch (e) {
    console.log("Admin user already exists.");
  }

  // Insert some mock tickets to see on the dashboard
  try {
    await client.execute(`
      INSERT INTO tickets (id, title, description, requester_id, priority, status)
      VALUES 
      ('INC-2026-001', 'Sistema não liga', 'Ao apertar o botão nada acontece', '1', 'ALTA', 'OPEN'),
      ('INC-2026-002', 'Acesso bloqueado na VPN', 'Senha expirou', '1', 'NORMAL', 'IN_PROGRESS');
    `);
    console.log("Mock tickets created.");
  } catch (e) {
    console.log("Mock tickets might already exist.");
  }

  console.log("Database initialized successfully!");
}

main().catch(console.error);
