import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

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

const pool = mysql.createPool({
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

function authenticateToken(req:any, res:any, next:any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err:any, user:any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
});

transporter.verify(function (error, success) {
    if (error) {
        console.error("Transporter verification failed:", error);
        console.error("Please check your .env file and network connectivity.");
    } else {
        console.log("Server is ready to send messages using cPanel SMTP!");
    }
});

const NOVACREST_WELCOME_HTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: none;
            width: 100% !important;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border: 1px solid #e9e9e9;
        }
        .header {
            background-color: #2c7da0;
            padding: 20px 20px;
            text-align: center;
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
        }
        .header h1 {
            margin: 0;
            line-height: 1.2;
        }
        .content {
            padding: 30px;
            color: #333333;
            line-height: 1.6;
            font-size: 16px;
        }
        .content h2 {
            color: #2c7da0;
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 20px;
        }
        .button-container {
            text-align: center;
            padding: 20px 0;
        }
        .button {
            display: inline-block;
            background-color: #34a0a4;
            color: #ffffff;
            padding: 14px 30px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            font-size: 18px;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #26797b;
        }
        .footer {
            background-color: #f0f0f0;
            padding: 20px 30px;
            text-align: center;
            font-size: 13px;
            color: #777777;
            border-top: 1px solid #e0e0e0;
        }
        .footer a {
            color: #2c7da0;
            text-decoration: none;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Welcome to Novacrest Pharmacy!</h1>
        </div>
        <div class="content">
            <p>Dear Valued Customer,</p>
            <p>We're absolutely thrilled to welcome you to the Novacrest Pharmacy family! Your health and well-being are our top priority, and we're committed to providing you with trusted medications, expert advice, and compassionate care.</p>
            <p>At Novacrest, we believe in a healthier community, one person at a time. Whether you need a prescription filled, over-the-counter essentials, or personalized health consultations, our dedicated team is here to support you every step of the way.</p>
            <h2>Why Choose Novacrest Pharmacy?</h2>
            <ul>
                <li><strong>Expert Pharmacists:</strong> Our knowledgeable team is always ready to offer professional advice.</li>
                <li><strong>Quality Products:</strong> We stock a wide range of reliable and effective health products.</li>
                <li><strong>Personalized Care:</strong> Your unique health needs are important to us.</li>
                <li><strong>Community Focused:</strong> We're more than just a pharmacy; we're your health partner.</li>
            </ul>
            <p>We invite you to visit us and experience the Novacrest difference firsthand. Our friendly staff is eager to assist you with all your pharmaceutical needs.</p>
            <div class="button-container">
                <a href="https://www.novacrest.com.ng" class="button">Visit Our Pharmacy</a>
            </div>
            <p>Thank you for choosing Novacrest Pharmacy. We look forward to serving you!</p>
            <p>Warmly,</p>
            <p>The Team at Novacrest Pharmacy</p>
        </div>
        <div class="footer">
            <p>Novacrest Pharmacy &copy; 2025. All rights reserved.</p>
            <p>Shop 4 Yummy Yummy Plaza, Sam Ethnan Air Force Base, Ikeja, Lagos</p>
            <p><a href="tel:+2349165434330">+234 916 543 4330</a> | <a href="mailto:info@novacrest.com.ng">info@novacrest.com.ng</a></p>
        </div>
    </div>
</body>
</html>
`;

async function sendNovacrestWelcomeEmail(toEmail:any) {
    const senderName = process.env.SENDER_NAME || 'Novacrest Pharmacy';

    try {
        const info = await transporter.sendMail({
            from: `"${senderName}" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: 'Welcome to Novacrest Pharmacy - Your Health Partner!',
            html: NOVACREST_WELCOME_HTML,
        });
        console.log(`Welcome message sent to ${toEmail}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`Error sending welcome email to ${toEmail}:`, error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

app.post('/auth/signin', (req:any, res:any) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'superpassword001') {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token });
    } else {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.post('/auth/signout', (req:any, res:any) => {
    return res.json({ message: 'Signed out successfully' });
});

app.get('/products/:id', authenticateToken, async (req:any, res:any) => {
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
    let pictureUrl;

    try {
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
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
    let pictureUrl;
    try {
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
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

app.get('/categories/:id', async (req:any, res:any) => {
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

app.post('/categories', authenticateToken, async (req:any, res:any) => {
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

app.put('/categories/:id', authenticateToken, async (req:any, res:any) => {
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

app.delete('/categories/:id', authenticateToken, async (req:any, res:any) => {
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
    let thumbnailUrl;
    try {
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
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
    let thumbnailUrl;
    try {
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
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

app.get('/subscriptions', async (req, res) => {
    try {
        const emails = await db.select().from(emailSubscriptions);
        res.json(emails);
    } catch (error) {
        console.error('Error fetching email subscriptions:', error);
        res.status(500).json({ error: 'Error fetching email subscriptions' });
    }
});

app.post('/subscriptions', async (req:any, res:any) => {
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

        const emailSendResult = await sendNovacrestWelcomeEmail(email);

        res.status(201).json({
            message: 'Email subscribed successfully!',
            subscription: insertedSubscription[0],
            emailStatus: emailSendResult.success ? 'Welcome email sent.' : `Welcome email failed to send: ${emailSendResult.error}`
        });

    } catch (error) {
        console.error('Error creating email subscription:', error);

        if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'ER_DUP_ENTRY') {
            await sendNovacrestWelcomeEmail(email);
            return res.status(409).json({ error: 'This email is already subscribed. Welcome email re-sent.' });
        }

        res.status(500).json({ error: 'Error creating email subscription.' });
    }
});

app.get("/test", (req, res) => {
    res.json({ message: "Hello from the test endpoint!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;