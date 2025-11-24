import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { sheetsConfig } from '../../environments/environment';

export interface SheetRow { [key: string]: any }
export interface MenuItem {
  category: string;
  meal: string;
  title: string;
  description: string;
  image?: string;
  favorite?: boolean;
  id?: string;
  order?: number;
  ingredientes?: string;
  receita?: string;
  macros?: string;
}

@Injectable({ providedIn: 'root' })
export class SheetsService {
  private readonly baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  private readonly http = inject(HttpClient);

  constructor() {}

  // Generic helper to fetch a values range and return as 2D array.
  // If an API key is provided in environment, use the official Sheets API v4.
  // If no API key is present, try the public "gviz" endpoint (works for publicly shared sheets).
  fetchValues(range?: string): Observable<string[][]> {
    const spreadsheetId = sheetsConfig.spreadsheetId;
    const apiKey = sheetsConfig.apiKey;
    const chosenRange = range ?? sheetsConfig.defaultRange;
    if (!spreadsheetId) {
      throw new Error('Google Sheets: spreadsheetId must be set in environment.sheetsConfig');
    }

    if (apiKey && apiKey.length > 0) {
      const url = `${this.baseUrl}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(chosenRange)}`;
      const params = new HttpParams().set('key', apiKey);
      return this.http.get<{ values: string[][] }>(url, { params }).pipe(map(r => r.values ?? []));
    }

    // Fallback: fetch from the public gviz JSON endpoint (no API key required for public sheets)
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?range=${encodeURIComponent(chosenRange)}&tqx=out:json`;
    return this.http.get(gvizUrl, { responseType: 'text' }).pipe(map(text => {
      try {
        // Response looks like: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
        const start = text.indexOf('{', text.indexOf('setResponse'));
        const end = text.lastIndexOf('}');
        const jsonStr = text.substring(start, end + 1);
        const parsed = JSON.parse(jsonStr);
        const table = parsed.table;
        const cols = (table && table.cols) ? table.cols.map((c: any) => (c.label || '').toString()) : [];
        const rows = (table && table.rows) ? table.rows : [];
        const values: string[][] = [];
        // first row: headers
        values.push(cols);
        for (const r of rows) {
          const rowVals: string[] = [];
          const cells = r.c || [];
          for (let i = 0; i < cols.length; i++) {
            const cell = cells[i];
            rowVals.push(cell && typeof cell.v !== 'undefined' ? String(cell.v) : '');
          }
          values.push(rowVals);
        }
        return values;
      } catch (e) {
        console.error('Failed to parse gviz response', e);
        return [] as string[][];
      }
    }));
  }

  // Parse a values array (first row as headers) into objects
  parseValuesToObjects(values: string[][]): SheetRow[] {
    if (!values || values.length === 0) return [];
    const headers = values[0].map(h => (h ?? '').toString().trim());
    const rows = values.slice(1);
    return rows.map(r => {
      const obj: SheetRow = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i] || `col${i}`;
        obj[key] = r[i] ?? '';
      }
      return obj;
    });
  }

  // High-level helper: expect sheet columns: category, meal, title, description, image, order
  getMenuItems(range?: string): Observable<MenuItem[]> {
    return this.fetchValues(range).pipe(
      map(values => this.parseValuesToObjects(values)),
      map(rows => rows.map(r => {
        // Support a variety of header names in English and Portuguese, and uppercase keys from your sheet
        const get = (names: string[]) => {
          for (const n of names) {
            if (r.hasOwnProperty(n)) return (r[n] ?? '').toString().trim();
          }
          return '';
        };

        // Use strictly the header named 'FAVORITO' as requested: only that column controls favorites.
        const favRaw = get(['FAVORITO']);
        const fav = favRaw === '1';

        // The sheet you provided uses headers: ID, TIPO, NOME, INGREDIENTES, RECEITA, MACROS
        const id = get(['ID','Id','id']);
        const category = get(['category','Categoria','categoria','TIPO','Tipo','tipo']).toLowerCase();
        const title = get(['title','Title','titulo','Título','NOME','Nome','nome']);
        // Compose description from ingredients + receita + macros if available
        const ingredientes = get(['description','Description','descricao','Descrição','INGREDIENTES','Ingredientes']);
        const receita = get(['receita','RECEITA','Recipe','recipe']);
        const macros = get(['macros','MACROS']);
        const description = [ingredientes, receita, macros].filter(Boolean).join('\n\n');
        const image = get(['image','Image','img','IMG']);

        return ({
          id: id || undefined,
          category: category || 'outro',
          meal: '',
          title: title,
          description: description,
          ingredientes: ingredientes || undefined,
          receita: receita || undefined,
          macros: macros || undefined,
          image: image || undefined,
          favorite: fav,
          order: get(['order','ORDER']) ? Number(get(['order','ORDER'])) : undefined
        } as MenuItem);
      }))
    );
  }
}
