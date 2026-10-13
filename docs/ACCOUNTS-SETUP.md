# Accounts, trial & subscriptions — setup guide

The app already contains everything for login, free trials, locked content, CHIP payments and the admin screen.
It switches on **only after** you complete the steps below. Until then the site works exactly as before (no login, everything free).

You will create accounts with: **Supabase** (free), **CHIP** (Malaysian payment gateway) and each login provider you want.
Allow about 2–3 hours the first time. Do steps 1–6 with CHIP **test** keys, check everything works, then go live (step 9).

---

## 1. Create the Supabase project

1. Sign up at <https://supabase.com> → **New project**. Region: **Southeast Asia (Singapore)**. Save the database password somewhere safe.
2. Open **SQL Editor** → **New query**, paste the whole file
   [`supabase/migrations/20261013000000_accounts_and_subscriptions.sql`](../supabase/migrations/20261013000000_accounts_and_subscriptions.sql) and click **Run**.
   This creates the tables, the trial rules, two starter plans (Monthly RM 14.90, Yearly RM 119.00 — change them later in the admin screen) and the security rules.
3. **Project Settings → API**: copy the **Project URL**, the **anon public** key and the **service_role** key (keep this one secret — never put it in the app).

## 2. Login settings

In **Authentication → URL Configuration**:
- **Site URL:** `https://azrulsani.github.io/darstudies/`
- **Redirect URLs:** add `https://azrulsani.github.io/darstudies/` and (for testing on your PC) `http://localhost:5173/`

Then in **Authentication → Providers**, turn on the ones you want. Every provider asks for the same callback URL, shown on that page:
`https://<your-project>.supabase.co/auth/v1/callback`

| Provider | Where to create the keys | Notes |
|---|---|---|
| **Email link** | Already on | For real users, set up custom SMTP (Authentication → Emails); the built-in sender is heavily rate-limited. |
| **Google** | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web) | Add the callback URL as an authorised redirect URI. Fill in the OAuth consent screen. |
| **Microsoft** | Azure Portal → App registrations → New (accounts in any organisation + personal) | In Supabase this provider is called **Azure**. Use tenant URL `https://login.microsoftonline.com/common`. |
| **Facebook** | developers.facebook.com → Create app → Facebook Login | Needs a privacy-policy URL and app review before the public can use it. |
| **Apple** | developer.apple.com (needs the paid Apple Developer Program, USD 99/year) → Services ID + Sign in with Apple key | Follow Supabase's "Login with Apple" guide. |

You don't need all of them on day one. Step 5 lets you choose which buttons appear.

> Google, Facebook and Apple require a **privacy policy** page (and Malaysia's PDPA applies to the student data you collect). Prepare one before going live.

## 3. CHIP merchant account

1. Register at <https://portal.chip-in.asia> (needs SSM business registration). Turn on the payment methods you want: cards, FPX, DuitNow QR, e-wallets.
2. **Developers → Brands**: copy the **Brand ID**.
3. **Developers → API keys**: copy the **test** secret key for now.

## 4. Deploy the payment functions

On your PC, in the project folder (needs Node.js):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>          # the ref is in your project URL
npx supabase secrets set CHIP_SECRET_KEY=<test secret key> CHIP_BRAND_ID=<brand id> SITE_URL=https://azrulsani.github.io/darstudies/
npx supabase functions deploy checkout
npx supabase functions deploy chip-callback
npx supabase functions deploy admin-users
```

`chip-callback` is called by CHIP after a payment; it always re-checks the payment with CHIP before unlocking anything.

## 5. Connect GitHub

Repository → **Settings → Secrets and variables → Actions**:

- **Variables** tab:
  - `SUPABASE_URL` = your Project URL
  - `SUPABASE_ANON_KEY` = the anon public key
  - `AUTH_PROVIDERS` (optional) = the buttons to show, e.g. `google,azure,email`. Choose from `google,apple,facebook,azure,email`; default is all five.
- **Secrets** tab:
  - `SUPABASE_SERVICE_ROLE_KEY` = the service_role key (used only to upload lesson content)

Then **Actions → Deploy to GitHub Pages → Run workflow**. The deploy uploads all lesson content to Supabase and publishes the site with login switched on.

## 6. Make yourself admin

1. Open the site and sign in once.
2. In Supabase **SQL Editor** run (with your email):
   ```sql
   update profiles set is_admin = true where email = 'you@example.com';
   ```
3. Reload the app → **Me → Admin**. From there you can make other people admin too.

## 7. Test a payment (test mode)

1. Sign in with a second (non-admin) account → **Me → Subscribe** → choose a plan.
2. On CHIP's page pay with test card `4444 3333 2222 1111`, CVC `123`, any name, any future expiry.
3. You return to the app, which confirms the payment and unlocks everything. The payment and subscription appear in **Admin**.

## 8. What the admin screen does

| Tab | Use it to |
|---|---|
| Overview | Revenue this month / total, active and lapsed subscriptions, users on trial, latest payments |
| Users | Search, see each user's status, change trial end date, give/extend/cancel a subscription, make admin, delete a user, export CSV |
| Subscriptions | All subscriptions, expiring within 7 days, lapsed; edit or remove; export CSV |
| Payments | Every payment attempt with status and method; mark refunded; export CSV (refund the money itself in the CHIP portal) |
| Plans | Add, edit, hide or delete plans (name, price, number of days) |
| Trial & access | Trial length; which subjects and features are open during the trial and after it ends |

Defaults: 7-day trial with all subjects, but only **Learn, Quiz and Planner** (flashcards, formula drill and tools locked). After the trial, everything is locked until the user subscribes.

## 9. Go live

1. In CHIP, copy the **live** secret key.
2. `npx supabase secrets set CHIP_SECRET_KEY=<live secret key>` — no redeploy needed.
3. Do one real low-value payment yourself to confirm, then refund it from the CHIP portal.

## How renewals work

FPX online banking and Malaysian e-wallets do not support automatic recurring charges, so each plan is a **pass** for a number of days.
Users renew by paying again. Paying before the pass ends adds the new days on top of the time left.
The app shows a countdown banner when access is about to end or has ended.

## Troubleshooting

- **Login button returns to a blank page / error** → the Site URL or Redirect URLs in step 2 don't match the site address exactly (including `/darstudies/`).
- **"Could not start the payment"** → check `CHIP_SECRET_KEY` / `CHIP_BRAND_ID` and the function logs (Supabase → Edge Functions → checkout → Logs).
- **Paid but still locked** → open Admin → Payments. If the payment is still *pending*, CHIP has not confirmed it yet. The app keeps checking for 2 minutes after the user returns, and CHIP keeps retrying the callback for up to 36 hours. You can also give access by hand under Users.
- **Lessons don't load** → the "Upload protected content" step in the GitHub Action failed. Check that `SUPABASE_SERVICE_ROLE_KEY` is set.
