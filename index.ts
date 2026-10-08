import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

// Use an absolute path or relative to project root
const dbPath = path.join(process.cwd(), 'sqlite.db');

const client = createClient({
  url: `file:${dbPath}`,
});

export const db = drizzle(client, { schema });
