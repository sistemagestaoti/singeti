export const prisma = {
  user: {
    findMany: async () => {
      return [
        {
          id: "1",
          name: "Administrador",
          email: "admin",
          job_title: "TI Corporativa",
          status: "ACTIVE",
          role: { name: "ADMINISTRADOR" },
          department: { name: "Tecnologia" }
        }
      ];
    },
    findUnique: async ({ where }: any) => {
      if (where.email === "admin") {
        return {
          id: "1",
          name: "Administrador",
          email: "admin",
          password_hash: "$2a$10$xyz", // mock
          role_id: "1",
          company_id: "1"
        };
      }
      return null;
    }
  },
  company: {
    findMany: async () => {
      return [
        {
          id: "1",
          corporate_name: "SINGETI Corporativo S/A",
          trade_name: "Matriz Administrativa",
          cnpj: "00.000.000/0001-00",
          email: "contato@SINGETI.com.br",
          phone: "(11) 9999-9999",
          status: "ACTIVE"
        }
      ];
    }
  },
  role: {
    findFirst: async () => null,
  },
  department: {
    findFirst: async () => null,
  },
  location: {
    findFirst: async () => null,
  }
};

