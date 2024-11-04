import express from 'express';
import { getPosts } from '../controllers/posts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const posts = await getPosts(req, res);
    res.render('index', { posts });
  } catch (error) {
    res.status(500).render('error', { message: 'Error fetching posts' });
  }
});

export default router;