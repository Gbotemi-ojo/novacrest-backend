import { serial, varchar, pgTable, text, numeric, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Categories table: each category has a name.
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

// Products table: a product has a name, price, picture URL, description, and belongs to a category.
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  price: numeric("price").notNull(),
  picture: text("picture"),
  description: text("description"),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
});

// Blogs table: a blog has a title, thumbnail URL, and HTML content.
export const blogs = pgTable("blogs", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  thumbnail: text("thumbnail"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Blogs don't have a related table so we can keep an empty relation mapping.
export const blogRelations = relations(blogs, () => ({}));



