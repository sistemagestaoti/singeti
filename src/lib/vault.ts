import crypto from "crypto";
import { prisma } from "./prisma";

// Chave mestra obtida de variável de ambiente segura ou fallback derivado
const MASTER_SECRET = 
  process.env.VAULT_MASTER_KEY || 
  process.env.NEXTAUTH_SECRET || 
  process.env.AUTH_SECRET || 
  "syngeti-enterprise-vault-secure-key-2026";

const VAULT_SALT = "syngeti-vault-gcm-salt-v1";
const KEY_VERSION = 1;

// Deriva chave de 256 bits (32 bytes) com PBKDF2
function getDerivedKey(): Buffer {
  return crypto.pbkdf2Sync(MASTER_SECRET, VAULT_SALT, 100000, 32, "sha256");
}

export interface EncryptedSecretPayload {
  ciphertext: string; // Base64
  iv: string;         // Hex
  authTag: string;    // Hex
  keyVersion: number;
}

/**
 * Criptografa um segredo utilizando AES-256-GCM com IV aleatório de 12 bytes
 * e tag de autenticação de 16 bytes.
 */
export function encryptVaultSecret(plaintext: string): EncryptedSecretPayload {
  if (!plaintext) {
    throw new Error("Texto do segredo não pode ser vazio");
  }

  const key = getDerivedKey();
  const iv = crypto.randomBytes(12); // IV padrão recomendado para GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    keyVersion: KEY_VERSION,
  };
}

/**
 * Descriptografa um segredo utilizando AES-256-GCM e valida a tag de autenticação.
 */
export function decryptVaultSecret(payload: {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion?: number;
}): string {
  const { ciphertext, iv, authTag } = payload;
  if (!ciphertext || !iv || !authTag) {
    throw new Error("Dados de credencial corrompidos ou incompletos");
  }

  const key = getDerivedKey();
  const ivBuffer = Buffer.from(iv, "hex");
  const authTagBuffer = Buffer.from(authTag, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export interface AuditParams {
  action: string;
  entityType: "COMPUTER" | "ACCOUNT" | "EMAIL" | "COLLABORATOR" | "SECRET" | "INVENTORY";
  entityId?: string | null;
  entityName?: string | null;
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: "SUCCESS" | "DENIED" | "FAILED";
  details?: string | null;
}

/**
 * Registra eventos de auditoria de forma segura (NUNCA armazena senhas no log).
 */
export async function logPcAccessAudit(params: AuditParams) {
  try {
    await prisma.pcAccessAuditLog.create({
      data: {
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        entity_name: params.entityName || null,
        user_id: params.user?.id || null,
        user_name: params.user?.name || "Desconhecido",
        user_email: params.user?.email || null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
        status: params.status || "SUCCESS",
        details: params.details || null,
      },
    });
  } catch (error) {
    console.error("Falha ao gravar log de auditoria de acesso:", error);
  }
}
