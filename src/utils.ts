import type { AppData, Finish, RaceType, Runner } from './types';

export const defaultData: AppData = {
  runners: [],
  finishes: [],
  settings: { starts: { '5K': null, '10K': null } },
};

export function normalizeBib(bib: string): string {
  return bib.trim();
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTimeOfDay(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export interface BulkParseError {
  line: number;
  message: string;
}

export interface BulkParseResult {
  parsed: Runner[];
  errors: BulkParseError[];
}

export function parseBulkInput(text: string, existingBibs: Set<string>): BulkParseResult {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const parsed: Runner[] = [];
  const errors: BulkParseError[] = [];
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    let tokens: string[];
    if (line.includes(',')) {
      tokens = line.split(',').map((t) => t.trim()).filter(Boolean);
    } else {
      tokens = line.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    }

    if (tokens.length === 0) {
      errors.push({ line: lineNo, message: 'Missing bib number' });
      return;
    }

    const bib = normalizeBib(tokens[0]);
    if (!bib) {
      errors.push({ line: lineNo, message: 'Missing bib number' });
      return;
    }

    if (existingBibs.has(bib) || seen.has(bib)) {
      errors.push({ line: lineNo, message: `Duplicate bib: ${bib}` });
      return;
    }

    let race: RaceType | null = null;
    let firstName = '';
    let lastName = '';

    if (line.includes(',')) {
      if (tokens[1] === '5K' || tokens[1] === '10K') {
        race = tokens[1];
        firstName = tokens[2] ?? '';
        lastName = tokens[3] ?? '';
      } else if (tokens.length === 1) {
        race = '5K';
      }
    } else {
      if (tokens[1] === '5K' || tokens[1] === '10K') {
        race = tokens[1];
        firstName = tokens[2] ?? '';
        lastName = tokens[3] ?? '';
      } else {
        race = '5K';
        firstName = tokens[1] ?? '';
        lastName = tokens[2] ?? '';
      }
    }

    if (!race) {
      errors.push({ line: lineNo, message: 'Invalid race (use 5K or 10K)' });
      return;
    }

    seen.add(bib);
    parsed.push({ bibNumber: bib, race, firstName, lastName, createdAt: Date.now() });
  });

  return { parsed, errors };
}

function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  return `"${str.replaceAll('"', '""')}"`;
}

export function exportResultsToCsv(runners: Runner[], finishes: Finish[], settings: AppData['settings']): string {
  const byBib = new Map(runners.map((r) => [r.bibNumber, r]));
  const headers = [
    'bib',
    'firstName',
    'lastName',
    'race',
    'startTimestamp',
    'finishTimestamp',
    'elapsedMs',
    'elapsedFormatted',
  ];

  const rows = finishes
    .slice()
    .sort((a, b) => a.elapsedMs - b.elapsedMs)
    .map((finish) => {
      const runner = byBib.get(finish.bibNumber);
      const start = settings.starts[finish.race];
      return [
        finish.bibNumber,
        runner?.firstName ?? '',
        runner?.lastName ?? '',
        finish.race,
        start ?? '',
        finish.finishTimestamp,
        finish.elapsedMs,
        formatElapsed(finish.elapsedMs),
      ];
    });

  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
