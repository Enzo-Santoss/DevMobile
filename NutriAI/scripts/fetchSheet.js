const https = require('https');

const spreadsheetId = '1GRDc38wG_354vsGMdgNwNI6TMb8hTCcEWRgLL2X1caE';
const apiKey = 'AIzaSyAoQFB-CUMuxjhfIDk36m6NOaJy6KiAQ68';
const range = 'A1:F';
const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;

https.get(metaUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    try {
      const j = JSON.parse(data);
      // print sheet titles
      const sheets = (j.sheets || []).map(s => s.properties && s.properties.title).filter(Boolean);
      console.log('Sheets in spreadsheet:', sheets);
      // Try to fetch first sheet by name
      if (sheets.length) {
        const sheetName = sheets[0];
        const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + '!' + range)}?key=${apiKey}`;
        const https2 = require('https');
        https2.get(valuesUrl, r2 => {
          let d2 = '';
          r2.on('data', c => d2 += c);
          r2.on('end', () => {
            console.log('VALUES STATUS', r2.statusCode);
            try {
              console.log(JSON.stringify(JSON.parse(d2), null, 2));
            } catch (err) {
              console.error('Failed to parse values JSON', err);
              console.log('RAW VALUES:', d2);
            }
          });
        }).on('error', e => console.error('values request error', e));
      }
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      console.log('RAW:', data);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err);
});
