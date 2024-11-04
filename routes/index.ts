import express from 'express';

interface Article {
  imageUrl: string;
  title: string;
  description: string;
  tag: string;
}

interface Post {
  title: string;
  date: string;
  url: string;
  iconColor: string;
  iconSvg: string;
}

const router = express.Router();

router.get('/', (req, res) => {
  // Initialize empty arrays with proper typing
  const featuredArticles: Article[] = [];
  const recentPosts: Post[] = [];

  res.render('index', { 
    title: 'TechFancy Blog - Home',
    featuredArticles,
    recentPosts
  });
});

export default router;