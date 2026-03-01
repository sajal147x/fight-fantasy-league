/**
 * One-time backfill: adds every existing user to the Global League.
 * Hit GET /admin/backfill-global-league once after deploying the Global League.
 *
 * Protected by BACKFILL_SECRET env var — set it before calling.
 * Usage: GET /admin/backfill-global-league?secret=<BACKFILL_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  // 1. Find the Global League
  const { data: league, error: leagueError } = await db
    .from("leagues")
    .select("id")
    .eq("invite_code", "GLOBAL")
    .single();

  if (leagueError || !league) {
    return NextResponse.json(
      { error: "Global league not found. Create it first with invite_code='GLOBAL'." },
      { status: 404 }
    );
  }

  // 2. Get all existing user IDs
  const { data: authData, error: authError } = await db.auth.admin.listUsers({
    perPage: 1000,
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const userIds = (authData?.users ?? []).map((u) => u.id);
  if (userIds.length === 0) {
    return NextResponse.json({ inserted: 0, message: "No users found." });
  }

  // 3. Upsert all users as members (ignore conflicts for already-enrolled users)
  const rows = userIds.map((userId) => ({
    league_id: league.id,
    user_id: userId,
    role: "member" as const,
  }));

  const { error: insertError } = await db
    .from("league_members")
    .upsert(rows, { onConflict: "league_id,user_id", ignoreDuplicates: true });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: userIds.length,
    message: `Backfill complete. ${userIds.length} user(s) added to Global League.`,
  });
}
