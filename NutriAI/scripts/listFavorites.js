const https = require('https');

const spreadsheetId = '1GRDc38wG_354vsGMdgNwNI6TMb8hTCcEWRgLL2X1caE';
const apiKey = 'AIzaSyAoQFB-CUMuxjhfIDk36m6NOaJy6KiAQ68';
const range = 'Folha1!A1:Z1000';
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      const values = j.values || [];
      if (!values.length) {
        console.log('Nenhum dado retornado da planilha.');
        return;
      }
      const headers = values[0].map(h => (h || '').toString().trim());
      // Find favorite column index (support several header names)
      // Only look for the exact header 'FAVORITO' as requested
      const favNames = ['FAVORITO'];
      let favIndex = -1;
      for (let i=0;i<headers.length;i++){
        const h = headers[i];
        if (!h) continue;
        const low = h.toLowerCase();
        if (favNames.map(x=>x.toLowerCase()).includes(low)) { favIndex = i; break; }
      }
      if (favIndex === -1) {
        console.log('Nenhuma coluna de "Favorito" encontrada. Para marcar favoritos, adicione uma coluna com cabeçalho "Favorito" (ou fav) com valor 1 para favorito.');
        return;
      }
      const favorites = [];
      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        const favVal = (row[favIndex] || '').toString().trim();
        if (favVal === '1') {
          // try to extract useful fields
          const tipo = (row[1] || '').toString().trim();
          const nome = (row[2] || '').toString().trim();
          favorites.push({row: r+1, tipo, nome, favVal});
        }
      }
      if (!favorites.length) {
        console.log('Nenhum item marcado como favorito (valor exato "1").');
      } else {
        console.log('Itens marcados como Favorito (valor "1"):\n');
        favorites.forEach(f => console.log(`Linha ${f.row}: [${f.tipo}] ${f.nome}`));
      }
    } catch (e) {
      console.error('Falha ao analisar resposta JSON:', e);
      console.log('RAW:', data);
    }
  });
}).on('error', (err) => {
  console.error('Erro na requisição:', err);
});
