
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

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

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  profile_picture: u.profile_picture || null
});

const createToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2) {
      return res.status(400).json({
        message: 'Name must be at least 2 characters.'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Enter a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.'
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, profile_picture`,
      [name, email, hash]
    );

    const user = rows[0];
    res.status(201).json({
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'An account with that email already exists.'
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
      'SELECT id, name, email, role, password_hash, profile_picture FROM users WHERE email = $1',
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
      `SELECT id, name, email, role, profile_picture
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

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();

    if (name.length < 2 || name.length > 120) {
      return res.status(400).json({
        message: 'Name must be between 2 and 120 characters.'
      });
    }

    if (email.length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Enter a valid email address.'
      });
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET name = $1, email = $2
       WHERE id = $3
       RETURNING id, name, email, role, profile_picture`,
      [name, email, req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    res.json({ user: publicUser(rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'An account with that email already exists.'
      });
    }
    next(error);
  }
});

router.put('/password', authenticate, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!currentPassword || newPassword.length < 8) {
      return res.status(400).json({
        message: 'Enter your current password and a new password of at least 8 characters.'
      });
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
         RETURNING id, name, email, role, profile_picture`,
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
