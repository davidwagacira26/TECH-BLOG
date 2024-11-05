import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const featuredPosts = await prisma.post.findMany({
      where: {
        isFeatured: true,
      },
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    const recentPosts = await prisma.post.findMany({
      orderBy: {
        date: 'desc'
      },
      take: 5,
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    // Remove <p> tags from the beginning of the content
    const formatContent = (content: string) => {
      return content.replace(/^<p>/, '').replace(/<\/p>$/, '');
    };

    featuredPosts.forEach(post => {
      post.content = formatContent(post.content);
    });

    recentPosts.forEach(post => {
      post.content = formatContent(post.content);
    });

    res.render('index', {
      title: 'TechFancy - Exploring the Cutting Edge of Technology',
      featuredPosts,
      recentPosts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).render('error', { message: 'An error occurred while fetching posts' });
  }
});

export default router;