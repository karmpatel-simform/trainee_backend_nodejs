import express from 'express';
import { connection } from '../db/db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = express.Router();

let db;

connection.connect(error => {
  if (error) {
    console.error("Error connecting to the database:", error);
    process.exit(1); 
  } else {
    console.log("Successfully connected to the database.");
    db = connection; 
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

router.post('/add', upload.single('image'), (req, res) => {
  const { name, description, price } = req.body;
  const imagePath = req.file ? req.file.path : null;

  let imageBuffer = null;
  if (imagePath) {
    imageBuffer = fs.readFileSync(imagePath); 
  }

  const query = 'INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)';
  db.query(query, [name, description, price, imageBuffer], (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error adding product', error: err });
    } else {
      res.status(200).json({ message: 'Product added successfully', productId: result.insertId });
    }

    if (imagePath) {
      fs.unlinkSync(imagePath);
    }
  });
});

router.get('/get', (req, res) => {
  const query = 'SELECT * FROM products';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error retrieving products', error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No products found' });
    }

    res.status(200).json(results);
  });
});

router.put('/edit/:id', upload.single('image'), (req, res) => {
  const productId = req.params.id;
  const { name, description, price } = req.body;
  const imagePath = req.file ? req.file.path : null;

  let imageBuffer = null;
  if (imagePath) {
    imageBuffer = fs.readFileSync(imagePath); 
  }
  const query = 'UPDATE products SET name = ?, description = ?, price = ?, image = ? WHERE id = ?';
  db.query(query, [name, description, price, imageBuffer, productId], (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error updating product', error: err });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product updated successfully' });
    }

    if (imagePath) {
      fs.unlinkSync(imagePath); 
    }
  });
});

export default router;
