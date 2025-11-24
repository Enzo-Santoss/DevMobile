const https = require('https');

const spreadsheetId = '1GRDc38wG_354vsGMdgNwNI6TMb8hTCcEWRgLL2X1caE';
const apiKey = 'AIzaSyAoQFB-CUMuxjhfIDk36m6NOaJy6KiAQ68';
const range = 'Folha1!A1:Z1000';
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

function parseValuesToObjects(values) {
  if (!values || values.length === 0) return [];
  const headers = values[0].map(h => (h ?? '').toString().trim());
  const rows = values.slice(1);
  return rows.map(r => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i] || `col${i}`;
      obj[key] = r[i] ?? '';
    }
    return obj;
  });
}

function mapRows(rows) {
  const get = (r, names) => {
    for (const n of names) {
      if (r.hasOwnProperty(n)) return (r[n] ?? '').toString().trim();
    }
    return '';
  };
  return rows.map(r => {
    const favRaw = get(r, ['favorite','fav','Favorito','favorito','Favorite','FAVORITO']);
    const fav = favRaw === '1' || favRaw.toLowerCase() === 'true';
    const category = get(r, ['category','Categoria','categoria','TIPO','Tipo','tipo']).toLowerCase() || 'outro';
    const title = get(r, ['title','Title','titulo','Título','NOME','Nome','nome']);
    const ingredientes = get(r, ['description','Description','descricao','Descrição','INGREDIENTES','Ingredientes']);
    const receita = get(r, ['receita','RECEITA','Recipe','recipe']);
    const macros = get(r, ['macros','MACROS']);
    const description = [ingredientes, receita, macros].filter(Boolean).join('\n\n');
    const image = get(r, ['image','Image','img','IMG']);
    return {
      category,
      title,
      description,
      image: image || undefined,
      favorite: fav
    };
  });
}

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      const values = j.values || [];
      const objs = parseValuesToObjects(values);
      const items = mapRows(objs);
      const byCat = {};
      const favorites = [];
      items.forEach(it => {
        if (!byCat[it.category]) byCat[it.category] = [];
        byCat[it.category].push(it);
        if (it.favorite) favorites.push(it);
      });
      if (favorites.length) byCat['favoritos'] = favorites;
      console.log('categories:', Object.keys(byCat));
      for (const k of Object.keys(byCat)) {
        console.log(`\n== ${k} (${byCat[k].length}) ==`);
        byCat[k].slice(0,5).forEach((it, idx) => {
          console.log(`${idx+1}. ${it.title}`);
        });
      }
    } catch (e) {
      console.error('err parse', e);
      console.log('raw', data);
    }
  });
}).on('error', e => console.error('req err', e));
