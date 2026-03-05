import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeagueMemberRole = "owner" | "admin" | "member";

export type ScoringRulesetSummary = {
  id: string;
  name: string;
};

export type LeagueRow = {
  id: string;
  name: string;
  invite_code: string;
  scoring_ruleset_id: string | null;
  created_by: string;
  created_at: string;
  image_url: string | null;
};

export type LeagueWithMeta = LeagueRow & {
  role: LeagueMemberRole;
  member_count: number;
  scoring_rulesets: ScoringRulesetSummary | null;
};

export type CreateLeaguePayload = {
  name: string;
  invite_code: string;
  scoring_ruleset_id?: string | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all leagues the user is a member of, including their role,
 * total member count, and the league's default scoring ruleset.
 */
export async function getLeaguesForUser(
  userId: string
): Promise<LeagueWithMeta[]> {
  const db = createAdminClient();

  // Fetch every membership row for this user, joining the league and its ruleset.
  const { data, error } = await db
    .from("league_members")
    .select(
      `role,
       leagues (
         id, name, invite_code, scoring_ruleset_id, created_by, created_at, image_url,
         scoring_rulesets ( id, name )
       )`
    )
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  // Fetch member counts for all leagues in a single query.
  const leagueIds = (data ?? [])
    .map((row) => (row.leagues as unknown as { id: string } | null)?.id)
    .filter((id): id is string => !!id);

  const { data: countData, error: countError } = await db
    .from("league_members")
    .select("league_id")
    .in("league_id", leagueIds);

  if (countError) throw new Error(countError.message);

  const countMap: Record<string, number> = {};
  for (const { league_id } of countData ?? []) {
    countMap[league_id] = (countMap[league_id] ?? 0) + 1;
  }

  return (data ?? []).map((row) => {
    const league = row.leagues as unknown as LeagueRow & {
      scoring_rulesets: ScoringRulesetSummary | null;
    };
    return {
      ...league,
      role: row.role as LeagueMemberRole,
      member_count: countMap[league.id] ?? 0,
      scoring_rulesets: league.scoring_rulesets ?? null,
    };
  });
}

/** Returns a single league by id, or null if not found. */
export async function getLeagueById(
  leagueId: string
): Promise<LeagueRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("leagues")
    .select("id, name, invite_code, scoring_ruleset_id, created_by, created_at, image_url")
    .eq("id", leagueId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw new Error(error.message);
  }
  return data;
}

/** Returns all scoring rulesets ordered by name. */
export async function getScoringRulesets(): Promise<ScoringRulesetSummary[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("scoring_rulesets")
    .select("id, name")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Returns the role of a user in a specific league, or null if they are not
 * a member.
 */
export async function getMembershipForUser(
  leagueId: string,
  userId: string
): Promise<{ role: LeagueMemberRole } | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not a member
    throw new Error(error.message);
  }
  return { role: data.role as LeagueMemberRole };
}

export type LeagueMember = {
  userId: string;
  role: LeagueMemberRole;
  /** Email from auth.users, or userId as fallback. */
  email: string;
};

/**
 * Returns all members of a league with their roles and emails.
 * Owners are returned first (Postgres ORDER BY role sorts 'owner' < 'member'
 * alphabetically, so an explicit order is applied).
 */
export async function getMembersForLeague(
  leagueId: string
): Promise<LeagueMember[]> {
  const db = createAdminClient();

  const [{ data: rows, error }, { data: authData }] = await Promise.all([
    db
      .from("league_members")
      .select("user_id, role")
      .eq("league_id", leagueId)
      .order("role"), // 'owner' < 'member' alphabetically — owners first
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (error) throw new Error(error.message);

  const emailMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? u.id])
  );

  return (rows ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role as LeagueMemberRole,
    email: emailMap.get(m.user_id) ?? m.user_id,
  }));
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  picks_made: number;
  total_fights: number;
  total_points: number;
};

/**
 * Returns leaderboard stats for ALL league members ordered by total_points
 * descending. Members with zero picks are included with zeroed stats.
 *
 * When eventId is provided, scopes to fights in that event.
 * When omitted, aggregates across all events linked to the league.
 */
