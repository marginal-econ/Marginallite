/**
 * Automated Waitlist Inviter & Email Dispatcher
 *
 * Allows inviting users migrated from the old waitlist into Marginalite.
 * Generates official Supabase Auth invitation links and dispatches
 * personalized emails via Mailjet (or prints direct magic links).
 *
 * Usage:
 *   # 1. Preview all pending waitlist members without sending:
 *   npx tsx scripts/invite-waitlist-users.ts --dry-run
 *
 *   # 2. Invite a specific email:
 *   npx tsx scripts/invite-waitlist-users.ts --email student@example.com
 *
 *   # 3. Invite all waiting members in bulk:
 *   npx tsx scripts/invite-waitlist-users.ts --all
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const TARGET_URL = process.env.BACKEND_URL || "https://tmuhpnorjydfijjotvoc.supabase.co";
const TARGET_KEY = process.env.BACKEND_SERVICE_ROLE_KEY || "";
const SITE_URL = process.env.PUBLIC_SITE_URL || "https://marginalite.workers.dev";
const MAILJET_API_KEY = process.env.MAILJET_API_KEY || "";
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || "";
const MAILJET_SENDER_EMAIL = process.env.MAILJET_SENDER_EMAIL || "marginal.econ.ai@gmail.com";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isAll = args.includes("--all");
const targetEmail = args.find((a, i) => args[i - 1] === "--email") || "";

const supabase = createClient(TARGET_URL, TARGET_KEY, {
  auth: { persistSession: false },
});

async function sendEmail(member: { email: string; name: string | null }, actionLink: string) {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    console.log(`ℹ️ [No Mailjet Keys] Using Supabase Auth native email delivery...`);

    const { data: usersData } = await supabase.auth.admin.listUsers();
    const isExistingUser = usersData?.users?.some((u) => u.email?.toLowerCase() === member.email.toLowerCase());

    if (isExistingUser) {
      const otpRes = await supabase.auth.signInWithOtp({
        email: member.email,
        options: {
          emailRedirectTo: `${SITE_URL}/auth`,
        },
      });
      if (!otpRes.error) {
        console.log(`   📨 Magic Login Link Email delivered to inbox: ${member.email}`);
      } else {
        console.warn(`   ⚠️ Supabase email dispatch: ${otpRes.error.message}`);
      }
    } else {
      const inviteRes = await supabase.auth.admin.inviteUserByEmail(member.email, {
        redirectTo: `${SITE_URL}/auth`,
        data: { full_name: member.name || "" },
      });
      if (!inviteRes.error) {
        console.log(`   📨 Official Invitation Email delivered to inbox: ${member.email}`);
      } else {
        console.warn(`   ⚠️ Supabase email dispatch: ${inviteRes.error.message}`);
      }
    }

    console.log(`   Direct Action Link:\n   ${actionLink}\n`);
    return true;
  }

  const firstName = member.name ? member.name.trim().split(/\s+/)[0] : "there";
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString("base64")}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: MAILJET_SENDER_EMAIL, Name: "Marginalite" },
          To: [{ Email: member.email, Name: member.name || undefined }],
          Subject: "Your access invitation to Marginalite (Cambridge IGCSE Economics 0455)",
          TextPart: `Hi ${firstName},\n\nYou have been invited to Marginalite. Choose a password and start your revision here:\n\n${actionLink}\n\n— Marginalite`,
          HTMLPart: `
            <div style="font-family: sans-serif; background: #fdf2f8; padding: 32px 16px; color: #181323;">
              <div style="max-width: 540px; margin: 0 auto; background: #fff; border: 2px solid #21172d; border-radius: 20px; padding: 32px; box-shadow: 6px 6px 0 #21172d;">
                <h2 style="color: #ec4899; margin-top: 0;">Welcome to Marginalite, ${firstName}!</h2>
                <p style="font-size: 16px; line-height: 1.6;">You've been invited to use Marginalite for Cambridge IGCSE Economics (0455). Click below to create your password and access your student account.</p>
                <div style="margin: 28px 0;">
                  <a href="${actionLink}" style="background: #ec4899; color: white; padding: 14px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; border: 2px solid #21172d; box-shadow: 3px 3px 0 #21172d; display: inline-block;">Set Up My Account →</a>
                </div>
                <p style="font-size: 12px; color: #777;">This invitation is intended for ${member.email}. If you did not request this, you can ignore this email.</p>
              </div>
            </div>
          `,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`❌ Mailjet failed for ${member.email}:`, errText);
    return false;
  }
  return true;
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`📧 Marginalite Waitlist Access Invitation Studio`);
  console.log(`🎯 Database: ${TARGET_URL}`);
  console.log(`🌐 Public Site: ${SITE_URL}`);
  console.log(`======================================================\n`);

  let query = supabase.from("waitlist").select("*").order("created_at", { ascending: false });
  if (targetEmail) {
    query = query.eq("email", targetEmail);
  }

  const { data: members, error } = await query;
  if (error) {
    console.error("❌ Failed to query waitlist:", error.message);
    process.exit(1);
  }

  if (!members || members.length === 0) {
    console.log("No waitlist members found.");
    return;
  }

  console.log(`Found ${members.length} waitlist records.`);

  if (isDryRun) {
    console.log(`\n[DRY RUN PREVIEW] Listing all 48 migrated members:`);
    members.forEach((m, idx) => {
      console.log(`  ${idx + 1}. ${m.email} (${m.name || "Unknown"}) — Status: [${m.status}] — Location: ${m.city || "N/A"}, ${m.country || "N/A"}`);
    });

    console.log(`\n======================================================`);
    console.log(`✉️  WHAT INVITATION WILL GO TO THE CANDIDATE:`);
    console.log(`======================================================`);
    console.log(`FROM:    Marginalite <${MAILJET_SENDER_EMAIL}>`);
    console.log(`SUBJECT: Your access invitation to Marginalite (Cambridge IGCSE Economics 0455)`);
    console.log(`\nBODY PREVIEW:`);
    console.log(`------------------------------------------------------`);
    console.log(`Welcome to Marginalite, [Student Name]!`);
    console.log(``);
    console.log(`You've been invited to use Marginalite for Cambridge IGCSE`);
    console.log(`Economics (0455). Click below to create your password and access`);
    console.log(`your student account:`);
    console.log(``);
    console.log(`  👉 [Set Up My Account →]`);
    console.log(`  Link: https://marginalite.workers.dev/auth?...`);
    console.log(``);
    console.log(`This invitation is intended for [email].`);
    console.log(`------------------------------------------------------`);
    console.log(`\nTo send invites or print links, run:`);
    console.log(`  - Single candidate: npx tsx scripts/invite-waitlist-users.ts --email <email>`);
    console.log(`  - All candidates:   npx tsx scripts/invite-waitlist-users.ts --all`);
    console.log(`======================================================\n`);
    return;
  }

  for (const m of members) {
    if (!isAll && m.email !== targetEmail) continue;

    console.log(`Processing invitation for: ${m.email} (${m.name || "Member"})...`);

    try {
      let generated = await supabase.auth.admin.generateLink({
        type: "invite",
        email: m.email,
        options: {
          redirectTo: `${SITE_URL}/auth`,
          data: { full_name: m.name || "" },
        },
      });

      if (!generated.data?.properties?.action_link) {
        generated = await supabase.auth.admin.generateLink({
          type: "recovery",
          email: m.email,
          options: {
            redirectTo: `${SITE_URL}/auth`,
          },
        });
      }

      if (!generated.data?.properties?.action_link) {
        generated = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: m.email,
          options: {
            redirectTo: `${SITE_URL}/auth`,
          },
        });
      }

      const tokenHash = generated.data?.properties?.hashed_token;
      const verificationType = generated.data?.properties?.verification_type || "invite";
      let actionLink = tokenHash
        ? `${SITE_URL}/auth?token_hash=${tokenHash}&type=${verificationType}`
        : generated.data?.properties?.action_link;

      if (!actionLink) {
        console.warn(`   ⚠️ Could not generate action link for ${m.email}:`, generated.error?.message);
        continue;
      }

      const sent = await sendEmail(m, actionLink);
      if (sent) {
        await supabase.from("waitlist").update({ status: "invited" }).eq("id", m.id);
        console.log(`   ✅ Successfully invited ${m.email} and updated status to 'invited'.`);
      }
      await new Promise((res) => setTimeout(res, 300));
    } catch (err: any) {
      console.error(`   ❌ Error inviting ${m.email}:`, err.message);
    }
  }

  console.log(`\n🎉 Invitation process completed!`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
