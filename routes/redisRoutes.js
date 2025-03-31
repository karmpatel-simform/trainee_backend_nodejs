import express from 'express';
import Redis from 'ioredis';
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


const redis = new Redis({
    host: 'localhost',
    port: 6379
});

redis.ping().then((result) => {
    console.log('Connected to Redis:', result); // Should print 'PONG'
}).catch((error) => {
    console.error('Redis connection error:', error);
});

// Add to Cart
router.post('/add', async (req, res) => {
    const { userId, productId, quantity } = req.body;

    try {
        // Add to Redis
        const cartKey = `cart:${userId}`;
        const cartData = await redis.get(cartKey);
        let cart = cartData ? JSON.parse(cartData) : [];

        const existingItem = cart.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ productId, quantity });
        }

        await redis.set(cartKey, JSON.stringify(cart));

        // Also add to DB
        const cartRecord = await db.query('SELECT * FROM carts WHERE user_id = ?', [userId]);
        let cartId;
        if (cartRecord.length === 0) {
            const result = await db.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
            cartId = result.insertId;
        } else {
            cartId = cartRecord[0].id;
        }

        await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)', [cartId, productId, quantity]);

        res.status(200).json({ message: 'Product added to cart' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).send('Error adding to cart');
    }
});

// Get Cart
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const cartKey = `cart:${userId}`;
        const cartData = await redis.get(cartKey);

        if (cartData) {
            return res.status(200).json(JSON.parse(cartData));
        }

        // Fallback to DB
        const cartItems = await db.query(`
            SELECT p.id, p.name, p.price, ci.quantity
            FROM cart_items ci
            JOIN carts c ON ci.cart_id = c.id
            JOIN products p ON ci.product_id = p.id
            WHERE c.user_id = ?
        `, [userId]);

        res.status(200).json(cartItems);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Error fetching cart');
    }
});

// Remove from Cart
router.delete('/remove/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;

    try {
        const cartKey = `cart:${userId}`;
        await redis.del(cartKey);

        await db.query('DELETE FROM cart_items WHERE product_id = ? AND cart_id = (SELECT id FROM carts WHERE user_id = ?)', [productId, userId]);

        res.status(200).json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error removing item:', error);
        res.status(500).send('Error removing item');
    }
});

// Update Quantity
router.put('/update', async (req, res) => {
    const { userId, productId, quantity } = req.body;

    try {
        const cartKey = `cart:${userId}`;
        const cartData = await redis.get(cartKey);
        let cart = cartData ? JSON.parse(cartData) : [];

        const item = cart.find(i => i.productId === productId);
        if (item) {
            item.quantity = quantity;
            await redis.set(cartKey, JSON.stringify(cart));
        }

        await db.query('UPDATE cart_items SET quantity = ? WHERE product_id = ? AND cart_id = (SELECT id FROM carts WHERE user_id = ?)', [quantity, productId, userId]);

        res.status(200).json({ message: 'Quantity updated' });
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).send('Error updating quantity');
    }
});

export default router;
