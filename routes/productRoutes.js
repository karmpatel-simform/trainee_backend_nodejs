import express from 'express';
import { connection } from '../db/sdb.js';

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

router.post('/add', (req, res) => {
  const { name, description, price, image } = req.body;

  if (!image) {
    return res.status(400).json({ message: 'Image URL is required' });
  }

  const query = 'INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)';
  db.query(query, [name, description, price, image], (err, result) => {
    if (err) {
      res.status(500).json({ message: 'Error adding product', error: err });
    } else {
      res.status(200).json({ message: 'Product added successfully', productId: result.insertId });
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


router.put('/edit/:id', (req, res) => {
  const productId = req.params.id; 
  const { name, description, price, image, oldImage } = req.body; 

  let queryParams = [name, description, price,image, productId];

  if (image) {
    queryParams[3] = image;
  } else {
    queryParams[3] = oldImage;
  }

  const query = 'UPDATE products SET name = ?, description = ?, price = ?, image = ? WHERE id = ?';


  db.query(query, queryParams, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error updating product', error: err });
    } else if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    } else {
      return res.status(200).json({ message: 'Product updated successfully' });
    }
  });
});

export default router;

