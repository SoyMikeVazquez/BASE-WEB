import { redirect } from "next/navigation";

export default function Home() {
  // Por ahora redirigimos al login, en el futuro se validará la sesión
  redirect("/login");
}
