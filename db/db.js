import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// Validate required environment variables
const requiredEnvVars = ['DBHOST', 'DBUSER', 'DBPASSWORD', 'DATABASE'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Database configuration with enhanced settings
const dbConfig = {
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DATABASE,
    port: parseInt(process.env.DBPORT) || 3306,

    // Connection pool settings for production
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,

    // Reconnection settings
    reconnect: true,
    idleTimeout: 28800000, // 8 hours

    // SSL settings for Azure MySQL
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
        ca: process.env.DB_SSL_CA || undefined
    } : false,

    // Character set
    charset: 'utf8mb4',

    // Additional MySQL settings
    multipleStatements: false, // Security: prevent SQL injection
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: false,

    // Connection flags
    flags: [
        'CONNECT_WITH_DB',
        'INTERACTIVE',
        'IGNORE_SPACE',
        'MULTI_RESULTS'
    ]
};

// Create connection pool for better performance and connection management
export const pool = mysql.createPool(dbConfig);

// Health check function
export const checkDatabaseHealth = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log('✅ Database health check passed');
        return true;
    } catch (error) {
        console.error('❌ Database health check failed:', error.message);
        return false;
    }
};

// Retry mechanism for database operations
export const executeWithRetry = async (operation, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            console.error(`Database operation attempt ${attempt} failed:`, error.message);

            if (attempt === maxRetries) {
                throw new Error(`Database operation failed after ${maxRetries} attempts: ${error.message}`);
            }

            // Exponential backoff
            const waitTime = delay * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};

// Enhanced query function with retry mechanism
export const query = async (sql, params = []) => {
    return executeWithRetry(async () => {
        const [results] = await pool.execute(sql, params);
        return results;
    });
};

// Get connection from pool
export const getConnection = async () => {
    return executeWithRetry(async () => {
        return await pool.getConnection();
    });
};

// Initialize database connection with health check
export const initializeDatabase = async () => {
    console.log('🔄 Initializing database connection...');

    try {
        // Test the connection
        await checkDatabaseHealth();

        // Set up periodic health checks
        setInterval(async () => {
            await checkDatabaseHealth();
        }, 300000); // Check every 5 minutes

        console.log('✅ Database initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize database:', error.message);

        // In production, you might want to exit the process or implement fallback
        if (process.env.NODE_ENV === 'production') {
            console.error('💥 Critical error: Cannot connect to database in production');
            // You might want to exit or implement graceful degradation
            // process.exit(1);
        }

        return false;
    }
};

// Graceful shutdown
export const closeConnection = async () => {
    try {
        await pool.end();
        console.log('✅ Database connection pool closed gracefully');
    } catch (error) {
        console.error('❌ Error closing database connection:', error.message);
    }
};

// Export the pool for direct access if needed
export { pool };