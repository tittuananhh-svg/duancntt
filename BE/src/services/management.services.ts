import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { ENV } from '../config/env';
import { log } from 'console';

import { pool } from '../config/database';

