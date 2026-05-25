import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "noreply@childrenevangelismministry.org.uk";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const listing = payload.record;

    if (!listing || payload.type !== "INSERT") {
      return new Response("ignored", { status: 200 });
    }

    // ── 1. Fetch org name ──────────────────────────────────
    const { data: orgData } = await supabase
      .from("organisation_profiles")
      .select("name, contact_email")
      .eq("id", listing.organisation_id)
      .single();

    const orgName = orgData?.name ?? "An organisation";

    // ── 2. Fetch all students ──────────────────────────────
    const { data: students, error: studErr } = await supabase
      .from("student_profiles")
      .select("id, email, first_name");

    if (studErr || !students || students.length === 0) {
      console.error("No students found or error:", studErr);
      return new Response("no students", { status: 200 });
    }

    const title = `New Internship: ${listing.title}`;
    const body =
      `${orgName} just posted a new internship — "${listing.title}". ` +
      `${listing.location ? `Location: ${listing.location}. ` : ""}` +
      `Open the InternLink app to apply!`;

    // ── 3. Insert in-app notifications for every student ───
    const notifRows = students.map((s: any) => ({
      student_id: s.id,
      type: "new_listing",
      title,
      body,
      listing_id: listing.id,
      read: false,
    }));

    const { error: insertErr } = await supabase
      .from("student_notifications")
      .insert(notifRows);

    if (insertErr) {
      console.error("Insert student_notifications error:", insertErr);
    }

    // ── 4. Send emails via Resend (batched, 100 per request) ──
    const BATCH_SIZE = 100;
    const emailPayload = students.map((s: any) => ({
      from: FROM_EMAIL,
      to: s.email,
      subject: `🎉 New Internship: ${listing.title}`,
      html: buildStudentEmail(s.first_name, listing, orgName),
    }));

    for (let i = 0; i < emailPayload.length; i += BATCH_SIZE) {
      const batch = emailPayload.slice(i, i + BATCH_SIZE);
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`Resend batch error (offset ${i}):`, err);
      }
    }

    console.log(
      `notify-new-listing: notified ${students.length} students for listing ${listing.id}`
    );

    return new Response(
      JSON.stringify({ ok: true, notified: students.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-new-listing unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function buildStudentEmail(firstName: string, listing: any, orgName: string): string {
  const salary =
    listing.salary_min && listing.salary_max
      ? `₦${listing.salary_min.toLocaleString()} – ₦${listing.salary_max.toLocaleString()}/month`
      : listing.salary_min
        ? `From ₦${listing.salary_min.toLocaleString()}/month`
        : "Unpaid / Not specified";

  const deadline = listing.deadline
    ? new Date(listing.deadline).toLocaleDateString("en-NG", {
      day: "numeric", month: "long", year: "numeric",
    })
    : "Open until filled";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#0d1b3e 0%,#1e3a7a 100%);padding:32px;text-align:center;">
    <p style="color:#1aaf6b;font-size:12px;font-weight:700;letter-spacing:2px;margin:0 0 8px;">INTERNLINK</p>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">New Internship Posted! 🎉</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="color:#334155;font-size:15px;margin:0 0 20px;">Hi <strong>${firstName}</strong>,</p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 24px;">A new internship just landed on InternLink. Don't miss your chance!</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
      <h2 style="color:#0d1b3e;font-size:18px;font-weight:800;margin:0 0 4px;">${listing.title}</h2>
      <p style="color:#3b6fd4;font-size:14px;font-weight:600;margin:0 0 16px;">${orgName}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${listing.location ? `<tr><td style="padding:4px 0;color:#64748b;font-size:13px;">📍 <strong>Location:</strong> ${listing.location}</td></tr>` : ""}
        ${listing.work_mode ? `<tr><td style="padding:4px 0;color:#64748b;font-size:13px;">💻 <strong>Work Mode:</strong> ${listing.work_mode}</td></tr>` : ""}
        ${listing.duration ? `<tr><td style="padding:4px 0;color:#64748b;font-size:13px;">⏱ <strong>Duration:</strong> ${listing.duration}</td></tr>` : ""}
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">💰 <strong>Salary:</strong> ${salary}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">📅 <strong>Deadline:</strong> ${deadline}</td></tr>
        ${listing.is_siwes ? `<tr><td style="padding:8px 0 0;"><span style="background:#fef9c3;color:#a16207;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">SIWES Eligible</span></td></tr>` : ""}
      </table>
    </div>
    ${listing.description ? `<p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;font-style:italic;">${listing.description.slice(0, 200)}${listing.description.length > 200 ? "..." : ""}</p>` : ""}
    <div style="text-align:center;margin:28px 0;">
      <a href="https://internlink.app" style="display:inline-block;background:#1aaf6b;color:#fff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;">View &amp; Apply Now →</a>
    </div>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">You received this because you're registered on InternLink.<br/>© ${new Date().getFullYear()} InternLink. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
