import { defineConfig } from 'drizzle-kit';
// Removed: import "dotenv/config"; // dotenv is not needed if not using process.env

// Removed: console.log statements

export default defineConfig({
  schema: './db/schema.ts', // Path to your Drizzle schema file
  out: './db/migration',   // Directory for migration files
  dialect: 'mysql',        // Set the dialect to 'mysql'

  dbCredentials: {
    // Using hardcoded strings for all credentials as requested
    host: 'panel909.harmondns.net', // Use 'localhost' if your app is on the same cPanel account
    // If connecting remotely, you would need your domain name or server IP here,
    // AND you must enable "Remote MySQL" in cPanel for the connecting IP.
    port: 3306, // Standard MySQL port
    database: 'novacres_storage', // Your database name from cPanel
    user: 'novacres_oluwagbotemi', // Your database username from cPanel
    password: 'Takeoff0Takeoff0', // Hardcoded password
    // For MySQL, you typically don't need 'ssl' unless specifically configured
    // If your cPanel requires SSL for MySQL, you might need to add:
    // ssl: { rejectUnauthorized: true } // Or adjust based on your server's SSL setup
  },

  verbose: true, // Enable verbose logging for Drizzle commands
  strict: true   // Enable strict mode
});
