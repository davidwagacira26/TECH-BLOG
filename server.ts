import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import multer from 'multer';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import { expressjwt } from 'express-jwt';
import indexRouter from './routes/';
import adminRouter from './routes/admin';
import blogRoutes from './routes/blog';
import postRoutes from './routes/post'

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to ensure directory exists
async function ensureDirectoryExists(directory: string) {
  try {
    await fs.access(directory);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      await fs.mkdir(directory, { recursive: true });
    } else {
      throw error;
    }
  }
}

// Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    try {
      await ensureDirectoryExists(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Middleware
app.set('view engine', 'ejs');

// Use path.resolve to get the absolute path to the project root
const projectRoot = path.resolve(__dirname, '..');
app.set('views', path.join(projectRoot, 'views'));

// Log the views directory for debugging
console.log('Views directory:', app.get('views'));

app.use(express.static(path.join(projectRoot, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// JWT Authentication Middleware
const authMiddleware = expressjwt({
  secret: JWT_SECRET,
  algorithms: ['HS256']
}).unless({ path: ['/login', '/', '/blog'] });

// Function to generate a JWT token
function generateToken(user: { id: number, email: string }) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
}

// Temporary login route (for testing purposes)
app.post('/login', (req: Request, res: Response) => {
  // TODO: Implement actual user authentication
  const user = { id: 1, email: 'user@example.com' };
  const token = generateToken(user);
  res.json({ token });
});

// Routes
app.use('/', indexRouter);
app.use('/admin', adminRouter); // authMiddleware is now applied globally
app.use('/', blogRoutes);
app.use('/post', postRoutes);

// File upload route example
app.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).send('No file uploaded.');
  } else {
    res.send('File uploaded successfully.');
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Invalid token' });
  } else {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something went wrong!' });
  }
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Project root: ${projectRoot}`);
});

// Export app and server for testing purposes
export { app, server };