import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "noreply@childrenevangelismministry.org.uk";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const application = payload.record;

    if (!application || payload.type !== "INSERT") {
      return new Response("ignored", { status: 200 });
    }

    const listingId = application.listing_id;

    // ── 1. Count total applications for this listing ────────
    const { count, error: countErr } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listingId);

    if (countErr) {
      console.error("Count error:", countErr);
      return new Response("count error", { status: 500 });
    }

    const total = count ?? 0;
    console.log(`Listing ${listingId} → ${total} applications`);

    // Only fire on multiples of 20
    if (total === 0 || total % 20 !== 0) {
      return new Response(
        JSON.stringify({ ok: true, total, milestone: false }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 2. Fetch listing + org ─────────────────────────────
    const { data: listing, error: listErr } = await supabase
      .from("internship_listings")
      .select("id, title, organisation_id")
      .eq("id", listingId)
      .single();

    if (listErr || !listing) {
      console.error("Listing fetch error:", listErr);
      return new Response("listing not found", { status: 200 });
    }

    const { data: org, error: orgErr } = await supabase
      .from("organisation_profiles")
      .select("id, name, contact_email, hr_manager_name")
      .eq("id", listing.organisation_id)
      .single();

    if (orgErr || !org) {
      console.error("Org fetch error:", orgErr);
      return new Response("org not found", { status: 200 });
    }

    // ── 3. Build content ───────────────────────────────────
    const title = `${total} Students Applied to "${listing.title}"`;
    const body =
      `Your listing "${listing.title}" has reached ${total} applicants! ` +
      `Log in to your InternLink dashboard to review all applications.`;

    // ── 4. Insert in-app notification ──────────────────────
    const { error: insertErr } = await supabase
      .from("org_notifications")
      .insert({
        org_id: org.id,
        type: "application_milestone",
        title,
        body,
        listing_id: listingId,
        read: false,
      });

    if (insertErr) {
      console.error("Insert org_notifications error:", insertErr);
    }

    // ── 5. Send email via Resend ───────────────────────────
    const hrName = org.hr_manager_name ?? org.name;
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: org.contact_email,
        subject: `🎯 ${total} Applicants for "${listing.title}"`,
        html: buildOrgEmail(hrName, org.name, listing.title, total),
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
    }

    console.log(
      `notify-application-milestone: milestone ${total} for listing ${listingId}`
    );

    return new Response(
      JSON.stringify({ ok: true, total, milestone: true, org_id: org.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-application-milestone unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function buildOrgEmail(
  hrName: string,
  orgName: string,
  listingTitle: string,
  total: number
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#0d1b3e 0%,#1e3a7a 100%);padding:32px;text-align:center;">
    <p style="color:#1aaf6b;font-size:12px;font-weight:700;letter-spacing:2px;margin:0 0 8px;">INTERNLINK ORGANISATION PORTAL</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">Application Milestone Reached! 🎯</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="color:#334155;font-size:15px;margin:0 0 20px;">Hi <strong>${hrName}</strong>,</p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px;">Great news for <strong>${orgName}</strong>! Your internship listing just hit a big milestone.</p>
    <div style="background:linear-gradient(135deg,#0d1b3e,#1e3a7a);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.6);font-size:13px;font-weight:600;margin:0 0 8px;letter-spacing:1px;">TOTAL APPLICANTS</p>
      <p style="color:#1aaf6b;font-size:56px;font-weight:900;margin:0;line-height:1;font-family:'Courier New',monospace;">${total}</p>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;font-weight:600;margin:12px 0 0;">${listingTitle}</p>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">You've received <strong>${total} applications</strong> for this listing. Head to your dashboard to review candidates and move them forward.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://internlink.app" style="display:inline-block;background:#1aaf6b;color:#fff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">Review Applications →</a>
    </div>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">You received this because you have an active listing on InternLink.<br/>© ${new Date().getFullYear()} InternLink. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
