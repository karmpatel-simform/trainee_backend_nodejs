import express from 'express';
import Redis from 'ioredis';
import { connection } from '../db/sdb.js';

const router = express.Router();
const redis = new Redis({
    host: process.env.REDISHOST,
    port: 6379
});

let db = connection.promise ? connection.promise() : connection;

router.post('/checkout', async (req, res) => {
    const { guestId } = req.body;

    try {


        const cartData = await redis.get(guestId	);

        if (!cartData) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const cartItems = JSON.parse(cartData);
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const [checkoutResult] = await db.query(
            'INSERT INTO checkouts (user_id, total_amount) VALUES (?, ?)',
            [userId, totalAmount]
        );
        const checkoutId = checkoutResult.insertId;

        const checkoutItems = cartItems.map(item => [checkoutId, item.productId, item.quantity]);
        await db.query('INSERT INTO checkout_items (checkout_id, product_id, quantity) VALUES ?', [checkoutItems]);

        await redis.del(cartKey);

        res.status(200).json({ message: 'Checkout successful', checkoutId });
    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).json({ error: 'Checkout failed', details: error.message });
    }
});


export default router;
