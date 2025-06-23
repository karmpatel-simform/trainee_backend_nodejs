import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const {
    DBHOST = 'localhost',
    DBUSER = 'root',
    DBPASSWORD = '',
    DATABASE = 'test',
} = process.env;

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

let connection;

function connectWithRetry(retriesLeft = MAX_RETRIES) {
    connection = mysql.createConnection({
        host: DBHOST,
        user: DBUSER,
        password: DBPASSWORD,
        database: DATABASE,
        connectTimeout: 10000, // 10s timeout
    });

    connection.connect((err) => {
        if (err) {
            console.error(`❌ MySQL connection failed: ${err.message}`);

            if (retriesLeft > 0) {
                console.log(`🔁 Retrying connection in ${RETRY_DELAY_MS / 1000}s... (${MAX_RETRIES - retriesLeft + 1})`);
                setTimeout(() => connectWithRetry(retriesLeft - 1), RETRY_DELAY_MS);
            } else {
                console.error('❌ Max retries reached. Continuing without DB.');
            }
        } else {
            console.log('✅ MySQL connected successfully.');
        }
    });

    connection.on('error', (err) => {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.warn('⚠️ MySQL connection lost. Reconnecting...');
            connectWithRetry();
        } else {
            console.error('❌ Unexpected MySQL error:', err);
        }
    });
}

// Kick off connection
connectWithRetry();

// ✅ Export remains the same
export { connection };
