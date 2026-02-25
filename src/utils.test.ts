import { describe, expect, it } from 'vitest';
import { exportResultsToCsv, formatElapsed } from './utils';

describe('formatElapsed', () => {
  it('formats mm:ss under an hour', () => {
    expect(formatElapsed(62000)).toBe('01:02');
  });

  it('formats hh:mm:ss over an hour', () => {
    expect(formatElapsed(3665000)).toBe('01:01:05');
  });
});

describe('exportResultsToCsv', () => {
  it('includes expected headers and elapsed', () => {
    const csv = exportResultsToCsv(
      [{ bibNumber: '0012', race: '5K', firstName: 'Ann', lastName: 'Lee', createdAt: 1 }],
      [{ bibNumber: '0012', race: '5K', finishTimestamp: 10000, elapsedMs: 5000 }],
      { starts: { '5K': 5000, '10K': null } }
    );
    expect(csv).toContain('"bib","firstName","lastName"');
    expect(csv).toContain('"0012","Ann","Lee","5K","5000","10000","5000","00:05"');
  });
});
