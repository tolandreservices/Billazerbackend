# Billazer Backend – Setup (No-Code Friendly Guide)

This backend lets your site:
- Receive bill details
- Compare against XOOM (promo 3m + regular 9m) + your admin fees
- Save to Google Sheets
- Reply with ready-to-show HTML (results + calendar)
- Create partners via Stripe webhooks (unique ref codes)

## 0) Accounts you need
- Google (Sheets + Cloud)
- Stripe
- Vercel (hosting)
- GitHub (to host code)
- GoHighLevel (forms + calendar) or any calendar URL

## 1) Prepare Google Sheets
Create a spreadsheet with 3 tabs and share it with your service account (Editor).

**Admin Rates** (two columns A/B):
- Promo kWh Rate = 0.09
- Regular kWh Rate = 0.12
- Promo Gas GJ Rate = 1.69
- Regular Gas GJ Rate = 2.50
- Admin Fee – Electricity = 6.86
- Admin Fee – Gas = 0.00
- GST Rate = 0.05

**User Submissions** – leave empty; the API will append rows.

**Partners** – header row:
`Timestamp | Email | Plan | Ref Code | Calendar URL | Status`

Copy the Google Sheet ID from the URL.

## 2) Create a Google Service Account
- In Google Cloud Console → IAM → Service Accounts → New Service Account.
- Create a key (JSON). Copy the **client email** and **private key**.
- Open your Sheet → Share → add the service account email with **Editor** role.

## 3) Stripe
Create prices:
- $9.99/month, $99.90/year
- White-Label setup $597 (one-time)
- White-Label $57/month
Copy the **Price IDs**.

## 4) Deploy on Vercel (no coding)
- Create a GitHub repo, upload these files (from the ZIP).
- In Vercel → New Project → Import your repo.
- Add Environment Variables (from `.env.example`). Paste your keys/IDs.
- Deploy.

## 5) Set Stripe webhook
- In Stripe → Developers → Webhooks → Add endpoint: `https://YOUR_DOMAIN/api/stripe-webhook`
- Listen to `checkout.session.completed`
- Copy the webhook **Signing Secret** to `STRIPE_WEBHOOK_SECRET` in Vercel env vars → redeploy

## 6) Connect your site form
- From Lovable or GHL, POST JSON to `POST https://YOUR_DOMAIN/api/compute` with body:
```
{
  "name":"Alex",
  "email":"a@b.com",
  "phone":"555-5555",
  "provider":"Direct Energy",
  "kwhRate":0.145,
  "gjRate":4.20,
  "elecAdminFee":12.00,
  "gasAdminFee":10.00,
  "kwhUsage":800,
  "gjUsage":3,
  "ref":"BLZ-ALEX123"  // optional partner code
}
```
- The API replies with JSON containing an `html` field. Render it on your results page (or use the values separately).

## 7) Partner unique links
- After subscription via Stripe, the webhook writes a row to **Partners** with a **Ref Code**.
- Agents share links like `https://billazer.com/?ref=BLZ-ALEX123`.
- Your form should include that `ref` value when calling `/api/compute` so bookings route to their calendar.

You're live.
