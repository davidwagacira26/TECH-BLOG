import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, Post, Category, Tag, User } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import { expressjwt } from 'express-jwt';

const router = express.Router();
const prisma = new PrismaClient();

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// JWT Authentication Middleware
const authMiddleware = expressjwt({
  secret: JWT_SECRET,
  algorithms: ['HS256']
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

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
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

// Types
type PostWithRelations = Post & {
  categories: Category[];
  tags: Tag[];
  author: User;
};

interface PostRequestBody {
  title: string;
  content: string;
  date: string;
  status: string;
  isFeatured?: string;
  isRecent?: string;
  categoryIds?: string[];
  tagIds?: string[];
}

interface RequestParams {
  id?: string;
  action?: 'create' | 'update';
}

type RouteHandler<P = {}, ResBody = any, ReqBody = any> = (
  req: Request<P, ResBody, ReqBody>,
  res: Response<ResBody>,
  next: NextFunction
) => Promise<void>;

// Custom PostCreateInput type
type PostCreateInput = Prisma.PostCreateInput & {
  thumbnail?: string;
};

// Function to generate a JWT token
function generateToken(user: { id: number, email: string }) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
}

// Login route
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.password === password) { // In a real app, use proper password hashing
      const token = generateToken(user);
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error during login' });
  }
});

// Admin Dashboard Route
export const getDashboard: RouteHandler = async (req, res, next) => {
  try {
    const filter = req.query.filter as string | undefined;
    let posts: PostWithRelations[];

    const include = {
      categories: true,
      tags: true,
      author: true
    };

    if (filter === 'featured') {
      posts = await prisma.post.findMany({
        where: { isFeatured: true },
        orderBy: { date: 'desc' },
        include
      });
    } else if (filter === 'recent') {
      posts = await prisma.post.findMany({
        where: { isRecent: true },
        orderBy: { date: 'desc' },
        include
      });
    } else {
      posts = await prisma.post.findMany({
        orderBy: { date: 'desc' },
        include
      });
    }

    const categories = await prisma.category.findMany();
    const tags = await prisma.tag.findMany();

    res.render('admin', { posts, categories, tags, activeTab: filter || 'all' });
  } catch (error) {
    next(error);
  }
};

// Create/Update Post Handler
export const handlePost: RouteHandler<RequestParams, any, PostRequestBody> = async (req, res) => {
  try {
    const { action, id } = req.params;
    const { title, content, date, status, isFeatured, isRecent, categoryIds, tagIds } = req.body;

    if (!title || !content || !date || !status) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }

    const defaultAuthor = await prisma.user.findUnique({
      where: { email: 'davidwagacira26@gmail.com' }
    });

    if (!defaultAuthor) {
      res.status(500).json({
        success: false,
        message: 'Default author not found'
      });
      return;
    }

    const thumbnail = req.file ? `/uploads/${req.file.filename}` : undefined;

    if (thumbnail) {
      const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
      await ensureDirectoryExists(uploadDir);
    }

    const basePostData: PostCreateInput = {
      title,
      content,
      date: new Date(date),
      status,
      isFeatured: isFeatured === 'on',
      isRecent: isRecent === 'on',
      thumbnail,
      author: {
        connect: { id: defaultAuthor.id }
      },
      categories: {
        connect: categoryIds?.map(id => ({ id: parseInt(id, 10) })) || []
      },
      tags: {
        connect: tagIds?.map(id => ({ id: parseInt(id, 10) })) || []
      }
    };

    let post: PostWithRelations;

    if (action === 'create') {
      post = await prisma.post.create({
        data: basePostData,
        include: {
          categories: true,
          tags: true,
          author: true
        }
      });
    } else if (action === 'update' && id) {
      const existingPost = await prisma.post.findUnique({
        where: { id: parseInt(id, 10) },
        include: { categories: true, tags: true }
      });

      if (!existingPost) {
        res.status(404).json({
          success: false,
          message: 'Post not found'
        });
        return;
      }

      if (thumbnail && existingPost.thumbnail) {
        const oldThumbnailPath = path.join(__dirname, '..', '..', 'public', existingPost.thumbnail);
        try {
          await fs.unlink(oldThumbnailPath);
        } catch (err) {
          console.error('Error deleting old thumbnail:', err);
        }
      }

      const updateData: Prisma.PostUpdateInput = {
        ...basePostData,
        categories: {
          disconnect: existingPost.categories.map(cat => ({ id: cat.id })),
          connect: categoryIds?.map(id => ({ id: parseInt(id, 10) })) || []
        },
        tags: {
          disconnect: existingPost.tags.map(tag => ({ id: tag.id })),
          connect: tagIds?.map(id => ({ id: parseInt(id, 10) })) || []
        }
      };

      post = await prisma.post.update({
        where: { id: parseInt(id, 10) },
        data: updateData,
        include: {
          categories: true,
          tags: true,
          author: true
        }
      });
    } else {
      throw new Error('Invalid action or missing ID for update');
    }

    res.json({
      success: true,
      message: `Post ${action === 'create' ? 'created' : 'updated'} successfully`,
      post
    });
  } catch (err) {
    console.error('Error handling post:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while handling the post',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

// Get Post by ID
export const getPost: RouteHandler<{ id: string }> = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        categories: true,
        tags: true,
        author: true
      }
    });

    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Post not found'
      });
      return;
    }

    res.json({
      success: true,
      post
    });
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the post',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

