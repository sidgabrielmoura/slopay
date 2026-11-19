import "server-only";

import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";

export async function requireBatchSession(path: string) {
  const user = await requireSession(path, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role !== "MERCHANT") notFound();
  return user;
}
