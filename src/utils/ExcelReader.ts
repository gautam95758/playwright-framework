import ExcelJS from 'exceljs';
import path from 'path';
import { config } from '../../config/config';
import logger from './Logger';

export class ExcelReader {
  private static workbookCache: Map<string, ExcelJS.Workbook> = new Map();

  static async readCellValue(sheetName: string, key: string, columnName: string): Promise<string> {
    const filePath = path.resolve(config.excelPath);
    logger.info(`Reading Excel — Sheet: "${sheetName}" | Key: "${key}" | Column: "${columnName}"`);

    if (!this.workbookCache.has(filePath)) {
      logger.info(`Loading Excel file: ${filePath}`);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      this.workbookCache.set(filePath, workbook);
      logger.info('Excel file loaded and cached');
    }

    const workbook = this.workbookCache.get(filePath)!;
    const sheet = workbook.getWorksheet(sheetName);

    if (!sheet) {
      logger.error(`Sheet "${sheetName}" not found in Excel file`);
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const headerRow = sheet.getRow(1);
    let keyColumnIndex = -1;
    let targetColumnIndex = -1;

    headerRow.eachCell((cell, colNumber) => {
      const cellValue = String(cell.value).trim().toLowerCase();
      if (cellValue === 'id') keyColumnIndex = colNumber;
      if (cellValue === columnName.toLowerCase()) targetColumnIndex = colNumber;
    });

    if (keyColumnIndex === -1) {
      logger.error('"id" column not found in header row');
      throw new Error('"id" column not found');
    }
    if (targetColumnIndex === -1) {
      logger.error(`Column "${columnName}" not found in sheet "${sheetName}"`);
      throw new Error(`Column "${columnName}" not found`);
    }

    for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
      const row = sheet.getRow(rowIndex);
      const keyCell = row.getCell(keyColumnIndex);
      if (String(keyCell.value).trim() === String(key).trim()) {
        const targetCell = row.getCell(targetColumnIndex);
        const value = String(targetCell.value ?? '').trim();
        logger.info(`Excel value found: "${value}"`);
        return value;
      }
    }

    logger.error(`Key "${key}" not found in sheet "${sheetName}"`);
    throw new Error(`Key "${key}" not found in sheet "${sheetName}"`);
  }
}
