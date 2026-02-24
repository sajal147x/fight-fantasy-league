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
         id, name, invite_code, scoring_ruleset_id, created_by, created_at,
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
    .select("id, name, invite_code, scoring_ruleset_id, created_by, created_at")
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
