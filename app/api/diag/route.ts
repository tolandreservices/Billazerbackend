import { NextResponse } from 'next/server';

export async function GET() {
  const keys = [
    'SHEETS_SPREADSHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'ADMIN_RATES_SHEET',
    'USER_SUBMISSIONS_SHEET',
    'PARTNERS_SHEET',
    'DEFAULT_CALENDAR_URL',
  ];
  const present = Object.fromEntries(keys.map(k => [k, !!process.env[k]]));
  return NextResponse.json({ env: present });
}
