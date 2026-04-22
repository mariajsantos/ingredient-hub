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

  // Deduplicate by ingredient + week (removes exact duplicates only)
  const key = `${r[1].toLowerCase().trim()}|${r[7]}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const originRaw = r[5] ? r[5].trim() : '';
  const origin = originRaw === '' ? null : parseFloat(originRaw);

  data.push({
    recipe:         r[0] || '',
    ingredient:     r[1] || '',
    ingredientList: r[2] || '',
    contains:       r[3] ? r[3].split(',').map(s => s.trim()).filter(Boolean) : [],
    mayContain:     r[4] ? r[4].split(',').map(s => s.trim()).filter(Boolean) : [],
    origin:         isNaN(origin) ? null : origin,
    brand:          r[6] || '',
    week:           r[7] || '',
    recipes:        [r[0] || ''],
  });
}
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
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
