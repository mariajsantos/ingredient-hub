// ═══════════════════════════════════════════════════════════════
// netlify/functions/ingredients.js — Backend Data Function
// ═══════════════════════════════════════════════════════════════
// Reads your Google Sheet and returns clean JSON to the HTML page.
// Deduplicates by ingredient + recipe + week (removes exact duplicates only).
// Uses gzip compression to stay within Netlify's 6MB response limit.
// ═══════════════════════════════════════════════════════════════

const { google } = require('googleapis');
const zlib = require('zlib');

exports.handler = async (event) => {
  try {
    // Authenticate with Google using the service account
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch all rows from the ms tab
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'ms!A:H',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    // Skip header row, deduplicate by ingredient + recipe + week
    const data = [];
    const seen = new Set();

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[1]) continue;

      // Remove exact duplicates only — keeps all ingredient/recipe/week combos
      const key = `${r[0]}|${r[1]}|${r[7]}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const originRaw = r[5] ? r[5].trim() : '';
      const origin = originRaw === '' ? null : parseFloat(originRaw);

      data.push({
        recipe:         r[0] || '',   // Column A: Recipe Name
        ingredient:     r[1] || '',   // Column B: Ingredient Name
        ingredientList: r[2] || '',   // Column C: Ingredient List
        contains:       r[3] ? r[3].split(',').map(s => s.trim()).filter(Boolean) : [], // Column D
        mayContain:     r[4] ? r[4].split(',').map(s => s.trim()).filter(Boolean) : [], // Column E
        origin:         isNaN(origin) ? null : origin, // Column F
        brand:          r[6] || '',   // Column G
        week:           r[7] || '',   // Column H
      });
    }

    // Gzip compress the response to stay within Netlify's 6MB limit
    const json = JSON.stringify(data);
    const compressed = await new Promise((resolve, reject) => {
      zlib.gzip(Buffer.from(json), (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
      body: compressed.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error('Sheets API error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
