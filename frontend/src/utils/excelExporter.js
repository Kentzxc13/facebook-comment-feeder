import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { anonymizeComments } from './anonymizer.js';

/**
 * Builds an ExcelJS Workbook from formatted comment objects and returns its buffer.
 * @param {Array<{ no: number, date: string, author: string, text: string }>} data 
 * @returns {Promise<ArrayBuffer>}
 */
export async function generateWorkbookBuffer(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Facebook Comment Feeder';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Comments', {
    views: [{ showGridLines: true }]
  });

  // Define Columns
  worksheet.columns = [
    { header: 'No.', key: 'no', width: 8 },
    { header: 'Date (MM/DD/YYYY)', key: 'date', width: 24 },
    { header: 'Commenter Name', key: 'author', width: 28 },
    { header: 'Comment Text', key: 'text', width: 65 }
  ];

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate Navy
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // Populate Data Rows
  data.forEach((item) => {
    const row = worksheet.addRow({
      no: item.no,
      date: item.date,
      author: item.author,
      text: item.text
    });

    row.height = 24;

    // Apply alignment & cell styling
    row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('date').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('author').alignment = { vertical: 'middle', horizontal: 'left' };
    
    // Enable wrap text for comment body
    const textCell = row.getCell('text');
    textCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Triggers client-side download of an Excel spreadsheet.
 * @param {Array} rawComments 
 * @param {boolean} isAnonymized 
 * @param {string} [customFilename] 
 */
export async function exportToExcel(rawComments, isAnonymized = false, customFilename) {
  const formatted = anonymizeComments(rawComments, isAnonymized);
  if (formatted.length === 0) {
    throw new Error('No comments to export.');
  }

  const buffer = await generateWorkbookBuffer(formatted);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const defaultName = isAnonymized
    ? `facebook_comments_${dateStr}_anonymized.xlsx`
    : `facebook_comments_${dateStr}.xlsx`;

  const filename = customFilename || defaultName;

  if (typeof window !== 'undefined' && window.document) {
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  return blob;
}
