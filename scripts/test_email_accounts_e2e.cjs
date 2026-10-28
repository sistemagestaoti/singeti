const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

const MASTER_SECRET = 
  process.env.VAULT_MASTER_KEY || 
  process.env.NEXTAUTH_SECRET || 
  process.env.AUTH_SECRET || 
  "syngeti-enterprise-vault-secure-key-2026";
const VAULT_SALT = "syngeti-vault-gcm-salt-v1";

function getDerivedKey() {
  return crypto.pbkdf2Sync(MASTER_SECRET, VAULT_SALT, 100000, 32, "sha256");
}

function encryptSecret(plaintext) {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    keyVersion: 1,
  };
}

function decryptSecret(payload) {
  const key = getDerivedKey();
  const ivBuffer = Buffer.from(payload.iv, "hex");
  const authTagBuffer = Buffer.from(payload.authTag, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  let decrypted = decipher.update(payload.ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function runEmailTests() {
  console.log("=== INICIANDO TESTE DO MÓDULO DE CONTAS DE E-MAIL DOS DOMÍNIOS ===");

  try {
    const company = await prisma.company.findFirst();
    if (!company) throw new Error("Empresa padrão não encontrada");

    // 1. Criar Colaborador / Usuário Titular
    console.log("\n[1/4] Cadastrando Colaborador para o E-mail...");
    const collaborator = await prisma.pcCollaborator.create({
      data: {
        name: "Gerente de E-mails Teste",
        employee_code: "EMAIL-USR-01",
        job_title: "Gerente Operacional",
        department_name: "Operações",
        email: `gerente.${Date.now()}@dlamb.ind.br`,
        status: "ACTIVE",
        company_id: company.id,
      },
    });
    console.log(`✓ Colaborador criado: ${collaborator.name} (${collaborator.id})`);

    // 2. Criptografar Senha do E-mail no Cofre
    console.log("\n[2/4] Criptografando senha do e-mail com AES-256-GCM no Cofre...");
    const emailPassword = "SenhaForteEmail#2026@!";
    const encrypted = encryptSecret(emailPassword);

    const vaultSecret = await prisma.vaultSecret.create({
      data: {
        title: `Senha de E-mail: teste.operacional@dlamb.ind.br`,
        encrypted_data: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        key_version: 1,
        secret_type: "EMAIL_PASSWORD",
      },
    });
    console.log(`✓ Segredo salvo no cofre: ID ${vaultSecret.id}`);

    // 3. Cadastrar Conta de E-mail vinculada ao Domínio e Colaborador
    console.log("\n[3/4] Criando registro da Conta de E-mail vinculada ao Domínio @dlamb.ind.br...");
    const emailAccount = await prisma.pcEmailAccount.create({
      data: {
        email_address: `teste.operacional.${Date.now()}@dlamb.ind.br`,
        account_name: "Caixa Operacional",
        provider: "M365",
        account_type: "INDIVIDUAL",
        collaborator_id: collaborator.id,
        vault_secret_id: vaultSecret.id,
        status: "ACTIVE",
        auth_method: "SSO_SAML",
        mfa_enabled: "YES",
      },
    });
    console.log(`✓ Conta de E-mail criada: ${emailAccount.email_address}`);

    // 4. Testar Descriptografia e Revelação
    console.log("\n[4/4] Testando descriptografia da senha do e-mail...");
    const decryptedPassword = decryptSecret({
      ciphertext: vaultSecret.encrypted_data,
      iv: vaultSecret.iv,
      authTag: vaultSecret.auth_tag,
    });

    if (decryptedPassword !== emailPassword) {
      throw new Error(`Senha recuperada divergente! Esperado: ${emailPassword}, Obtido: ${decryptedPassword}`);
    }
    console.log(`✓ Senha do e-mail descriptografada com sucesso absoluto: "${decryptedPassword}"`);

    // Limpeza
    console.log("\n[Limpeza] Removendo dados de teste...");
    await prisma.pcEmailAccount.delete({ where: { id: emailAccount.id } });
    await prisma.vaultSecret.delete({ where: { id: vaultSecret.id } });
    await prisma.pcCollaborator.delete({ where: { id: collaborator.id } });
    console.log("✓ Limpeza concluída!");

    console.log("\n==================================================================");
    console.log("🎉 TESTE DE CONTAS DE E-MAIL DOS DOMÍNIOS CONCLUÍDO COM SUCESSO!");
    console.log("==================================================================\n");
  } catch (e) {
    console.error("❌ ERRO NO TESTE:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEmailTests();
