import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Must be authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Must have is_admin = 'YES' in public.users.
  //    Uses the service-role client so RLS never blocks the lookup.
  const adminSupabase = createAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[admin layout] is_admin lookup failed:", profileError.message);
  }

  if (profile?.is_admin !== "YES") {
    redirect("/dashboard");
  }

  return (
    // flex-col on mobile (top bar stacks above content)
    // flex-row on desktop (sidebar sits beside content)
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar email={user.email!} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
