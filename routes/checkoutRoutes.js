const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'ecommerce_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Product Routes
app.get('/api/products', async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products');
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products/add', async (req, res) => {
    const { name, description, price, image, stock } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO products (name, description, price, image, stock) VALUES (?, ?, ?, ?, ?)',
            [name, description, price, image, stock]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, image } = req.body;
    try {
        await pool.query(
            'UPDATE products SET name = ?, description = ?, price = ?, image = ? WHERE id = ?',
            [name, description, price, image, id]
        );
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Checkout Route
app.post('/api/checkout', async (req, res) => {
    const { userId, items, totalAmount } = req.body;
    const connection = await pool.getConnection();

    try {
        // Start transaction
        await connection.beginTransaction();

        // Create order
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total_amount) VALUES (?, ?)',
            [userId, totalAmount]
        );
        const orderId = orderResult.insertId;

        // Insert order items and update product stock
        for (const item of items) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.productId, item.quantity, item.price]
            );

            // Update product stock
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.productId]
            );
        }

        // Commit transaction
        await connection.commit();

        res.status(201).json({ 
            message: 'Order created successfully', 
            orderId 
        });
    } catch (error) {
        // Rollback transaction in case of error
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});
