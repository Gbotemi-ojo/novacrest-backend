// Import drizzle from the mysql2 driver
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema"; // Assuming your schema file is at ./schema.ts
// Import the mysql2 library
import mysql from "mysql2/promise"; // Using the promise-based version for async/await

// Removed: import "dotenv/config"; // dotenv is not needed if not using environment variables

// Hardcoded database connection credentials for cPanel MySQL
// IMPORTANT: Hardcoding credentials like this is NOT recommended for production environments.
// Consider using environment variables or a secrets management system for better security.
const dbCredentials = {
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
};

// Create a MySQL connection pool
// Using a pool is generally better for performance in applications that handle multiple requests
const pool = mysql.createPool({
    host: dbCredentials.host,
    port: dbCredentials.port,
    database: dbCredentials.database,
    user: dbCredentials.user,
    password: dbCredentials.password,
    waitForConnections: true,
    connectionLimit: 10, // Adjust the limit based on your needs and server capacity
    queueLimit: 0
});

// Initialize Drizzle with the MySQL connection pool
// The drizzle function from 'drizzle-orm/mysql2' expects a mysql2 Connection or Pool
const db = drizzle(pool, { schema, mode: 'default' }); // Use mode: 'default' or 'planetscale' depending on your driver/setup

// Export the Drizzle database instance
export default db;

// Optional: Add a way to close the pool when the application shuts down
process.on('SIGINT', async () => {
    console.log('Closing MySQL connection pool...');
    await pool.end();
    console.log('MySQL connection pool closed.');
    process.exit(0);
});
