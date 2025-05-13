import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Import schema from your models file
import { categories, products, blogs } from '../db/schema';

const app = express();

// Middleware for CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize Postgres connection and Drizzle ORM instance
const pool = new Pool({
  connectionString:  'postgresql://postgres.aatktzqdrxfshlgjskzo:thefutureofcoding@aws-0-us-east-2.pooler.supabase.com:5432/postgres'
});
const db = drizzle(pool);

// Configure Cloudinary (replace with your actual credentials)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvsy8zqhe',
  api_key: process.env.CLOUDINARY_API_KEY || '938245549435185',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'u4FX3a69r-ZKWnrGg-DQd2skHVU',
});
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up multer to use disk storage in an "uploads/" folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Create a unique filename using the current timestamp and original name
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// JWT secret (store securely in environment variables for production)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware to authenticate JWT tokens
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ---------------------------
// AUTHENTICATION ROUTES
// ---------------------------

app.post('/auth/signin', (req, res):any => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'superpassword001') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  } else {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/auth/signout', (req, res):any => {
  return res.json({ message: 'Signed out successfully' });
});

// ---------------------------
// PRODUCTS ROUTES
// ---------------------------

// get single product
app.get('/products/:id', authenticateToken, async (req, res):Promise<any> => {
  const productId = req.params.id;

  try {
    const product = await db.select().from(products).where(eq(products.id, parseInt(productId))).limit(1);

    if (!product.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching product' });
  }
});


// Get all products with their category info
app.get('/products', authenticateToken, async (req, res) => {
  try {
    const productsWithCategory = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        picture: products.picture,
        description: products.description,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));
    res.json(productsWithCategory);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// create a single product
app.post('/products', authenticateToken, upload.single('picture'), async (req, res) => {
  const { name, price, description, categoryId, imageUrl } = req.body;
  let pictureUrl: string | undefined;
  
  try {
    if (req.file) {
      // If a file is uploaded, use Cloudinary to upload it
      const result: any = await cloudinary.uploader.upload(req.file.path);
      pictureUrl = result.secure_url;
      fs.unlinkSync(req.file.path); // Clean up the local file
    } else if (imageUrl && imageUrl.trim() !== '') {
      // Otherwise, use the manually provided image URL
      pictureUrl = imageUrl.trim();
    }

    const [newProduct] = await db.insert(products).values({
      name,
      price: parseFloat(price).toString(),
      description,
      categoryId: parseInt(categoryId),
      picture: pictureUrl || '', // If neither, store an empty string
    }).returning();

    res.json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error creating product' });
  }
});



// Update a product (with optional file upload for picture)
app.put('/products/:id', authenticateToken, upload.single('picture'), async (req, res) => {
  const productId = req.params.id;
  const { name, price, description, categoryId } = req.body;
  let pictureUrl: string | undefined;
  try {
    if (req.file) {
      const result: any = await cloudinary.uploader.upload(req.file.path);
      pictureUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }
    await db.update(products)
      .set({
        name,
        price: parseFloat(price).toString(),
        description,
        categoryId: parseInt(categoryId),
        ...(pictureUrl ? { picture: pictureUrl } : {}),
      })
      .where(eq(products.id, parseInt(productId)));
    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating product' });
  }
});

// Delete a product by ID
app.delete('/products/:id', authenticateToken, async (req, res) => {
  const productId = req.params.id;
  try {
    await db.delete(products)
      .where(eq(products.id, parseInt(productId)));
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// ---------------------------
// CATEGORIES ROUTE
// ---------------------------
app.get('/categories/:id',  async (req, res): Promise<any> => {
  const categoryId = req.params.id;

  try {
    const category = await db.select().from(categories).where(eq(categories.id, parseInt(categoryId))).limit(1);

    if (!category.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching category' });
  }
});


app.get('/categories', async (req, res) => {
  try {
    const allCategories = await db.select().from(categories);
    res.json(allCategories);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

// Create a new category
app.post('/categories', authenticateToken, async (req, res):Promise<any> => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  try {
    const [newCategory] = await db.insert(categories).values({ name }).returning();
    res.json(newCategory);
  } catch (error) {
    res.status(500).json({ error: 'Error creating category' });
  }
});

// Update a category
app.put('/categories/:id', authenticateToken, async (req, res):Promise<any> => {
  const categoryId = req.params.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  try {
    await db.update(categories)
      .set({ name })
      .where(eq(categories.id, parseInt(categoryId)));

    res.json({ message: 'Category updated' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating category' });
  }
});

// Delete a category (only if no products exist in it)
app.delete('/categories/:id', authenticateToken, async (req, res):Promise<any> => {
  const categoryId = parseInt(req.params.id);

  if (isNaN(categoryId)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  try {
    await db.delete(categories).where(eq(categories.id, categoryId));
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting category' });
  }
});



// ---------------------------
// BLOGS ROUTES
// ---------------------------
app.get('/blogs/:id', async (req, res) => {
  const blogId = req.params.id;
  console.log("Received blog ID:", blogId);
  try {
    const blog = await db.select().from(blogs).where(eq(blogs.id, parseInt(blogId)));
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching blog' });
  }
});

app.get('/blogs', async (req, res) => {
  try {
    const allBlogs = await db.select().from(blogs);
    res.json(allBlogs);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching blogs' });
  }
});



app.post('/blogs', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  const { title, content } = req.body;
  let thumbnailUrl: string | undefined;
  try {
    if (req.file) {
      const result: any = await cloudinary.uploader.upload(req.file.path);
      thumbnailUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }
    const [newBlog] = await db.insert(blogs).values({
      title,
      content,
      thumbnail: thumbnailUrl || '',
    }).returning();
    res.json(newBlog);
  } catch (error) {
    res.status(500).json({ error: 'Error creating blog' });
  }
});

app.put('/blogs/:id', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  const blogId = req.params.id;
  const { title, content } = req.body;
  let thumbnailUrl: string | undefined;
  try {
    if (req.file) {
      const result: any = await cloudinary.uploader.upload(req.file.path);
      thumbnailUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }
    await db.update(blogs)
      .set({
        title,
        content,
        ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
      })
      .where(eq(blogs.id, parseInt(blogId)));
    res.json({ message: 'Blog updated' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating blog' });
  }
});

app.delete('/blogs/:id', authenticateToken, async (req, res) => {
  const blogId = req.params.id;
  try {
    await db.delete(blogs)
      .where(eq(blogs.id, parseInt(blogId)));
    res.json({ message: 'Blog deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting blog' });
  }
});

// ---------------------------
// START THE SERVER
// ---------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
