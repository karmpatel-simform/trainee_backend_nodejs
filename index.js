import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import path from 'path';
import productRoutes from './routes/productRoutes.js';
import { connection } from './db/db.js'
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


connection.connect(error => {
    if (error) throw error;
    console.log("Successfully connected to the database.");
});
    
connection.query('SELECT * FROM products', (error, results) => {
    if (error) throw error;
    console.log(results);
});
    


app.get('/',(req,res) => {
    res.end("Hello from Backend Server.")
});

app.use('/api/products', productRoutes);

app.listen(port, ()=> {
    console.log(`Server is Running on http://localhost:${port}`);
});