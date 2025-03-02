import { cookies } from "next/headers";
import { ClientRoot } from "@/components/ClientRoot";
import { Profile } from "@/components/state/StateProvider";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken");

  let isAuthenticated: boolean | undefined = undefined;
  let profile: Profile | undefined = undefined;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        Cookie: `accessToken=${token?.value}`,
      },
    });
    if (res.ok) {
      isAuthenticated = res.ok;
      profile = await res.json();
    }
  } catch (error) {
    console.error(error);
  }

  return (
    <div>
      <main>
        <ClientRoot profile={profile} isAuthenticated={isAuthenticated} />
      </main>
    </div>
  );
}
