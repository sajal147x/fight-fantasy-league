import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === process.env.SCRIPT_SECRET;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─── Email template ───────────────────────────────────────────────────────────

function buildHtml(eventName: string, eventDate: string | null, userName: string | null, eventImageUrl: string | null, picksMade: number, totalFights: number): string {
  const dateLine = eventDate
    ? `<p style="margin:0 0 6px;font-size:15px;color:#94a3b8;">${formatDate(eventDate)}</p>`
    : "";

  const greeting = userName ? `Hey ${userName},` : "Hey,";

  const bannerImage = eventImageUrl
    ? `<img src="${eventImageUrl}" alt="${eventName}" style="width:100%;border-radius:8px;margin-bottom:20px;display:block;">`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr><td style="padding-bottom:28px;">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b82f6;">
            Fantasy Fight League
          </p>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#111827;border-radius:12px;border:1px solid #1f2937;padding:32px;">

          ${bannerImage}

          <!-- Event badge -->
          <div style="display:inline-block;background:#1e3a5f;border:1px solid #3b82f6;border-radius:6px;padding:4px 12px;margin-bottom:20px;">
            <span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#60a5fa;">Upcoming Event</span>
          </div>

          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f1f5f9;line-height:1.25;">
            ${eventName}
          </h1>
          ${dateLine}

          <hr style="border:none;border-top:1px solid #1f2937;margin:20px 0;">

          <p style="margin:0 0 12px;font-size:15px;color:#cbd5e1;line-height:1.6;">
            ${greeting}
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#cbd5e1;">
            You've made <strong style="color:#3b82f6;">${picksMade} of ${totalFights} picks</strong> for this event.
            ${picksMade === totalFights ? '✅ You\'re all set!' : '⚠️ Don\'t miss out — finish your picks before they lock!'}
          </p>
          <p style="margin:0 0 20px;font-size:15px;color:#cbd5e1;line-height:1.6;">
            Don't forget to lock in your picks before the action starts.
            <strong style="color:#f1f5f9;">Picks lock 1 hour before the event</strong> — make sure you're ready.
          </p>

          <!-- CTA -->
          <a href="https://thefantasyfightleague.com/dashboard"
             style="display:inline-block;background:#3b82f6;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;letter-spacing:.02em;">
            Make Your Picks →
          </a>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4b5563;">
            You're receiving this because you're a member of Fantasy Fight League.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  // 1. Find next upcoming event
  const { data: eventData, error: eventError } = await db
    .from("events")
    .select("id, name, date, image_url")
    .eq("status", "upcoming")
    .order("date", { ascending: true })
    .limit(1)
    .single();

  if (eventError || !eventData) {
    return NextResponse.json({ message: "No upcoming events found." });
  }

  const event = eventData as { id: string; name: string; date: string | null; image_url: string | null };

  // 2. Fetch non-cancelled fights for this event
  const { data: fightData, error: fightError } = await db
    .from("fights")
    .select("id")
    .eq("event_id", event.id)
    .neq("status", "cancelled");

  if (fightError) {
    return NextResponse.json({ error: fightError.message }, { status: 500 });
  }

  const fightIds = (fightData ?? []).map((f: { id: string }) => f.id);
  const totalFights = fightIds.length;

  // Build a map of user_id → picks_made for this event
  const picksMap = new Map<string, number>();
  if (fightIds.length > 0) {
    const { data: picksData, error: picksError } = await db
      .from("picks")
      .select("user_id")
      .in("fight_id", fightIds);

    if (picksError) {
      return NextResponse.json({ error: picksError.message }, { status: 500 });
    }

    for (const pick of picksData ?? []) {
      picksMap.set(pick.user_id, (picksMap.get(pick.user_id) ?? 0) + 1);
    }
  }

  // 4. Fetch all auth users and public profiles in parallel
  const [{ data: authData }, { data: profileData, error: profileError }] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("users").select("id, name"),
  ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Build name map from public.users
  const nameMap = new Map<string, string | null>(
    (profileData ?? []).map((u: { id: string; name: string | null }) => [u.id, u.name])
  );

  // Merge: use auth email + public name
  const users = (authData?.users ?? [])
    .filter((u) => !!u.email)
    .map((u) => ({ id: u.id, email: u.email!, name: nameMap.get(u.id) ?? null }));

  if (users.length === 0) {
    return NextResponse.json({ event: event.name, emailsSent: 0, errors: [] });
  }

  // 5. Create SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // 6. Send emails sequentially with 200ms delay
  let emailsSent = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      await transporter.sendMail({
        from: "Fantasy Fight League <sajal@thefantasyfightleague.com>",
        to: user.email,
        subject: `⚡ Don't forget your picks — ${event.name}`,
        html: buildHtml(event.name, event.date, user.name, event.image_url ?? null, picksMap.get(user.id) ?? 0, totalFights),
      });
      emailsSent++;
    } catch (err) {
      errors.push(`${user.email}: ${err instanceof Error ? err.message : String(err)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return NextResponse.json({ event: event.name, emailsSent, errors });
}
