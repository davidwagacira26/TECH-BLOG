import express from 'express';

interface Post {
  id: number;
  title: string;
  excerpt: string;
}

const router = express.Router();

router.get('/posts', (req, res) => {
  // Sample posts data
  const posts: Post[] = [
    {
      id: 1,
      title: "Introduction to TypeScript",
      excerpt: "Learn the basics of TypeScript and how it can improve your JavaScript development."
    },
    {
      id: 2,
      title: "React Hooks Explained",
      excerpt: "Dive deep into React Hooks and discover how they can simplify your component logic."
    },
    {
      id: 3,
      title: "Building RESTful APIs with Node.js",
      excerpt: "Explore the process of creating robust RESTful APIs using Node.js and Express."
    },
    {
      id: 4,
      title: "CSS Grid Layout Mastery",
      excerpt: "Master the powerful CSS Grid Layout system and create complex layouts with ease."
    },
    {
      id: 5,
      title: "JavaScript ES6+ Features",
      excerpt: "Discover the latest features in JavaScript and how they can enhance your coding efficiency."
    }
  ];

  res.render('posts', { 
    title: 'Tech Blog - Latest Posts',
    posts: posts
  });
});

export default router;