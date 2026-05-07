import { redirect } from "next/navigation";

export default function NoPermissionPage() {
  redirect("/");
}
