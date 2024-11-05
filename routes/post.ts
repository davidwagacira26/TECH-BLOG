import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    if (!post) {
      return res.status(404).render('error', { message: 'Post not found' });
    }

    const relatedPosts = await prisma.post.findMany({
      where: {
        OR: [
          { categories: { some: { id: { in: post.categories.map(c => c.id) } } } },
          { tags: { some: { id: { in: post.tags.map(t => t.id) } } } }
        ],
        NOT: { id: post.id }
      },
      take: 2,
      include: {
        author: true,
        categories: true,
        tags: true
      }
    });

    res.render('post', { post, relatedPosts });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).render('error', { message: 'An error occurred while fetching the post' });
  }
});

export default router;