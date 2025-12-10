import { RowDataPacket } from 'mysql2/promise';
import { ENV } from '../config/env';
import { pool } from '../config/database';

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

interface FkRow extends RowDataPacket {
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

function pickDisplayColumn(
  cols: ColumnRow[],
  referencedColumn: string
): string | null {
  const stringCols = cols.filter(c =>
    ['char', 'varchar', 'text', 'mediumtext', 'longtext'].includes(
      c.DATA_TYPE.toLowerCase()
    )
  );
  if (stringCols.length === 0) return null;

  let candidate =
    stringCols.find(c => c.COLUMN_NAME.toLowerCase().startsWith('ten_')) ||
    stringCols.find(c => c.COLUMN_NAME.toLowerCase().includes('name'));

  if (candidate) return candidate.COLUMN_NAME;

  candidate = stringCols.find(
    c =>
      c.COLUMN_NAME.toLowerCase() !== referencedColumn.toLowerCase() &&
      !c.COLUMN_NAME.toLowerCase().includes('id')
  );
  if (candidate) return candidate.COLUMN_NAME;

  return stringCols[0].COLUMN_NAME;
}


export async function getTableWithTextService(tableName: string) {
  const dbName = ENV.DB_NAME;

  // 1. Cột của bảng chính
  const [columns] = await pool.query<ColumnRow[]>(
    `
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
    `,
    [dbName, tableName]
  );

  if (columns.length === 0) {
    throw new Error(`Table ${tableName} not found in database ${dbName}`);
  }

  // 2. Các cột là FK
  const [fkRows] = await pool.query<FkRow[]>(
    `
    SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    [dbName, tableName]
  );

  const fkMap = new Map<
    string,
    { refTable: string; refColumn: string; displayColumn: string | null; alias: string }
  >();

  let aliasIndex = 1;
  for (const fk of fkRows) {
    const colName = fk.COLUMN_NAME;
    const refTable = fk.REFERENCED_TABLE_NAME;
    const refColumn = fk.REFERENCED_COLUMN_NAME;

    const [refCols] = await pool.query<ColumnRow[]>(
      `
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
      `,
      [dbName, refTable]
    );

    const displayColumn = pickDisplayColumn(refCols, refColumn);
    const alias = `fk_${aliasIndex++}`;

    fkMap.set(colName, {
      refTable,
      refColumn,
      displayColumn,
      alias
    });
  }

  const selectParts: string[] = [];

  for (const col of columns) {
    const colName = col.COLUMN_NAME;

    selectParts.push(`t.\`${colName}\``);

    const fkInfo = fkMap.get(colName);
    if (fkInfo && fkInfo.displayColumn) {
      selectParts.push(
        `${fkInfo.alias}.\`${fkInfo.displayColumn}\` AS \`${colName}_text\``
      );
    } else if (fkInfo) {
      selectParts.push(`NULL AS \`${colName}_text\``);
    }
  }

  const joinParts: string[] = [];
  for (const [colName, fkInfo] of fkMap.entries()) {
    const { refTable, refColumn, alias } = fkInfo;
    joinParts.push(
      `LEFT JOIN \`${refTable}\` AS ${alias} ON ${alias}.\`${refColumn}\` = t.\`${colName}\``
    );
  }

  const sql = `
    SELECT
      ${selectParts.join(',\n      ')}
    FROM \`${tableName}\` AS t
    ${joinParts.length ? '\n' + joinParts.join('\n') : ''}
  `;

  const [rows] = await pool.query<RowDataPacket[]>(sql);
  return rows;
}