// Toggle Featured Status
export const toggleFeatured: RouteHandler<{ id: string }> = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Post not found'
      });
      return;
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { isFeatured: !post.isFeatured }
    });

    res.json({
      success: true,
      isFeatured: updatedPost.isFeatured
    });
  } catch (err) {
    console.error('Error toggling featured status:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while toggling featured status',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

// Toggle Recent Status
export const toggleRecent: RouteHandler<{ id: string }> = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Post not found'
      });
      return;
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { isRecent: !post.isRecent }
    });

    res.json({
      success: true,
      isRecent: updatedPost.isRecent
    });
  } catch (err) {
    console.error('Error toggling recent status:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while toggling recent status',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

// Delete Post
export const deletePost: RouteHandler<{ id: string }> = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid post ID'
      });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      res.status(404).json({
        success: false,
        message: 'Post not found'
      });
      return;
    }

    if (post.thumbnail) {
      const thumbnailPath = path.join(__dirname, '..', '..', 'public', post.thumbnail);
      try {
        await fs.unlink(thumbnailPath);
      } catch (err) {
        console.error('Error deleting thumbnail:', err);
        // Continue with post deletion even if thumbnail deletion fails
      }
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the post',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

// Search Posts
export const searchPosts: RouteHandler = async (req, res, next) => {
  try {
    const query = req.query.query as string;
    if (!query) {
      res.redirect('/admin');
      return;
    }

    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { date: 'desc' },
      include: {
        categories: true,
        tags: true,
        author: true
      }
    });

    const categories = await prisma.category.findMany();
    const tags = await prisma.tag.findMany();

    res.render('admin', { posts, categories, tags, activeTab: 'search', searchQuery: query });
  } catch (error) {
    next(error);
  }
};

// Add  Category
export const addCategory: RouteHandler<{}, any, { name: string }> = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
      return;
    }

    const category = await prisma.category.create({
      data: { name }
    });

    res.json({
      success: true,
      category
    });
  } catch (err) {
    console.error('Error adding category:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while adding the category',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

// Add Tag
export const addTag: RouteHandler<{}, any, { name: string }> = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Tag name is required'
      });
      return;
    }

    const tag = await prisma.tag.create({
      data: { name }
    });

    res.json({
      success: true,
      tag
    });
  } catch (err) {
    console.error('Error adding tag:', err);
    res.status(500).json({
      success: false,
      message: 'An error occurred while adding the tag',
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

// Image upload for TinyMCE
router.post('/upload-image', upload.single('file'), (req, res) => {
  if (req.file) {
    res.json({ location: `/uploads/${req.file.filename}` });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});

// Register routes
router.get('/', getDashboard);
router.post('/:action(create|update)/:id?', 
  upload.single('thumbnail'),
  handlePost as express.RequestHandler
);
router.get('/post/:id', getPost);
router.post('/toggle-featured/:id', toggleFeatured);
router.post('/toggle-recent/:id', toggleRecent);
router.post('/delete/:id', deletePost);
router.get('/search', searchPosts);
router.post('/add-category', addCategory);
router.post('/add-tag', addTag);

export default router;