const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  // 1. Criar Empresa Padrão
  const company = await prisma.company.upsert({
    where: { cnpj: '00000000000100' },
    update: {},
    create: {
      corporate_name: 'Empresa Matriz',
      trade_name: 'SISGETI Inc',
      cnpj: '00000000000100',
      email: 'contato@sisgeti.com.br',
    },
  });

  // 2. Criar Local Padrão
  let location = await prisma.location.findFirst({ where: { company_id: company.id } });
  if (!location) {
    location = await prisma.location.create({
      data: {
        name: 'Matriz Principal',
        address: 'Av Central, 1000',
        company_id: company.id,
      },
    });
  }

  // 3. Criar Departamento Padrão
  let department = await prisma.department.findFirst({ where: { company_id: company.id } });
  if (!department) {
    department = await prisma.department.create({
      data: {
        name: 'Tecnologia da Informação',
        location_id: location.id,
        company_id: company.id,
      },
    });
  }

  // 4. Criar Perfis Base (Roles)
  const rolesToCreate = [
    { name: 'ADMINISTRADOR', description: 'Acesso total ao sistema', permissions: JSON.stringify({all: true}) },
    { name: 'GESTOR', description: 'Acesso administrativo focado', permissions: JSON.stringify({users: ['read', 'write'], assets: ['read', 'write', 'delete']}) },
    { name: 'TECNICO', description: 'Técnico de atendimento', permissions: JSON.stringify({tickets: ['read', 'write', 'delete'], assets: ['read', 'write']}) },
    { name: 'USUARIO', description: 'Acesso apenas às próprias requisições', permissions: JSON.stringify({tickets: ['read', 'write_own']}) },
  ];

  for (const r of rolesToCreate) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMINISTRADOR' } });

  // 5. Criar Usuário Admin Padrão
  const adminEmail = 'admin@sisgeti.com.br';
  const adminPassword = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador do Sistema',
      email: adminEmail,
      password_hash: adminPassword,
      job_title: 'Arquiteto de TI',
      role_id: adminRole.id,
      department_id: department.id,
      location_id: location.id,
      company_id: company.id,
    },
  });

  console.log("Seed finalizado com sucesso!");
  console.log("Credenciais de acesso:");
  console.log(`E-mail: ${adminEmail}`);
  console.log(`Senha: admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
