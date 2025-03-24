import mysql from 'mysql2/promise'; 
import dotenv from 'dotenv';

dotenv.config({path: '.env'});

export const pool = mysql.createPool({
 host : process.env.DBHOST,
 user : process.env.DBUSER,
 password : process.env.DBPASSWORD,
 database : process.env.DATABASE
});