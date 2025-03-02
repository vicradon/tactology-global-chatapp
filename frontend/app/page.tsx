import { cookies } from "next/headers";
import { ClientRoot } from "@/components/ClientRoot";
import { Profile } from "@/components/state/StateProvider";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken");

  let isAuthenticated = false;
  let profile: Profile = {
    username: "",
    id: 0,
    role: "",
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        Cookie: `accessToken=${token?.value}`,
      },
    });
    isAuthenticated = res.ok;
    profile = await res.json();
  } catch (error) {}

  return (
    <div>
      <main>
        <ClientRoot profile={profile} isAuthenticated={isAuthenticated} />
      </main>
    </div>
  );
}
