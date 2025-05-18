import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import mysql, { Pool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

import { categories, products, blogs, emailSubscriptions } from '../db/schema';
import * as schema from '../db/schema';

const app = express();

app.use(cors());
app.use(express.json());

const dbCredentials = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};
console.log(dbCredentials)

const pool: Pool = mysql.createPool({
    host: dbCredentials.host,
    port: dbCredentials.port,
    database: dbCredentials.database,
    user: dbCredentials.user,
    password: dbCredentials.password,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testDatabaseConnection() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Database connection successful!');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

testDatabaseConnection();

const db = drizzle(pool, { schema, mode: 'default' });

process.on('SIGINT', async () => {
    console.log('Closing MySQL connection pool...');
    await pool.end();
    console.log('MySQL connection pool closed.');
    process.exit(0);
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvsy8zqhe',
    api_key: process.env.CLOUDINARY_API_KEY || '938245549435185',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'u4FX3a69r-ZKWnrGg-DQd2skHVU',
});
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});
const upload = multer({ storage });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

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

app.post('/auth/signin', (req, res): any => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'superpassword001') {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token });
    } else {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.post('/auth/signout', (req, res): any => {
    return res.json({ message: 'Signed out successfully' });
});

app.get('/products/:id', authenticateToken, async (req, res): Promise<any> => {
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

app.post('/products', authenticateToken, upload.single('picture'), async (req, res) => {
    const { name, price, description, categoryId, imageUrl } = req.body;
    let pictureUrl: string | undefined;

    try {
        if (req.file) {
            const result: any = await cloudinary.uploader.upload(req.file.path);
            pictureUrl = result.secure_url;
            fs.unlinkSync(req.file.path);
        } else if (imageUrl && imageUrl.trim() !== '') {
            pictureUrl = imageUrl.trim();
        }

        const [newProduct] = await db.insert(products).values({
            name,
            price: parseFloat(price).toString(),
            description,
            categoryId: parseInt(categoryId),
            picture: pictureUrl || '',
        });

        const insertedProduct = await db.select().from(products).orderBy(eq(products.id, newProduct.insertId)).limit(1);


        res.json(insertedProduct[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error creating product' });
    }
});



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

app.get('/categories/:id', async (req, res): Promise<any> => {
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

app.post('/categories', authenticateToken, async (req, res): Promise<any> => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    try {
        const [newCategory] = await db.insert(categories).values({ name });

        const insertedCategory = await db.select().from(categories).orderBy(eq(categories.id, newCategory.insertId)).limit(1);

        res.json(insertedCategory[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error creating category' });
    }
});

app.put('/categories/:id', authenticateToken, async (req, res): Promise<any> => {
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

app.delete('/categories/:id', authenticateToken, async (req, res): Promise<any> => {
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
        });

        const insertedBlog = await db.select().from(blogs).orderBy(eq(blogs.id, newBlog.insertId)).limit(1);

        res.json(insertedBlog[0]);

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

app.get('/subscriptions', async (req, res): Promise<any> => {
    try {
        const emails = await db.select().from(emailSubscriptions);
        res.json(emails);
    } catch (error) {
        console.error('Error fetching email subscriptions:', error);
        res.status(500).json({ error: 'Error fetching email subscriptions' });
    }
});

app.post('/subscriptions', async (req, res): Promise<any> => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address format.' });
    }

    try {
        const [newSubscription] = await db.insert(emailSubscriptions).values({
            email: email,
        });

        const insertedSubscription = await db.select().from(emailSubscriptions).orderBy(eq(emailSubscriptions.id, newSubscription.insertId)).limit(1);

        res.status(201).json(insertedSubscription[0]);
    } catch (error: any) {
        console.error('Error creating email subscription:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'This email is already subscribed.' });
        }

        res.status(500).json({ error: 'Error creating email subscription.' });
    }
});
app.get("test", (req, res) => {
    res.json({ message: "Hello from the test endpoint!" });
}
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
