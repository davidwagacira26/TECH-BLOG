import express from 'express';
import { getPosts, createPost, updatePost, deletePost } from '../controllers/posts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const posts = await getPosts(req, res);
    res.render('admin', { posts });
  } catch (error) {
    res.status(500).render('error', { message: 'Error fetching posts' });
  }
});

router.post('/posts', async (req, res) => {
  try {
    const newPost = await createPost(req, res);
    res.redirect('/admin');
  } catch (error) {
    res.status(400).render('error', { message: 'Error creating post' });
  }
});

router.post('/posts/:id', async (req, res) => {
  try {
    const updatedPost = await updatePost(req, res);
    res.redirect('/admin');
  } catch (error) {
    res.status(400).render('error', { message: 'Error updating post' });
  }
});

router.post('/posts/:id/delete', async (req, res) => {
  try {
    await deletePost(req, res);
    res.redirect('/admin');
  } catch (error) {
    res.status(400).render('error', { message: 'Error deleting post' });
  }
});

export default router;