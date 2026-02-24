import { FighterRow, getAllFighters} from "@/lib/db/fighters";
import {FightersTable} from "./_components/fighters-table";

export default async function FightersPage() {
  let fighters: FighterRow[];
  try {
    fighters = await getAllFighters();
  } catch (err) {
    console.error("[fighters page]", err);
    fighters = [];
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
      <FightersTable fighters={fighters} />
    </div>
  );
}
