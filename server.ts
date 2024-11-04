import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import indexRouter from './routes/index';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to the database at:', res.rows[0].now);
  }
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make the pool available in the request object
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.pool = pool;
  next();
});

// Routes
app.use('/', indexRouter);
app.use('/admin', adminRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).render('error', { message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Add this to make TypeScript recognize the pool property on the request object
declare global {
  namespace Express {
    interface Request {
      pool: Pool;
    }
  }
}

export default app;