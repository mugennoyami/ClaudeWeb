import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from './config.js';
import { ApiError } from './errors.js';

const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const FILE_NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

fs.mkdirSync(config.uploadDir, { recursive: true });

// Dateien werden mit zufälligem Namen gespeichert, nie mit dem Originalnamen.
export const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXTENSIONS[file.mimetype]),
  }),
  limits: { fileSize: 6 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => {
    if (!EXTENSIONS[file.mimetype]) return cb(new ApiError(400, 'Nur JPG, PNG oder WebP sind erlaubt.'));
    cb(null, true);
  },
});

// Prüft die echten Datei-Signaturen, nicht nur den vom Browser gemeldeten Typ.
export function verifyImage(filePath, mimetype) {
  const fd = fs.openSync(filePath, 'r');
  const head = Buffer.alloc(12);
  fs.readSync(fd, head, 0, 12, 0);
  fs.closeSync(fd);
  if (mimetype === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (mimetype === 'image/png') return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === 'image/webp') return head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

export function removeUpload(fileName) {
  if (!FILE_NAME_RE.test(fileName)) return;
  fs.rmSync(path.join(config.uploadDir, fileName), { force: true });
}
