import * as fs from 'node:fs';
import * as path from 'node:path';

const DATA_DIR = path.resolve(__dirname, '../fixtures/data');

/** Read and parse a JSON file from `src/fixtures/data`. */
export function loadJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), 'utf-8')) as T;
}

/** Raw text of a data file (used to attach the exact CSV that drove a test). */
export function readDataFile(fileName: string): string {
  return fs.readFileSync(path.join(DATA_DIR, fileName), 'utf-8');
}

export function dataFilePath(fileName: string): string {
  return path.join(DATA_DIR, fileName);
}

/**
 * Parse a simple CSV file (header row, comma separated, optional double quotes)
 * into an array of objects keyed by header.
 */
export function loadCsv<T extends Record<string, string>>(fileName: string): T[] {
  const lines = readDataFile(fileName)
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.startsWith('#'));
  const [header, ...rows] = lines.map(parseCsvLine);
  return rows.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])) as T);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else current += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(current.trim());
      current = '';
    } else current += ch;
  }
  cells.push(current.trim());
  return cells;
}

/** Parse "£1,234.50" into 1234.5. */
export function parsePrice(text: string): number {
  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Cannot parse a price from "${text}"`);
  return Number.parseFloat(match[1]);
}
