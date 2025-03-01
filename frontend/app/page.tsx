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

  try {
    const res = await fetch("http://localhost:3500/auth/profile", {
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
