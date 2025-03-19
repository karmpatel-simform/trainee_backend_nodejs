import express from 'express';
import { connection } from '../db/db.js';

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

// Add product route - now accepts an image URL directly
router.post('/add', (req, res) => {
  const { name, description, price, image } = req.body; // Expect image as URL in the body

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

// Get all products
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
// Edit product route - now accepts an image URL directly
router.put('/edit/:id', (req, res) => {
  const productId = req.params.id; // Get the productId from the route parameter
  const { name, description, price, image, oldImage } = req.body; 

  let queryParams = [name, description, price,image, productId];

  if (image) {
    queryParams[3] = image;
  } else {
    // If no new image, keep the old image
    queryParams[3] = oldImage;
  }

  // SQL query to update the product
  const query = 'UPDATE products SET name = ?, description = ?, price = ?, image = ? WHERE id = ?';

  // Execute the query
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

