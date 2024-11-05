import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Home page route
router.get('/', async (req, res) => {
  try {
    const featuredPosts = await prisma.post.findMany({
      where: { 
        isFeatured: true,
        status: 'Published'
      },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    const recentPosts = await prisma.post.findMany({
      where: { 
        isRecent: true,
        status: 'Published'
      },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    res.render('home', { featuredPosts, recentPosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).render('error', { message: 'Error fetching posts' });
  }
});

// Single post page route
router.get('/post/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    if (!post) {
      return res.status(404).render('error', { message: 'Post not found' });
    }

    // Fetch related posts
    const relatedPosts = await prisma.post.findMany({
      where: {
        OR: [
          { categories: { some: { id: { in: post.categories.map(c => c.id) } } } },
          { tags: { some: { id: { in: post.tags.map(t => t.id) } } } },
        ],
        NOT: { id: post.id },
        status: 'Published'
      },
      take: 4,
      include: { categories: true, tags: true },
    });

    res.render('post', { post, relatedPosts });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).render('error', { message: 'Error fetching post' });
  }
});

// Blog listing page route
router.get('/blog', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 10;

    const posts = await prisma.post.findMany({
      where: { status: 'Published' },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    const totalPosts = await prisma.post.count({ where: { status: 'Published' } });
    const totalPages = Math.ceil(totalPosts / pageSize);

    res.render('blog', { posts, currentPage: page, totalPages });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).render('error', { message: 'Error fetching blog posts' });
  }
});

// Category page route
router.get('/category/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 10;

    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).render('error', { message: 'Category not found' });
    }

    const posts = await prisma.post.findMany({
      where: { 
        categories: { some: { id: categoryId } },
        status: 'Published'
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    const totalPosts = await prisma.post.count({
      where: { 
        categories: { some: { id: categoryId } },
        status: 'Published'
      }
    });
    const totalPages = Math.ceil(totalPosts / pageSize);

    res.render('category', { category, posts, currentPage: page, totalPages });
  } catch (error) {
    console.error('Error fetching category posts:', error);
    res.status(500).render('error', { message: 'Error fetching category posts' });
  }
});

// Tag page route
router.get('/tag/:id', async (req, res) => {
  try {
    const tagId = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 10;

    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    });

    if (!tag) {
      return res.status(404).render('error', { message: 'Tag not found' });
    }

    const posts = await prisma.post.findMany({
      where: { 
        tags: { some: { id: tagId } },
        status: 'Published'
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    const totalPosts = await prisma.post.count({
      where: { 
        tags: { some: { id: tagId } },
        status: 'Published'
      }
    });
    const totalPages = Math.ceil(totalPosts / pageSize);

    res.render('tag', { tag, posts, currentPage: page, totalPages });
  } catch (error) {
    console.error('Error fetching tag posts:', error);
    res.status(500).render('error', { message: 'Error fetching tag posts' });
  }
});

// Search route
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 10;

    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
        status: 'Published'
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    const totalPosts = await prisma.post.count({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
        status: 'Published'
      }
    });
    const totalPages = Math.ceil(totalPosts / pageSize);

    res.render('search', { query, posts, currentPage: page, totalPages });
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).render('error', { message: 'Error searching posts' });
  }
});

export default router;