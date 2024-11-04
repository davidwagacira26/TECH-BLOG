import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to handle async errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => 
    Promise.resolve(fn(req, res, next)).catch(next);

// GET /admin - Render admin page
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { filter, search } = req.query;
  let posts;

  if (filter === 'featured') {
    posts = await prisma.post.findMany({ 
      where: { isFeatured: true },
      include: { author: true }
    });
  } else if (filter === 'recent') {
    posts = await prisma.post.findMany({ 
      where: { isRecent: true },
      include: { author: true }
    });
  } else if (search) {
    posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: search as string, mode: 'insensitive' } },
          { content: { contains: search as string, mode: 'insensitive' } },
        ],
      },
      include: { author: true }
    });
  } else {
    posts = await prisma.post.findMany({ include: { author: true } });
  }

  res.render('admin', { 
    posts, 
    activeTab: filter || 'all'
  });
}));

// POST /admin/create - Create a new post
router.post('/create', [
  body('title').notEmpty().trim().escape(),
  body('content').notEmpty().trim(),
  body('date').isISO8601().toDate(),
  body('status').isIn(['Draft', 'Published']),
  body('isFeatured').toBoolean(),
  body('isRecent').toBoolean(),
  body('authorId').isInt(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content, date, status, isFeatured, isRecent, authorId } = req.body;

  await prisma.post.create({
    data: {
      title,
      content,
      date,
      status,
      isFeatured,
      isRecent,
      author: {
        connect: { id: parseInt(authorId) }
      }
    },
  });

  res.redirect('/admin');
}));

// POST /admin/update/:id - Update an existing post
router.post('/update/:id', [
  body('title').notEmpty().trim().escape(),
  body('content').notEmpty().trim(),
  body('date').isISO8601().toDate(),
  body('status').isIn(['Draft', 'Published']),
  body('isFeatured').toBoolean(),
  body('isRecent').toBoolean(),
  body('authorId').isInt(),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { title, content, date, status, isFeatured, isRecent, authorId } = req.body;
  
  await prisma.post.update({
    where: { id: parseInt(id) },
    data: {
      title,
      content,
      date,
      status,
      isFeatured,
      isRecent,
      author: {
        connect: { id: parseInt(authorId) }
      }
    },
  });

  res.redirect('/admin');
}));

// POST /admin/delete/:id - Delete a post
router.post('/delete/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.post.delete({ where: { id: parseInt(id) } });
  res.redirect('/admin');
}));

// POST /admin/toggle-featured/:id - Toggle featured status
router.post('/toggle-featured/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const post = await prisma.post.findUnique({ where: { id: parseInt(id) } });
  if (post) {
    await prisma.post.update({
      where: { id: parseInt(id) },
      data: { isFeatured: !post.isFeatured },
    });
  }
  res.redirect('/admin');
}));

// POST /admin/toggle-recent/:id - Toggle recent status
router.post('/toggle-recent/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const post = await prisma.post.findUnique({ where: { id: parseInt(id) } });
  if (post) {
    await prisma.post.update({
      where: { id: parseInt(id) },
      data: { isRecent: !post.isRecent },
    });
  }
  res.redirect('/admin');
}));

// GET /admin/users - List all users
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany();
  res.render('admin-users', { users });
}));

// POST /admin/users/create - Create a new user
router.post('/users/create', [
  body('username').notEmpty().trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;
  
  // In a real application, you would hash the password before storing it
  await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: password, // This should be hashed in a real application
    },
  });

  res.redirect('/admin/users');
}));

// Catch-all route to redirect to /admin
router.get('*', (req: Request, res: Response) => {
  res.redirect('/admin');
});

export default router;

// Log that the admin routes have been loaded
console.log('Admin routes loaded');