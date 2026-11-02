
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const passwordRules = [
  [/^.{8,}$/, 'Password must be at least 8 characters.'],
  [/[A-Z]/, 'Password must contain at least one uppercase letter.'],
  [/[0-9]/, 'Password must contain at least one number.'],
  [/[^A-Za-z0-9]/, 'Password must contain at least one symbol.']
];

function passwordError(password) {
  return passwordRules.find(([rule]) => !rule.test(password))?.[1] || null;
}

function validBirthday(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date <= new Date();
}

function resetTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined
  });
}

async function sendResetEmail(email, token) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    throw new Error('SMTP_HOST and SMTP_FROM must be configured for password reset emails.');
  }
  const resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(token)}`;
  await resetTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset your Northstar password',
    text: `Reset your password using this link. It expires in one hour:\n\n${resetUrl}`
  });
}

const uploadDir = path.resolve('uploads/profiles');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Upload a JPG, PNG, or WebP image.'));
    }
    cb(null, true);
  }
});

const fullName = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || '';

const publicUser = (u) => ({
  id: u.id,
  name: fullName(u),
  first_name: u.first_name || '',
  last_name: u.last_name || '',
  email: u.email,
  phone: u.phone || '',
  birthday: u.birthday || null,
  role: u.role,
  profile_picture: u.profile_picture || null
});

const createToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: fullName(user)
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

router.post('/register', async (req, res, next) => {
  try {
    const firstName = String(req.body.first_name || '').trim();
    const lastName = String(req.body.last_name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');
    const address = String(req.body.address || '').trim();
    const phone = String(req.body.phone || '').trim();
    const birthday = String(req.body.birthday || '').trim();

    if (firstName.length < 2 || firstName.length > 80 ||
        lastName.length < 2 || lastName.length > 80) {
      return res.status(400).json({
        message: 'Enter a first and last name between 2 and 80 characters.'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Enter a valid email address.'
      });
    }

    const passwordMessage = passwordError(password);
    if (passwordMessage) {
      return res.status(400).json({
        message: passwordMessage
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (address.length < 8 || address.length > 500) {
      return res.status(400).json({
        message: 'Address must be between 8 and 500 characters.'
      });
    }

    if (!/^\d{11}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must contain exactly 11 digits.' });
    }
    if (!validBirthday(birthday)) {
      return res.status(400).json({ message: 'Enter a valid birthday.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, first_name, last_name, email, password_hash, phone, birthday)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, first_name, last_name, email, address, phone, birthday::text AS birthday, role, profile_picture`,
      [`${firstName} ${lastName}`, firstName, lastName, email, hash, phone, birthday]
    );

    const user = rows[0];
    await pool.query(
      `INSERT INTO addresses (user_id, label, recipient_name, phone, address_line, is_default)
       VALUES ($1, 'Default address', $2, $3, $4, TRUE)`,
      [user.id, `${firstName} ${lastName}`, phone, address]
    );
    res.status(201).json({
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        message: 'Unable to create the account. Check your details and try again.'
      });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const { rows } = await pool.query(
      'SELECT id, name, first_name, last_name, email, address, phone, birthday::text AS birthday, role, password_hash, profile_picture FROM users WHERE email = $1',
      [email]
    );

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        message: 'Email or password is incorrect.'
      });
    }

    res.json({
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, first_name, last_name, email, address, phone, birthday::text AS birthday, role, profile_picture
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    res.json({ user: publicUser(rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.get('/addresses', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, label, recipient_name, phone, address_line, is_default
       FROM addresses WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    res.json({ addresses: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/addresses', authenticate, async (req, res, next) => {
  try {
    const label = String(req.body.label || 'Address').trim().slice(0, 80) || 'Address';
    const recipientName = String(req.body.recipient_name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const addressLine = String(req.body.address_line || '').trim();
    if (recipientName.length < 2 || recipientName.length > 120) {
      return res.status(400).json({ message: 'Enter a valid recipient name.' });
    }
    if (!/^\d{11}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must contain exactly 11 digits.' });
    }
    if (addressLine.length < 8 || addressLine.length > 500) {
      return res.status(400).json({ message: 'Address must be between 8 and 500 characters.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const count = await client.query('SELECT COUNT(*)::int AS count FROM addresses WHERE user_id = $1', [req.user.id]);
      const isDefault = Boolean(req.body.is_default) || count.rows[0].count === 0;
      if (isDefault) {
        await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
      }
      const { rows } = await client.query(
        `INSERT INTO addresses (user_id, label, recipient_name, phone, address_line, is_default)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, label, recipient_name, phone, address_line, is_default`,
        [req.user.id, label, recipientName, phone, addressLine, isDefault]
      );
      await client.query('COMMIT');
      res.status(201).json({ address: rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.put('/addresses/:id', authenticate, async (req, res, next) => {
  try {
    const label = String(req.body.label || 'Address').trim().slice(0, 80) || 'Address';
    const recipientName = String(req.body.recipient_name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const addressLine = String(req.body.address_line || '').trim();
    if (recipientName.length < 2 || recipientName.length > 120) {
      return res.status(400).json({ message: 'Enter a valid recipient name.' });
    }
    if (!/^\d{11}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must contain exactly 11 digits.' });
    }
    if (addressLine.length < 8 || addressLine.length > 500) {
      return res.status(400).json({ message: 'Address must be between 8 and 500 characters.' });
    }
    if (req.body.is_default) {
      await pool.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    }
    const { rows } = await pool.query(
      `UPDATE addresses
       SET label = $1, recipient_name = $2, phone = $3, address_line = $4,
           is_default = CASE WHEN $5 THEN TRUE ELSE is_default END, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING id, label, recipient_name, phone, address_line, is_default`,
      [label, recipientName, phone, addressLine, Boolean(req.body.is_default), req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Address not found.' });
    res.json({ address: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/addresses/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id, is_default',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Address not found.' });
    if (rows[0].is_default) {
      await pool.query(
        `UPDATE addresses SET is_default = TRUE
         WHERE id = (SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1)`,
        [req.user.id]
      );
    }
    res.json({ message: 'Address deleted.' });
  } catch (error) {
    next(error);
  }
});

router.patch('/addresses/:id/default', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!found.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Address not found.' });
    }
    await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    const { rows } = await client.query(
      `UPDATE addresses SET is_default = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, label, recipient_name, phone, address_line, is_default`,
      [req.params.id, req.user.id]
    );
    await client.query('COMMIT');
    res.json({ address: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const firstName = String(req.body.first_name || '').trim();
    const lastName = String(req.body.last_name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const birthday = String(req.body.birthday || '').trim();

    if (firstName.length < 2 || firstName.length > 80 ||
        lastName.length < 2 || lastName.length > 80) {
      return res.status(400).json({
        message: 'Enter a first and last name between 2 and 80 characters.'
      });
    }

    if (email.length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Enter a valid email address.'
      });
    }

    if (!/^\d{11}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must contain exactly 11 digits.' });
    }
    if (!validBirthday(birthday)) {
      return res.status(400).json({ message: 'Enter a valid birthday.' });
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET name = $1, first_name = $2, last_name = $3, email = $4, phone = $5, birthday = $6
       WHERE id = $7
       RETURNING id, name, first_name, last_name, email, address, phone, birthday::text AS birthday, role, profile_picture`,
      [`${firstName} ${lastName}`, firstName, lastName, email, phone, birthday, req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    res.json({ user: publicUser(rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        message: 'Unable to update the profile. Check your details and try again.'
      });
    }
    next(error);
  }
});

router.put('/password', authenticate, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    const passwordMessage = passwordError(newPassword);
    if (!currentPassword || passwordMessage) {
      return res.status(400).json({
        message: passwordMessage || 'Enter your current password.'
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      rows[0].password_hash
    );

    if (!valid) {
      return res.status(400).json({
        message: 'Your current password is incorrect.'
      });

    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hash, req.user.id]
    );

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const generic = 'If an account exists for that email, a password reset link has been sent.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const { rows } = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );
    if (!rows[0]) return res.status(202).json({ message: generic });

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at <= NOW()',
      [rows[0].id]
    );
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [rows[0].id, tokenHash]
    );
    await sendResetEmail(rows[0].email, token);
    res.status(202).json({ message: generic });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');
    const passwordMessage = passwordError(password);
    if (!token || passwordMessage) {
      return res.status(400).json({ message: passwordMessage || 'Reset token is invalid.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    if (!rows[0]) return res.status(400).json({ message: 'Reset token is invalid or expired.' });

    const hash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hash, rows[0].user_id]
      );
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [rows[0].id]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/profile-picture',
  authenticate,
  (req, res, next) => {
    upload.single('profile_picture')(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message || 'Unable to upload image.'
        });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Choose an image to upload.'
        });
      }

      const picturePath = `/uploads/profiles/${req.file.filename}`;
      const { rows } = await pool.query(
        `UPDATE users
         SET profile_picture = $1
         WHERE id = $2
         RETURNING id, name, first_name, last_name, email, address, phone, birthday::text AS birthday, role, profile_picture`,
        [picturePath, req.user.id]
      );

      if (!rows[0]) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ message: 'Account not found.' });
      }

      res.json({ user: publicUser(rows[0]) });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
