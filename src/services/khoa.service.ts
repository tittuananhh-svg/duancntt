
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { ENV } from '../config/env';
import { log } from 'console';

import { pool } from '../config/database';

export interface Khoa {
  id?: number;
  ma_khoa: string;
  ten_khoa: string;
  mo_ta?: string | null;
  truong_khoa_id?: number | null;
  created_at?: Date;
  updated_at?: Date;
}


export async function createKhoa(data: Khoa): Promise<Khoa> {
  const { ma_khoa, ten_khoa, mo_ta, truong_khoa_id } = data;

  const [result] = await pool.execute<any>(
    `INSERT INTO khoa (ma_khoa, ten_khoa, mo_ta, truong_khoa_id)
     VALUES (?, ?, ?, ?)`,
    [ma_khoa, ten_khoa, mo_ta ?? null, truong_khoa_id ?? null]
  );

  const insertedId = result.insertId as number;
  return getKhoaById(insertedId) as Promise<Khoa>;
}


export async function getKhoaById(id: number): Promise<Khoa | null> {
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM khoa WHERE id = ?',
    [id]
  );

  if (rows.length === 0) return null;
  return rows[0] as Khoa;
}

export async function searchKhoa(keyword?: string): Promise<Khoa[]> {
  if (keyword && keyword.trim() !== '') {
    const like = `%${keyword.trim()}%`;
    const [rows] = await pool.execute<any[]>(
      `SELECT * FROM khoa
       WHERE ma_khoa LIKE ? OR ten_khoa LIKE ?
       ORDER BY id DESC`,
      [like, like]
    );
    return rows as Khoa[];
  } else {
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM khoa ORDER BY id DESC'
    );
    return rows as Khoa[];
  }
}


export async function updateKhoa(id: number, data: Khoa): Promise<Khoa | null> {
  const { ma_khoa, ten_khoa, mo_ta, truong_khoa_id } = data;

  await pool.execute(
    `UPDATE khoa
     SET ma_khoa = ?, ten_khoa = ?, mo_ta = ?, truong_khoa_id = ?
     WHERE id = ?`,
    [ma_khoa, ten_khoa, mo_ta ?? null, truong_khoa_id ?? null, id]
  );

  return getKhoaById(id);
}


export async function deleteKhoa(id: number): Promise<boolean> {
  const [result] = await pool.execute<any>(
    'DELETE FROM khoa WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}
