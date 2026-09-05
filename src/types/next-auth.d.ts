import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      companyId: string;
      employeeId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    role: string;
    companyId: string;
    employeeId: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: string;
    companyId: string;
    employeeId: string | null;
  }
}

export {};
