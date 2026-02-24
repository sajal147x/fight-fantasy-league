import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">
          Fight Fantasy League
        </h1>
        <p className="text-muted-foreground">
          Welcome back,{" "}
          <span className="font-medium text-foreground">{user.email}</span>
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
