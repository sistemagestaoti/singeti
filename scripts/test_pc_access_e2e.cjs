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

async function runTests() {
  console.log("=== INICIANDO TESTE E2E DO MÓDULO GESTÃO DE ACESSOS A PCs ===");

  try {
    const company = await prisma.company.findFirst();
    if (!company) throw new Error("Empresa padrão não encontrada");

    // 1. Teste de Criação de Computador e Ativo
    console.log("\n[1/7] Testando criação de Ativo e Computador...");
    const internalId = `TEST-PC-${Date.now().toString().slice(-4)}`;
    const assetTag = `TAG-${Date.now().toString().slice(-4)}`;
    
    const asset = await prisma.asset.create({
      data: {
        internal_id: internalId,
        asset_tag: assetTag,
        name: "PC-FINANCEIRO-TESTE",
        type: "COMPUTER",
        status: "IN_USE",
        manufacturer: "Dell",
        model: "OptiPlex 7090",
        serial_number: "SN-TEST-8842",
        company_id: company.id,
      },
    });

    const computer = await prisma.computer.create({
      data: {
        asset_id: asset.id,
        hostname: "WS-FIN-TEST01",
        device_type: "DESKTOP",
        os_name: "Windows 11 Pro",
        os_version: "23H2",
        processor: "Intel Core i5-12400",
        memory_mb: 16384,
        storage_gb: 512,
        ip_address: "192.168.1.188",
        mac_address: "00:1A:2B:3C:4D:5E",
        domain_workgroup: "CORP.EMPRESA.LOCAL",
      },
    });
    console.log(`✓ Computador criado com sucesso: ${computer.hostname} (Asset: ${asset.internal_id}, ID: ${computer.id})`);

    // 2. Teste de Criação de Colaborador
    console.log("\n[2/7] Testando cadastro de Colaborador...");
    const collaborator = await prisma.pcCollaborator.create({
      data: {
        name: "Colaborador Teste Automatizado",
        employee_code: "MAT-9901",
        job_title: "Coordenador de Controladoria",
        department_name: "Financeiro",
        location_name: "Matriz Principal",
        email: `colaborador.teste.${Date.now()}@dlamb.ind.br`,
        phone: "(47) 98888-7777",
        status: "ACTIVE",
        company_id: company.id,
      },
    });
    console.log(`✓ Colaborador criado: ${collaborator.name} (${collaborator.employee_code})`);

    // 3. Teste de Vínculo de Utilização (Assignment)
    console.log("\n[3/7] Testando vínculo de utilização N:N (Assignment)...");
    const assignment = await prisma.pcUserAssignment.create({
      data: {
        computer_id: computer.id,
        collaborator_id: collaborator.id,
        is_primary: true,
        status: "ACTIVE",
        assigned_by: "Sistema de Testes",
        notes: "Vínculo de testes de homologação",
      },
    });
    console.log(`✓ Colaborador vinculado como Usuário Principal (Assignment ID: ${assignment.id})`);

    // 4. Teste Criptográfico do Cofre de Credenciais (AES-256-GCM)
    console.log("\n[4/7] Testando Cofre Seguro de Credenciais (AES-256-GCM)...");
    const rawSecret = "Senha@SuperForte!2026#Adm";
    const encrypted = encryptSecret(rawSecret);

    console.log("  - Ciphertext (Base64):", encrypted.ciphertext);
    console.log("  - IV (Hex):", encrypted.iv);
    console.log("  - Auth Tag (Hex):", encrypted.authTag);

    const vaultSecret = await prisma.vaultSecret.create({
      data: {
        title: `Credencial Admin - ${computer.hostname}`,
        encrypted_data: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        key_version: encrypted.keyVersion,
        secret_type: "LOCAL_ADMIN",
      },
    });

    const decrypted = decryptSecret({
      ciphertext: vaultSecret.encrypted_data,
      iv: vaultSecret.iv,
      authTag: vaultSecret.auth_tag,
    });

    if (decrypted !== rawSecret) {
      throw new Error(`Falha na descriptografia: esperado "${rawSecret}", obtido "${decrypted}"`);
    }
    console.log(`✓ Criptografia e descriptografia AES-256-GCM validadas com integridade 100%!`);

    // 5. Teste de Conta de Acesso ao Windows
    console.log("\n[5/7] Testando cadastro de Conta de Acesso associada ao Cofre...");
    const account = await prisma.pcAccount.create({
      data: {
        computer_id: computer.id,
        collaborator_id: collaborator.id,
        username: "admin.local",
        display_name: "Administrador de Manutenção",
        account_type: "LOCAL_ADMIN",
        domain: "WORKGROUP",
        status: "ACTIVE",
        vault_secret_id: vaultSecret.id,
        last_password_change: new Date(),
      },
    });
    console.log(`✓ Conta cadastrada: ${account.username} (Tipo: ${account.account_type}, Vault ID: ${account.vault_secret_id})`);

    // 6. Teste de E-mail Corporativo
    console.log("\n[6/7] Testando cadastro de E-mail Corporativo...");
    const emailAcc = await prisma.pcEmailAccount.create({
      data: {
        email_address: `controladoria.teste.${Date.now()}@dlamb.ind.br`,
        account_name: "Controladoria Geral",
        provider: "M365",
        account_type: "INDIVIDUAL",
        collaborator_id: collaborator.id,
        computer_id: computer.id,
        status: "ACTIVE",
        auth_method: "SSO_SAML",
        mfa_enabled: "YES",
      },
    });
    console.log(`✓ E-mail cadastrado: ${emailAcc.email_address} (MFA: ${emailAcc.mfa_enabled})`);

    // 7. Teste de Auditoria
    console.log("\n[7/7] Testando gravação de trilha de Auditoria...");
    const audit = await prisma.pcAccessAuditLog.create({
      data: {
        action: "CREATE_COMPUTER",
        entity_type: "COMPUTER",
        entity_id: asset.id,
        entity_name: asset.name,
        user_name: "Engenheiro Teste",
        status: "SUCCESS",
        details: "Computador e contas criados em teste automatizado",
      },
    });
    console.log(`✓ Log de auditoria persistido: ${audit.action} em ${audit.entity_name} (ID: ${audit.id})`);

    // Limpeza dos dados de teste
    console.log("\n[Limpeza] Removendo registros temporários de teste...");
    await prisma.pcAccessAuditLog.delete({ where: { id: audit.id } });
    await prisma.pcEmailAccount.delete({ where: { id: emailAcc.id } });
    await prisma.pcAccount.delete({ where: { id: account.id } });
    await prisma.vaultSecret.delete({ where: { id: vaultSecret.id } });
    await prisma.pcUserAssignment.delete({ where: { id: assignment.id } });
    await prisma.pcCollaborator.delete({ where: { id: collaborator.id } });
    await prisma.computer.delete({ where: { id: computer.id } });
    await prisma.asset.delete({ where: { id: asset.id } });
    console.log("✓ Limpeza concluída com sucesso!");

    console.log("\n=======================================================");
    console.log("🎉 TODOS OS TESTES E2E FORAM CONCLUÍDOS COM 100% DE SUCESSO!");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("❌ ERRO NO TESTE E2E:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
