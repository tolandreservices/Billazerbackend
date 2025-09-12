// lib/sheets.ts
import { google } from 'googleapis';

/* ------------------------------ Environment ------------------------------ */

const ENV = process.env as Record<string, string | undefined>;

const SHEETS_SPREADSHEET_ID_RAW = (ENV.SHEETS_SPREADSHEET_ID ?? '').trim();
const ADMIN_RATES_SHEET_RAW = (ENV.ADMIN_RATES_SHEET ?? 'Admin Rates').trim();
const USER_SUBMISSIONS_SHEET_RAW = (ENV.USER_SUBMISSIONS_SHEET ?? 'User Submissions').trim();
const PARTNERS_SHEET_RAW = (ENV.PARTNERS_SHEET ?? 'Partners').trim();
const DEFAULT_CALENDAR_URL_RAW = (ENV.DEFAULT_CALENDAR_URL ?? '').trim();

const GOOGLE_SERVICE_ACCOUNT_EMAIL = (ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '').trim();
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = (ENV.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '')
  .replace(/\\n/g, '\n');

/** Exported config (single source of truth) */
export const SHEETS_SPREADSHEET_ID = SHEETS_SPREADSHEET_ID_RAW;
export const ADMIN_RATES_SHEET = ADMIN_RATES_SHEET_RAW;
export const USER_SUBMISSIONS_SHEET = USER_SUBMISSIONS_SHEET_RAW;
export const PARTNERS_SHEET = PARTNERS_SHEET_RAW;
export const DEFAULT_CALENDAR_URL = DEFAULT_CALENDAR_URL_RAW;

/** Fail fast if required secrets are missing */
if (!SHEETS_SPREADSHEET_ID) throw new Error('SHEETS_SPREADSHEET_ID is missing or empty');
if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is missing');
if (!GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) throw new Error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing');

/* ---------------------------- Google Sheets auth ---------------------------- */

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

/* ---------------------------------- Types ---------------------------------- */

export type AdminRates = {
  promoKwh: number;
  regKwh: number;
  promoGj: number;
  regGj: number;
  ourElecAdmin: number; // Admin Fee – Electricity
  ourGasAdmin: number;  // Admin Fee – Gas
  gst: number;
};

/* --------------------------------- Helpers --------------------------------- */

export async function getAdminRates(): Promise<AdminRates> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_SPREADSHEET_ID,
    range: `${ADMIN_RATES_SHEET}!A1:B100`,
  });

  const rows = (res.data.values || []) as string[][];
  const map: Record<string, string> = {};
  for (const [k, v] of rows) {
    if (typeof k === 'string') map[k.trim()] = (v ?? '').toString().trim();
  }

  const promoGj = Number(map['Promo Gas GJ Rate'] ?? map['Promo GJ Rate'] ?? 0);
  const regGj = Number(map['Regular Gas GJ Rate'] ?? map['Regular GJ Rate'] ?? 0);

  return {
    promoKwh: Number(map['Promo kWh Rate'] ?? 0),
    regKwh: Number(map['Regular kWh Rate'] ?? 0),
    promoGj,
    regGj,
    ourElecAdmin: Number(map['Admin Fee – Electricity'] ?? 0),
    ourGasAdmin: Number(map['Admin Fee – Gas'] ?? 0),
    gst: Number(map['GST Rate'] ?? ENV.GST_DEFAULT ?? 0.05),
  };
}

export async function appendSubmission(row: any[]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_SPREADSHEET_ID,
    range: `${USER_SUBMISSIONS_SHEET}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

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
