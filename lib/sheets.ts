import { google } from 'googleapis';

const {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  SHEETS_SPREADSHEET_ID,
  ADMIN_RATES_SHEET = 'Admin Rates',
  USER_SUBMISSIONS_SHEET = 'User Submissions',
  PARTNERS_SHEET = 'Partners',
} = process.env;

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function getAdminRates() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_SPREADSHEET_ID!,
    range: `${ADMIN_RATES_SHEET}!A1:B20`,
  });
  const rows = res.data.values || [];
  const map: Record<string, string> = {};
  for (const [k, v] of rows) map[k] = v;
  return {
    promoKwh: Number(map['Promo kWh Rate'] || 0),
    regKwh: Number(map['Regular kWh Rate'] || 0),
    promoGj: Number(map['Promo Gas GJ Rate'] || map['Promo GJ Rate'] || 0),
    regGj: Number(map['Regular Gas GJ Rate'] || map['Regular GJ Rate'] || 0),
    ourElecAdmin: Number(map['Admin Fee – Electricity'] || 0),
    ourGasAdmin: Number(map['Admin Fee – Gas'] || 0),
    gst: Number(map['GST Rate'] || process.env.GST_DEFAULT || 0.05),
  };
}

export async function appendSubmission(row: any[]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_SPREADSHEET_ID!,
    range: `${USER_SUBMISSIONS_SHEET}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

export async function upsertPartner({ email, plan, refCode, calendarUrl, status }:
  { email: string; plan: string; refCode: string; calendarUrl: string; status: 'Active'|'Canceled' }) {
  const sheets = getSheetsClient();
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_SPREADSHEET_ID!,
    range: `${PARTNERS_SHEET}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[now, email, plan, refCode, calendarUrl, status]] },
  });
}

export async function getCalendarForRef(refCode?: string | null) {
  if (!refCode) return process.env.DEFAULT_CALENDAR_URL!;
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_SPREADSHEET_ID!,
    range: `${PARTNERS_SHEET}!A1:F1000`,
  });
  const rows = res.data.values || [];
  const header = rows[0] || [];
  const refIdx = header.indexOf('Ref Code');
  const calIdx = header.indexOf('Calendar URL');
  if (refIdx === -1 || calIdx === -1) return process.env.DEFAULT_CALENDAR_URL!;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[refIdx] === refCode) return (row[calIdx] as string) || process.env.DEFAULT_CALENDAR_URL!;
  }
  return process.env.DEFAULT_CALENDAR_URL!;
}

const SPREADSHEET_ID = (process.env.SHEETS_SPREADSHEET_ID || '').trim();
const ADMIN_RATES_SHEET = (process.env.ADMIN_RATES_SHEET || '').trim();
const USER_SUBMISSIONS_SHEET = (process.env.USER_SUBMISSIONS_SHEET || '').trim();
const PARTNERS_SHEET = (process.env.PARTNERS_SHEET || '').trim();

if (!SPREADSHEET_ID) {
  throw new Error('SHEETS_SPREADSHEET_ID is missing or empty');
}