export async function getLeagueLeaderboard(
  leagueId: string,
  eventId?: string
): Promise<LeaderboardEntry[]> {
  const db = createAdminClient();

  // 1. Fetch all members with their profiles in one join
  const { data: memberRows, error: memberError } = await db
    .from("league_members")
    .select("user_id, users ( name, avatar_url )")
    .eq("league_id", leagueId);
  if (memberError) throw new Error(memberError.message);
  if (!memberRows || memberRows.length === 0) return [];

  const memberIds = memberRows.map((m) => m.user_id);

  // 2. Resolve fight IDs + total fight count
  let fightIds: string[] = [];
  let total_fights = 0;

  if (eventId) {
    const { data: fightData, error: fightError } = await db
      .from("fights")
      .select("id")
      .eq("event_id", eventId)
      .neq("status", "cancelled");
    if (fightError) throw new Error(fightError.message);
    fightIds = (fightData ?? []).map((f) => f.id);
    total_fights = fightIds.length;
  } else {
    // Collect all event IDs linked to this league
    const { data: leagueEventData, error: leagueEventError } = await db
      .from("league_events")
      .select("event_id")
      .eq("league_id", leagueId);
    if (leagueEventError) throw new Error(leagueEventError.message);

    const eventIds = (leagueEventData ?? []).map((r) => r.event_id);
    if (eventIds.length > 0) {
      const { data: fightData, error: fightError } = await db
        .from("fights")
        .select("id")
        .in("event_id", eventIds)
        .neq("status", "cancelled");
      if (fightError) throw new Error(fightError.message);
      fightIds = (fightData ?? []).map((f) => f.id);
      total_fights = fightIds.length;
    }
  }

  // 3. Fetch picks for all members (scoped to the resolved fight IDs)
  const statsMap = new Map<string, { picks_made: number; total_points: number }>();

  if (fightIds.length > 0) {
    const { data: picks, error: picksError } = await db
      .from("picks")
      .select("user_id, points_earned")
      .in("user_id", memberIds)
      .in("fight_id", fightIds);
    if (picksError) throw new Error(picksError.message);

    for (const pick of picks ?? []) {
      const s = statsMap.get(pick.user_id) ?? { picks_made: 0, total_points: 0 };
      s.picks_made += 1;
      const pts = (pick as { user_id: string; points_earned: number | null }).points_earned;
      if (pts != null) s.total_points += pts;
      statsMap.set(pick.user_id, s);
    }
  }

  // 4. Build result from members (everyone appears, zero defaults for no picks)
  return memberRows
    .map((m) => {
      const profile = m.users as unknown as { name: string | null; avatar_url: string | null } | null;
      const stats = statsMap.get(m.user_id) ?? { picks_made: 0, total_points: 0 };
      return {
        user_id: m.user_id,
        user_name: profile?.name ?? m.user_id,
        avatar_url: profile?.avatar_url ?? null,
        picks_made: stats.picks_made,
        total_fights,
        total_points: stats.total_points,
      };
    })
    .sort((a, b) => b.total_points - a.total_points);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Inserts a new league row.
 * A DB trigger is expected to insert the creator as an owner in league_members.
 */
export async function createLeague(
  payload: CreateLeaguePayload,
  userId: string
): Promise<{ id?: string; error?: string }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("leagues")
    .insert({ ...payload, created_by: userId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

/**
 * Finds a league by its invite code and adds userId as a member.
 * Returns the league id on success.
 */
export async function joinLeagueByInviteCode(
  inviteCode: string,
  userId: string
): Promise<{ leagueId?: string; error?: string }> {
  const db = createAdminClient();

  // Resolve the invite code to a league.
  const { data: league, error: leagueError } = await db
    .from("leagues")
    .select("id")
    .eq("invite_code", inviteCode)
    .single();

  if (leagueError) {
    if (leagueError.code === "PGRST116")
      return { error: "Invalid invite code." };
    return { error: leagueError.message };
  }

  const { error: insertError } = await db.from("league_members").insert({
    league_id: league.id,
    user_id: userId,
    role: "member",
  });

  if (insertError) {
    // Postgres unique_violation — the user is already a member.
    if (insertError.code === "23505")
      return { error: "You are already in this league." };
    return { error: insertError.message };
  }
  return { leagueId: league.id };
}

// ─── Image upload ─────────────────────────────────────────────────────────────

/**
 * Uploads a league image to the `leaguePictures` storage bucket as
 * `{leagueId}.{ext}`, then stores the resulting public URL in leagues.image_url.
 */
export async function updateLeagueImage(
  leagueId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const db = createAdminClient();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${leagueId}.${ext}`;

  // Convert to ArrayBuffer for reliable upload in the Node.js runtime
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await db.storage
    .from("leaguePictures")
    .upload(path, arrayBuffer, {
      upsert: true,
      contentType: file.type || `image/${ext}`,
    });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = db.storage.from("leaguePictures").getPublicUrl(path);

  const { error: updateError } = await db
    .from("leagues")
    .update({ image_url: urlData.publicUrl })
    .eq("id", leagueId);

  if (updateError) return { error: updateError.message };

  return { url: urlData.publicUrl };
}
