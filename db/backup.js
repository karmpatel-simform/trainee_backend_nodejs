import { connection } from './db.js';  // Assuming connection is already set up
import fs from 'fs';

// Function to clean the SQL content (removes comments and extra semicolons)
const cleanSQL = (sql) => {
  let cleanedSQL = sql.replace(/\/\*!.*?\*\//gs, '');  // Remove comments
  cleanedSQL = cleanedSQL.replace(/^\s*;\s*/gm, '');  // Remove empty statements
  cleanedSQL = cleanedSQL.replace(/^\s*[\r\n]+/gm, '');  // Remove extra newlines
  return cleanedSQL;
};

// Function to populate the database
const populateDatabase = async (sqlFilePath) => {
  try {
    // Read SQL file asynchronously
    const sqlFile = fs.readFileSync(sqlFilePath, 'utf8');

    // Clean the SQL file
    const cleanedSQL = cleanSQL(sqlFile);

    // Split the cleaned SQL into individual queries
    const queries = cleanedSQL.split(';').filter(query => query.trim() !== ''); // Split on semicolons and remove empty queries

    // Connect to the database
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          reject(new Error('Error connecting to the database: ' + err));
        } else {
          console.log('Connected to the database');
          resolve();
        }
      });
    });

    // Execute each query
    for (let query of queries) {
      query = query.trim(); // Remove any leading/trailing whitespace
      if (query) {
        await new Promise((resolve, reject) => {
          connection.query(query, (err, results) => {
            if (err) {
              reject(new Error('Error executing SQL query: ' + err));
            } else {
              console.log('Query executed successfully: ', results);
              resolve();
            }
          });
        });
      }
    }

    // Close the connection after all queries have been executed
    connection.end();

    console.log('Database populated successfully.');
  } catch (err) {
    console.error('Error populating database: ', err);
    connection.end();  // Ensure the connection is closed in case of error
  }
};

// Export the function to be used in other modules
export default populateDatabase;
