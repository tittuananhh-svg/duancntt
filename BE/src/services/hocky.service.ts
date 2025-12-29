import { pool } from '../config/database';

export interface HocKy {
  id?: number;
  nam_hoc: string;              // varchar(9)
  hoc_ky: number;               // tinyint
  ngay_bat_dau?: string | null; // date: 'YYYY-MM-DD' hoặc null
  ngay_ket_thuc?: string | null;// date: 'YYYY-MM-DD' hoặc null
  created_at?: Date;
  updated_at?: Date;
}

export async function createHocKy(data: HocKy): Promise<HocKy> {
  const { nam_hoc, hoc_ky, ngay_bat_dau, ngay_ket_thuc } = data;

  const [result]: any = await pool.execute(
    `
      INSERT INTO ky_hoc (nam_hoc, hoc_ky, ngay_bat_dau, ngay_ket_thuc, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `,
    [nam_hoc, hoc_ky, ngay_bat_dau ?? null, ngay_ket_thuc ?? null]
  );

  const created = await getHocKyById(result.insertId);

  if (!created) {
    throw new Error('Tạo học kỳ thất bại');
  }

  return created;
}

export async function getHocKyById(id: number): Promise<HocKy | null> {
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM ky_hoc WHERE id = ? LIMIT 1',
    [id]
  );
  return rows.length ? (rows[0] as HocKy) : null;
}

export async function searchHocKy(keyword?: string): Promise<HocKy[]> {
  if (keyword && keyword.trim() !== '') {
    const q = keyword.trim();
    const like = `%${q}%`;
    const isNumber = /^[0-9]+$/.test(q);
    const hk = isNumber ? Number(q) : null;

    const [rows] = await pool.execute<any[]>(
      `
        SELECT * FROM ky_hoc
        WHERE nam_hoc LIKE ?
           OR (? IS NOT NULL AND hoc_ky = ?)
        ORDER BY nam_hoc DESC, hoc_ky DESC, id DESC
      `,
      [like, hk, hk]
    );

    return rows as HocKy[];
  } else {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM ky_hoc ORDER BY nam_hoc DESC, hoc_ky DESC, id DESC'
    );
    return rows as HocKy[];
  }
}


export async function updateHocKy(id: number, payload: Partial<HocKy>): Promise<HocKy | null> {

  const current = await getHocKyById(id);
  if (!current) return null;

  const sets: string[] = [];
  const values: any[] = [];


  if (payload.nam_hoc !== undefined) {
    sets.push('nam_hoc = ?');
    values.push(payload.nam_hoc);
  }

  if (payload.hoc_ky !== undefined) {
    sets.push('hoc_ky = ?');
    values.push(payload.hoc_ky);
  }

  if (payload.ngay_bat_dau !== undefined) {
    sets.push('ngay_bat_dau = ?');
    values.push(payload.ngay_bat_dau); 
  }

  if (payload.ngay_ket_thuc !== undefined) {
    sets.push('ngay_ket_thuc = ?');
    values.push(payload.ngay_ket_thuc); 
  }


  if (sets.length === 0) return current;


  sets.push('updated_at = NOW()');

  const sql = `UPDATE ky_hoc SET ${sets.join(', ')} WHERE id = ?`;
  values.push(id);

  await pool.execute<any>(sql, values);

  return getHocKyById(id);
}

export async function deleteHocKy(id: number): Promise<boolean> {
  const [result] = await pool.execute<any>(
    'DELETE FROM ky_hoc WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}
