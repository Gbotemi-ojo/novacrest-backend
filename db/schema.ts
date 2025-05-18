import { serial, varchar, mysqlTable, text, decimal, int, timestamp } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// Categories table: each category has a name.
export const categories = mysqlTable("categories", {
  // 'serial' in mysql-core is an alias for auto-incrementing integer primary key
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

// Products table: a product has a name, price, picture URL, description, and belongs to a category.
export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // Using 'decimal' for price is generally more precise for currency in MySQL
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Example precision/scale
  picture: text("picture"),
  description: text("description"),
  // Using 'int' for foreign key referencing an integer primary key
  categoryId: int("category_id")
    .notNull(),
    // Foreign key reference
    // In MySQL, you define the foreign key constraint separately or inline
    // Drizzle handles the constraint definition based on the relation and reference
    // The .references() method is used by Drizzle Kit for migration generation
    // The actual constraint is added to the table definition by Drizzle Kit
    // when you run migrations.
    // Ensure the column type matches the referenced column type (int references int)
});

// Blogs table: a blog has a title, thumbnail URL, and HTML content.
export const blogs = mysqlTable("blogs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  thumbnail: text("thumbnail"),
  content: text("content").notNull(),
  // 'timestamp' in mysql-core maps to MySQL TIMESTAMP type
  // .defaultNow() uses the CURRENT_TIMESTAMP default
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailSubscriptions = mysqlTable("email_subscriptions", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(), // Email should be unique
  subscribedAt: timestamp("subscribed_at").defaultNow(), // Optional: track subscription date
});

// Define relations for Drizzle ORM

// A category can have many products.
export const categoryRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

// A product belongs to one category.
export const productRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

// Relations are defined similarly for MySQL
export const emailSubscriptionRelations = relations(emailSubscriptions, () => ({}));
export const blogRelations = relations(blogs, () => ({}));



