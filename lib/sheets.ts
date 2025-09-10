import { google } from 'googleapis';

/* -------------------------------------------------------------------------- */
/*                       1) Read & sanitize environment                        */
/* -------------------------------------------------------------------------- */

const {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  SHEETS_SPREADSHEET_ID: RAW_SHEETS_ID,

  // Optional overrides for tab names (default to these if not provided)
  ADMIN_RATES_SHEET: RAW_ADMIN_RATES_SHEET = 'Admin Rates',
  USER_SUBMISSIONS_SHEET: RAW_USER_SUBMISSIONS_SHEET = 'User Submissions',
  PARTNERS_SHEET: RAW_PARTNERS_SHEET = 'Partners',

  // Optional default calendar
  DEFAULT_CALENDAR_URL: RAW_DEFAULT_CALENDAR_URL = '',
} = process.env as Record<string, string | undefined>;

export const SHEETS_SPREADSHEET_ID = (RAW_SHEETS_ID || '').trim();
export const ADMIN_RATES_SHEET = (RAW_ADMIN_RATES_SHEET || 'Admin Rates').trim();
export const USER_SUBMISSIONS_SHEET = (RAW_USER_SUBMISSIONS_SHEET || 'User Submissions').trim();
export const PARTNERS_SHEET = (RAW_PARTNERS_SHEET || 'Partners').trim();
export const DEFAULT_CALENDAR_URL = (RAW_DEFAULT_CALENDAR_URL || '').trim();

/** Fail fast with helpful messages if required values are missing */
if (!SHEETS_SPREADSHEET_ID) {
  throw new Error('SHEETS_SPREADSHEET_ID is missing or empty (check your Vercel env vars).');
}
if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is missing (check your Vercel env vars).');
}
if (!GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
  throw new Error(
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing (check your Vercel env vars).',
  );
}

/* -------------------------------------------------------------------------- */
/*                           2) Google Sheets client                           */
/* -------------------------------------------------------------------------- */

function getSheetsClient() {
  // Private keys on Vercel are usually stored with escaped newlines (\\n)
  const key = (GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/* -------------------------------------------------------------------------- */
/*                          3) Helpers & public API                            */
/* -------------------------------------------------------------------------- */

export type AdminRates = {
  promoKwh: number;
  regKwh: number;
  promoGj: number;
  regGj: number;
  ourElecAdmin: number; // Admin Fee – Electricity
  ourGasAdmin: number;  // Admin Fee – Gas
  gst: number;
};

/**
 * Reads the "Admin Rates" tab (or the override name) as key:value pairs.
 * Expected layout: two columns like A=Key, B=Value.
 * Example keys (case-sensitive):
 *   - "Promo kWh Rate"
 *   - "Regular kWh Rate"
 *   - "Promo Gas GJ Rate"  (or "Promo GJ Rate")
 *   - "Regular Gas GJ Rate" (or "Regular GJ Rate")
 *   - "Admin Fee – Electricity"
 *   - "Admin Fee – Gas"
 *   - "GST Rate"
 */
export async function getAdminRates(): Promise<AdminRates> {
  const sheets = getSheetsClient();

  // Read a reasonable range; increase if you add more rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_SPREADSHEET_ID,
    range: `${ADMIN_RATES_SHEET}!A1:B100`,
  });

  const rows = (res.data.values || []) as string[][];
  const map: Record<string, string> = {};
  for (const [k, v] of rows) {
    if (typeof k === 'string') map[k.trim()] = (v ?? '').toString().trim();
  }

  // Tolerate a couple of alternative key names people commonly use
  const promoGj =
    Number(map['Promo Gas GJ Rate'] ?? map['Promo GJ Rate'] ?? 0);
  const regGj =
    Number(map['Regular Gas GJ Rate'] ?? map['Regular GJ Rate'] ?? 0);

  return {
    promoKwh: Number(map['Promo kWh Rate'] ?? 0),
    regKwh: Number(map['Regular kWh Rate'] ?? 0),
    promoGj,
    regGj,
    ourElecAdmin: Number(map['Admin Fee – Electricity'] ?? 0),
    ourGasAdmin: Number(map['Admin Fee – Gas'] ?? 0),
    // If GST is not on the sheet, allow fallback to GST_DEFAULT env or use 0.05
    gst: Number(map['GST Rate'] ?? process.env.GST_DEFAULT ?? 0.05),
  };
}

/**
 * Append a single row to the "User Submissions" sheet.
 * Pass a plain array that matches your column order. Example:
 *   appendSubmission([timestamp, name, email, ...])
 */
export async function appendSubmission(row: any[]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_SPREADSHEET_ID,
    range: `${USER_SUBMISSIONS_SHEET}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

/**
 * Adds a partner (or logs the latest status) to the "Partners" sheet.
 * Columns example (A:Z): Timestamp | Email | Plan | Ref Code | Calendar URL | Status
 */
export async function upsertPartner(params: {
  email: string;
  plan: string;
  refCode: string;
  calendarUrl: string;
  status: 'Active' | 'Canceled';
}) {
  const { email, plan, refCode, calendarUrl, status } = params;
  const sheets = getSheetsClient();
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_SPREADSHEET_ID,
    range: `${PARTNERS_SHEET}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[now, email, plan, refCode, calendarUrl, status]] },
  });
}

/**
 * Looks up a calendar URL for a given referral code in the "Partners" sheet.
 * If the columns aren't found or the code doesn't match, returns DEFAULT_CALENDAR_URL.
 */
export async function getCalendarForRef(refCode?: string | null): Promise<string> {
  const safeDefault = DEFAULT_CALENDAR_URL || '';
  if (!refCode) return safeDefault;

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_SPREADSHEET_ID,
    range: `${PARTNERS_SHEET}!A1:F1000`,
  });

  const rows = (res.data.values || []) as string[][];
  if (!rows.length) return safeDefault;

  const header = rows[0] || [];
  const refIdx = header.indexOf('Ref Code');
  const calIdx = header.indexOf('Calendar URL');

  if (refIdx === -1 || calIdx === -1) return safeDefault;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row?.[refIdx] === refCode) {
      const url = (row?.[calIdx] || '').toString().trim();
      return url || safeDefault;
    }
  }
  return safeDefault;
}
