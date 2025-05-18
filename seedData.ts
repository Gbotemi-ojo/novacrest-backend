import db from './db/index' // Adjust based on your project structure
import { categories, products, blogs } from './db/schema';
import { eq } from 'drizzle-orm';

async function insertIfNotExists<T>(
  table: any,
  checkField: keyof T,
  data: T[]
) {
  for (const item of data) {
    const existing = await (await db)
      .select()
      .from(table)
      .where(eq(table[checkField as string], item[checkField]))
      .limit(1);

    if (existing.length === 0) {
      await (await db).insert(table).values(item as { [x: string]: any });
    }
  }
}

async function seed() {
  try {
    console.log('Seeding database...');

    // Seed Categories
    const categoriesData = [
      { name: 'Electronics' },
      { name: 'Clothing' },
      { name: 'Books' },
      { name: 'Home & Kitchen' },
    ];
    await insertIfNotExists(categories, 'name', categoriesData);

    // Fetch inserted categories to get their IDs
    const categoryRecords = await (await db).select().from(categories);

    // Seed Products
    const productsData = [
      {
        name: 'Smartphone',
        price: 699.99,
        description: 'Latest 5G smartphone',
        categoryId: categoryRecords.find((c) => c.name === 'Electronics')?.id!,
        picture: 'https://example.com/smartphone.jpg',
      },
      {
        name: 'T-Shirt',
        price: 19.99,
        description: 'Comfortable cotton T-shirt',
        categoryId: categoryRecords.find((c) => c.name === 'Clothing')?.id!,
        picture: 'https://example.com/tshirt.jpg',
      },
      {
        name: 'Cookbook',
        price: 29.99,
        description: 'A book full of delicious recipes',
        categoryId: categoryRecords.find((c) => c.name === 'Books')?.id!,
        picture: 'https://example.com/cookbook.jpg',
      },
    ];
    await insertIfNotExists(products, 'name', productsData);

    // Seed Blogs
    const blogsData = [
      {
        title: 'The Future of Tech',
        content: '<p>Technology is evolving rapidly...</p>',
        thumbnail: 'https://example.com/tech.jpg',
      },
      {
        title: 'Fashion Trends in 2025',
        content: '<p>Upcoming fashion trends include...</p>',
        thumbnail: 'https://example.com/fashion.jpg',
      },
    ];
    await insertIfNotExists(blogs, 'title', blogsData);

    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit();
  }
}
seed()
