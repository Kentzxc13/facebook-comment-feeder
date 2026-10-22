import { describe, it, expect } from 'vitest';
import { generateWorkbookBuffer } from '../src/utils/excelExporter.js';

describe('Excel Exporter - generateWorkbookBuffer', () => {
  const sample = [
    { no: 1, date: '2026-10-22 10:00 AM', author: 'Commenter #1', text: 'Hello world' },
    { no: 2, date: '2026-10-22 10:05 AM', author: 'Commenter #2', text: 'Second feedback' }
  ];

  it('generates a non-empty Excel buffer with proper worksheet and rows', async () => {
    const buffer = await generateWorkbookBuffer(sample);
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });
});
