import { redirect } from "next/navigation";
import { usersPath } from "@/features/users/user-access";

export default function NewUserPage() {
  redirect(usersPath);
}
