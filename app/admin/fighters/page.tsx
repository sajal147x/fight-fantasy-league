import { createAdminClient } from "@/lib/supabase/admin";
import { FightersTable } from "./_components/fighters-table";

export default async function FightersPage() {
  const supabase = createAdminClient();
  const { data: fighters, error } = await supabase
    .from("fighters")
    .select("id, name, nickname, nationality, date_of_birth")
    .order("name");

  if (error) {
    console.error("[fighters page]", error.message);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Fighters
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage all fighters in the league.
        </p>
      </div>
      <FightersTable fighters={fighters ?? []} />
    </div>
  );
}
