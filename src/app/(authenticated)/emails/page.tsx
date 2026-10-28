import { redirect } from "next/navigation";

export default function EmailsRedirectPage() {
  redirect("/pc-access?tab=emails");
}
