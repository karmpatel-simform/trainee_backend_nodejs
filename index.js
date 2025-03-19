import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import path from 'path';
import productRoutes from './routes/productRoutes.js';
import { connection } from './db/db.js'
import { fileURLToPath } from 'url';
import cors from 'cors';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/',(req,res) => {
    res.end("Hello from Backend Server.")
});

app.use('/api/products', productRoutes);

app.listen(port, ()=> {
    console.log(`Server is Running on http://localhost:${port}`);
});