
import populateDatabase from './db/backup.js';

const sqlFilePath = './db/mysqldump.sql';

populateDatabase(sqlFilePath);
