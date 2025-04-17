import { redirect } from "next/navigation"

export default function Home() {
  // Use a more explicit redirect to ensure it works
  redirect("/guide")
}
