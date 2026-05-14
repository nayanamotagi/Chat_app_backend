import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.use('/profiles', express.static(path.join(__dirname, '../uploads/profiles')));
router.use('/media', express.static(path.join(__dirname, '../uploads/media')));
router.use('/status', express.static(path.join(__dirname, '../uploads/status')));

export default router;

