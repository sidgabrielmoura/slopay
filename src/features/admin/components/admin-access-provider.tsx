"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AdminSessionAccess } from "../admin-access";

const AdminAccessContext = createContext<AdminSessionAccess | undefined>(undefined);

export function AdminAccessProvider({ access, children }: { access?: AdminSessionAccess; children: ReactNode }) {
  return <AdminAccessContext.Provider value={access}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess() {
  const access = useContext(AdminAccessContext);
  return { access, can: (permission: string) => access?.permissions.includes(permission) ?? false };
}
