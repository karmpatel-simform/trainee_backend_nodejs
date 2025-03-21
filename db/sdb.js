import mysql from 'mysql2'; 
import dotenv from 'dotenv';

dotenv.config({path: '.env'});

export const connection = mysql.createConnection({
 host : process.env.DBHOST,
 user : process.env.DBUSER,
 password : process.env.DBPASSWORD,
 database : process.env.DATABASE
});