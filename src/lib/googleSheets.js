/**
 * Utility to append rows to a Google Sheet via the Sheets API v4.
 * Requires the sheet to be shared with write access via a Service Account
 * OR using OAuth. Since we only have an API key (read-only), we use
 * a public writable approach via fetch with the API key for append.
 *
 * NOTE: Google Sheets API key alone does NOT allow writes.
 * We use a workaround: append via a Google Apps Script Web App URL
 * stored as SHEETS_SCRIPT_URL, OR fall back to opening a pre-filled URL.
 *
 * For simplicity and reliability without a backend, we use the
 * Google Apps Script Web App approach (user sets a script URL).
 */

export const SHEETS_ID_KEY = 'google_sheets_id';
export const SHEETS_SCRIPT_URL_KEY = 'google_sheets_script_url';

/**
 * Send rows to the Google Apps Script Web App.
 * The script should accept POST with { sheet, rows: [[...]] }
 */
export async function appendToSheet(sheetName, rows) {
    const scriptUrl = localStorage.getItem(SHEETS_SCRIPT_URL_KEY);
    if (!scriptUrl) {
        throw new Error('no_script_url');
    }

    const response = await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script requires no-cors
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: sheetName, rows }),
    });

    // no-cors means we can't read the response, but if no error thrown, assume success
    return true;
}

export function isSheetsConfigured() {
    return !!localStorage.getItem(SHEETS_SCRIPT_URL_KEY);
}