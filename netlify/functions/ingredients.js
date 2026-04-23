// ═══════════════════════════════════════════════════════════════
// netlify/functions/ingredients.js — Backend Data Function
// ═══════════════════════════════════════════════════════════════
// Reads your Google Sheet and returns clean JSON to the HTML page.
// Deduplicates by ingredient + recipe + week (removes exact duplicates only).
// Uses gzip compression to stay within Netlify's 6MB response limit.
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// netlify/functions/ingredients.js — Backend Data Function
// ═══════════════════════════════════════════════════════════════

const { google } = require('googleapis');

exports.handler = async () => {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'ms!A:H',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const data = [];
    const seen = new Set();

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[1]) continue;

      // Deduplicate by ingredient + recipe + week
      const key = `${r[0]}|${r[1]}|${r[7]}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const originRaw = r[5] ? r[5].trim() : '';
      const origin = originRaw === '' ? null : parseFloat(originRaw);

      // Only send fields the frontend needs — keeps payload small
      data.push({
        re: r[0] || '',                // recipe
        i:  r[1] || '',                // ingredient
        il: r[2] || '',                // ingredientList
        c:  r[3] ? r[3].split(',').map(s => s.trim()).filter(Boolean) : [],  // contains
        mc: r[4] ? r[4].split(',').map(s => s.trim()).filter(Boolean) : [],  // mayContain
        o:  isNaN(origin) ? null : origin,  // origin
        w:  r[7] || '',                // week
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=172800',
      },
      body: JSON.stringify(data),
    };

  } catch (err) {
    console.error('Sheets API error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
