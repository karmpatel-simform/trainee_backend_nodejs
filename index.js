import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { initializeDatabase, closeConnection, checkDatabaseHealth } from './sdb.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 1000, // Limit each IP
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = ["*"];

        // In production, be more restrictive
        if (isProduction) {
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // In development, allow all origins
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbHealthy = await checkDatabaseHealth();

        const healthStatus = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: dbHealthy ? 'connected' : 'disconnected',
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };

        res.status(dbHealthy ? 200 : 503).json(healthStatus);
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Backend Server is Running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
        timestamp: new Date().toISOString(),
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('🚨 Unhandled error:', error);

    // Don't leak error details in production
    const errorResponse = {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        ...(isProduction ? {} : { details: error.message, stack: error.stack }),
    };

    res.status(500).json(errorResponse);
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
    console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
        console.log('🔌 HTTP server closed');

        try {
            // Close database connections
            await closeConnection();
            console.log('✅ Database connections closed');

            console.log('✅ Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    });

    // Force close after 30 seconds
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};

// Initialize database and start server
const startServer = async () => {
    try {
        console.log('🚀 Starting server...');

        // Initialize database connection
        await initializeDatabase();

        // Start HTTP server
        const server = app.listen(port, () => {
            console.log(`✅ Server running on port ${port}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${port}/health`);
        });

        // Set up graceful shutdown
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('🚨 Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

        return server;

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Export for testing
export { app };

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}