import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  // Signed in users go to their cabana list, visitors see the sign-in page
  redirect(session ? "/cabanas" : "/sign-in");
}
