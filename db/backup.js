import { getConnection, executeWithRetry, checkDatabaseHealth } from './sdb.js';
import fs from 'fs/promises';
import path from 'path';

// Function to clean the SQL content
const cleanSQL = (sql) => {
  let cleanedSQL = sql.replace(/\/\*!.*?\*\//gs, ''); // Remove comments
  cleanedSQL = cleanedSQL.replace(/^\s*;\s*/gm, ''); // Remove empty statements
  cleanedSQL = cleanedSQL.replace(/^\s*[\r\n]+/gm, ''); // Remove extra newlines
  cleanedSQL = cleanedSQL.replace(/--.*$/gm, ''); // Remove single-line comments
  return cleanedSQL.trim();
};

// Function to create database backup
export const createBackup = async (backupDir = './backups') => {
  try {
    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);

    console.log('🔄 Creating database backup...');

    const connection = await getConnection();

    try {
      // Get all tables
      const [tables] = await connection.execute('SHOW TABLES');

      let backupContent = `-- Database Backup Created: ${new Date().toISOString()}\n\n`;

      for (const table of tables) {
        const tableName = Object.values(table)[0];

        // Get table structure
        const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
        backupContent += `-- Table: ${tableName}\n`;
        backupContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        backupContent += `${createTable[0]['Create Table']};\n\n`;

        // Get table data
        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);

        if (rows.length > 0) {
          backupContent += `-- Data for table: ${tableName}\n`;
          backupContent += `INSERT INTO \`${tableName}\` VALUES\n`;

          const values = rows.map(row => {
            const rowValues = Object.values(row).map(val => {
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return val;
            });
            return `(${rowValues.join(', ')})`;
          });

          backupContent += values.join(',\n') + ';\n\n';
        }
      }

      await fs.writeFile(backupFile, backupContent);
      console.log(`✅ Backup created: ${backupFile}`);

      return backupFile;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Backup creation failed:', error.message);
    throw error;
  }
};

// Function to populate the database with enhanced error handling
const populateDatabase = async (sqlFilePath) => {
  let connection;

  try {
    // Validate file exists
    try {
      await fs.access(sqlFilePath);
    } catch {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }

    // Check database health before proceeding
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database is not healthy. Cannot proceed with population.');
    }

    // Create backup before population
    console.log('🔄 Creating backup before database population...');
    await createBackup();

    // Read SQL file
    console.log('📖 Reading SQL file...');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');

    // Clean and parse SQL
    const cleanedSQL = cleanSQL(sqlContent);
    if (!cleanedSQL) {
      throw new Error('SQL file is empty or contains no valid statements');
    }

    // Split into queries
    const queries = cleanedSQL
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0);

    if (queries.length === 0) {
      throw new Error('No valid queries found in SQL file');
    }

    console.log(`📝 Found ${queries.length} queries to execute`);

    // Get database connection
    connection = await getConnection();

    // Begin transaction for data integrity
    await connection.beginTransaction();

    try {
      // Execute queries with retry mechanism
      let successCount = 0;

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];

        try {
          await executeWithRetry(async () => {
            const [results] = await connection.execute(query);
            return results;
          });

          successCount++;
          console.log(`✅ Query ${i + 1}/${queries.length} executed successfully`);

          // Log progress every 10 queries
          if ((i + 1) % 10 === 0) {
            console.log(`📊 Progress: ${i + 1}/${queries.length} queries completed`);
          }
        } catch (queryError) {
          console.error(`❌ Query ${i + 1} failed:`, query.substring(0, 100) + '...');
          console.error('Error:', queryError.message);

          // Decide whether to continue or fail
          if (process.env.STRICT_MODE === 'true') {
            throw queryError;
          } else {
            console.log('⚠️ Continuing with remaining queries (STRICT_MODE=false)...');
          }
        }
      }

      // Commit transaction
      await connection.commit();

      console.log(`✅ Database population completed successfully!`);
      console.log(`📊 Summary: ${successCount}/${queries.length} queries executed successfully`);

      return {
        success: true,
        totalQueries: queries.length,
        successfulQueries: successCount,
        failedQueries: queries.length - successCount
      };

    } catch (transactionError) {
      // Rollback on error
      await connection.rollback();
      console.error('❌ Transaction rolled back due to error');
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Database population failed:', error.message);

    // Log additional context
    console.error('📍 Error context:', {
      sqlFile: sqlFilePath,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV
    });

    throw error;
  } finally {
    // Always release connection
    if (connection) {
      connection.release();
      console.log('🔌 Database connection released');
    }
  }
};

// Auto-cleanup old backups (keep last 5)
export const cleanupOldBackups = async (backupDir = './backups', keepCount = 5) => {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
      .sort()
      .reverse();

    if (backupFiles.length > keepCount) {
      const filesToDelete = backupFiles.slice(keepCount);

      for (const file of filesToDelete) {
        await fs.unlink(path.join(backupDir, file));
        console.log(`🗑️ Deleted old backup: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to cleanup old backups:', error.message);
  }
};

export default populateDatabase;