import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import officeParser from 'officeparser';
import { initDb, openDb } from './db.js';
import { generateQuizFromAI } from './gemini.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'handong-secret-key';

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Database Initialization
initDb().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Auth Middleware
interface AuthRequest extends Request {
  user?: { id: number, role: string, username: string };
}

const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    if (token) {
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          return res.sendStatus(403);
        }
        req.user = user as any;
        next();
      });
    } else {
      res.sendStatus(401);
    }
  } else {
    res.sendStatus(401);
  }
};

const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  const { username, password, role, adminSecret } = req.body;
  const db = await openDb();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let userRole = 'user';
    
    // Check if user is trying to become an admin
    if (role === 'admin') {
      if (adminSecret === process.env.ADMIN_SECRET_KEY) {
        userRole = 'admin';
      } else {
        return res.status(403).json({ message: 'Invalid Admin Secret Key' });
      }
    }
    
    await db.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, hashedPassword, userRole]
    );
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Username already exists' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await openDb();

  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

  if (user && await bcrypt.compare(password, user.password_hash)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Subject & Material Routes
app.get('/api/subjects', async (req, res) => {
  const db = await openDb();
  const subjects = await db.all('SELECT * FROM subjects');
  res.json(subjects);
});

app.post('/api/admin/subjects', authenticateJWT, isAdmin, async (req, res) => {
  const { name } = req.body;
  const db = await openDb();
  try {
    await db.run('INSERT INTO subjects (name) VALUES (?)', [name]);
    res.status(201).json({ message: 'Subject added' });
  } catch (error) {
    res.status(400).json({ message: 'Subject already exists' });
  }
});

app.post('/api/admin/materials', authenticateJWT, isAdmin, async (req, res) => {
  const { subject_id, content } = req.body;
  const db = await openDb();
  await db.run('INSERT INTO materials (subject_id, content) VALUES (?, ?)', [subject_id, content]);
  res.status(201).json({ message: 'Material added' });
});

app.post('/api/admin/materials/upload', authenticateJWT, isAdmin, upload.single('file'), async (req: any, res) => {
  const { subject_id } = req.body;
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const ast = await officeParser.parseOffice(req.file.buffer);
    const content = ast.toText();
    const db = await openDb();
    await db.run('INSERT INTO materials (subject_id, content) VALUES (?, ?)', [subject_id, content]);
    res.status(201).json({ message: 'Material uploaded and added' });
  } catch (error) {
    console.error('File parsing error:', error);
    res.status(500).json({ message: 'Failed to parse file' });
  }
});

// Quiz Generation
app.post('/api/quiz/generate', authenticateJWT, async (req: AuthRequest, res) => {
  const { subject_id } = req.body;
  const userId = req.user!.id;
  const db = await openDb();

  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  const today = new Date().toISOString().split('T')[0];

  let dailyCount = user.daily_count;
  if (user.last_quiz_date !== today) {
    dailyCount = 0;
  }

  if (dailyCount >= 2) {
    return res.status(403).json({ message: 'Daily quiz limit (2) reached. Come back tomorrow!' });
  }

  // Get random material for the subject
  const materials = await db.all('SELECT content FROM materials WHERE subject_id = ?', [subject_id]);
  if (materials.length === 0) {
    return res.status(404).json({ message: 'No materials found for this subject' });
  }

  const randomMaterial = materials[Math.floor(Math.random() * materials.length)].content;

  try {
    const quiz = await generateQuizFromAI(randomMaterial);
    
    // Update daily count
    await db.run(
      'UPDATE users SET daily_count = ?, last_quiz_date = ? WHERE id = ?',
      [dailyCount + 1, today, userId]
    );

    res.json(quiz);
  } catch (error: any) {
    console.error('Quiz Generation Error:', error);
    res.status(500).json({ message: `AI Quiz generation failed: ${error.message || 'Unknown error'}` });
  }
});

// Quiz Submission
app.post('/api/quiz/submit', authenticateJWT, async (req: AuthRequest, res) => {
  const { subject_id, score } = req.body;
  const userId = req.user!.id;
  const db = await openDb();

  await db.run(
    'INSERT INTO quiz_records (user_id, subject_id, score) VALUES (?, ?, ?)',
    [userId, subject_id, score]
  );

  await db.run(
    'UPDATE users SET total_points = total_points + ? WHERE id = ?',
    [score, userId]
  );

  res.json({ message: 'Quiz score submitted' });
});

// Ranking Route
app.get('/api/ranking', async (req, res) => {
  const db = await openDb();
  const ranking = await db.all(
    'SELECT username, total_points FROM users ORDER BY total_points DESC LIMIT 10'
  );
  res.json(ranking);
});

// Serve static files from the React app
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Handong BrainLeague Server is running. Client build not found.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Handong BrainLeague Server is running on http://localhost:${PORT}`);
});
