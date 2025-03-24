import express from 'express';
const router = express.Router();
import {
  getDetails,
  register,
  login,
} from '../controllers/auth.js';
import { protect } from '../middleware/auth.js';

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getDetails);

export default router;
