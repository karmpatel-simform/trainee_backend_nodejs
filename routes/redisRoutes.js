import express from 'express';
import Redis from 'ioredis';
import { pool } from '../db/db.js';

const router = express.Router();

// Redis client setup
const redis = new Redis({
    host: process.env.REDISHOST,
    port: 6379
});

redis.ping().then((result) => {
    console.log('Connected to Redis:', result);
}).catch((error) => {
    console.error('Redis connection error:', error);
});

// Helper function to check if a user ID is a guest ID
const isGuestUser = (userId) => {
    return userId && String(userId).startsWith('guest_');
};

// Debug middleware to log requests
router.use((req, res, next) => {
    console.log(`Cart API Request: ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', JSON.stringify(req.body));
    }
    next();
});

router.post('/add', async (req, res) => {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        const cartKey = `cart:${userId}`;
        const [productRows] = await pool.query('SELECT id, name, price FROM products WHERE id = ?', [productId]);
        const product = productRows[0];

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const cartData = await redis.get(cartKey);
        let cart = cartData ? JSON.parse(cartData) : [];

        // Ensure price is stored as a number
        const price = parseFloat(product.price);

        const existingItem = cart.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                productId: product.id,
                name: product.name,
                price: price,
                quantity
            });
        }

        // Set expiration time for guest users
        if (isGuestUser(userId)) {
            await redis.set(cartKey, JSON.stringify(cart), 'EX', 86400); // 24 hours
        } else {
            await redis.set(cartKey, JSON.stringify(cart));
            
            // Update database for logged-in users
            try {
                const [cartRows] = await pool.query('SELECT * FROM carts WHERE user_id = ?', [userId]);
                let cartId;
                
                if (cartRows.length) {
                    cartId = cartRows[0].id;
                } else {
                    const [result] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
                    cartId = result.insertId;
                }

                await pool.query(
                    'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?) ' +
                    'ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)',
                    [cartId, productId, quantity]
                );
            } catch (dbError) {
                console.error('Database error:', dbError);
                // Continue even if DB update fails
            }
        }

        res.status(200).json({ message: 'Product added to cart', cart });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Error adding to cart', details: error.message });
    }
});

router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    const cartKey = `cart:${userId}`;

    try {
        const cartData = await redis.get(cartKey);
        if (cartData) {
            // Parse and ensure all prices are numbers
            const cart = JSON.parse(cartData);
            const processedCart = cart.map(item => ({
                ...item,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity, 10)
            }));
            return res.status(200).json(processedCart);
        }

        if (!isGuestUser(userId)) {
            const [cartItems] = await pool.query(`
                SELECT p.id AS productId, p.name, p.price, ci.quantity
                FROM cart_items ci
                JOIN carts c ON ci.cart_id = c.id
                JOIN products p ON ci.product_id = p.id
                WHERE c.user_id = ?
            `, [userId]);

            // Ensure all prices are numbers
            const processedItems = cartItems.map(item => ({
                ...item,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity, 10)
            }));

            await redis.set(cartKey, JSON.stringify(processedItems), 'EX', 86400);
            return res.status(200).json(processedItems);
        }

        res.status(200).json([]);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Error fetching cart', details: error.message });
    }
});

// Add update quantity endpoint
router.put('/update', async (req, res) => {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || quantity < 1) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        const cartKey = `cart:${userId}`;
        const cartData = await redis.get(cartKey);
        
        if (!cartData) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        const cart = JSON.parse(cartData);
        const itemIndex = cart.findIndex(item => 
            (item.productId === productId) || (item.id === productId)
        );
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Product not found in cart' });
        }
        
        cart[itemIndex].quantity = quantity;
        
        // Set with proper expiration
        if (isGuestUser(userId)) {
            await redis.set(cartKey, JSON.stringify(cart), 'EX', 86400); // 24 hours
        } else {
            await redis.set(cartKey, JSON.stringify(cart));
            
            try {
                // Update database for logged-in users
                await pool.query(
                    'UPDATE cart_items SET quantity = ? WHERE product_id = ? AND cart_id = (SELECT id FROM carts WHERE user_id = ?)',
                    [quantity, productId, userId]
                );
            } catch (dbError) {
                console.error('Database error updating quantity:', dbError);
                // Continue if DB update fails
            }
        }
        
        res.status(200).json({ message: 'Quantity updated', cart });
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ error: 'Error updating quantity', details: error.message });
    }
});

// Remove from Cart
router.delete('/remove/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;
    console.log(`Removing product ${productId} from cart of user ${userId}`);

    if (!userId || !productId) {
        return res.status(400).json({ error: 'User ID and Product ID are required' });
    }

    try {
        // Update Redis for all users
        const cartKey = `cart:${userId}`;
        const cartData = await redis.get(cartKey);
        
        if (cartData) {
            const cart = JSON.parse(cartData);
            const updatedCart = cart.filter(item => 
                (item.productId != productId) && (item.id != productId)
            );
            
            if (isGuestUser(userId)) {
                await redis.set(cartKey, JSON.stringify(updatedCart), 'EX', 86400); // 24 hours
            } else {
                await redis.set(cartKey, JSON.stringify(updatedCart));
                
                try {
                    // Update DB for logged-in users
                    await pool.query(
                        'DELETE FROM cart_items WHERE product_id = ? AND cart_id = (SELECT id FROM carts WHERE user_id = ?)', 
                        [productId, userId]
                    );
                } catch (dbError) {
                    console.error('Database error removing item:', dbError);
                    // Continue if DB fails
                }
            }
        } else if (!isGuestUser(userId)) {
            try {
                // Direct DB update for logged-in users if Redis is empty
                await pool.query(
                    'DELETE FROM cart_items WHERE product_id = ? AND cart_id = (SELECT id FROM carts WHERE user_id = ?)', 
                    [productId, userId]
                );
            } catch (dbError) {
                console.error('Database error removing item:', dbError);
                // Continue if DB fails
            }
        }

        res.status(200).json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error removing item:', error);
        res.status(500).json({
            error: 'Error removing item from cart',
            details: error.message
        });
    }
});


router.post('/checkout', async (req, res) => {
    const { userId, guestId } = req.body;

    try {
        const cartKey = `cart:${guestId}`;
        const cartData = await redis.get(cartKey);

        if (!cartData) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const cartItems = JSON.parse(cartData);
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const [checkoutResult] = await pool.query(
            'INSERT INTO checkouts (user_id, total_amount) VALUES (?, ?)',
            [userId, totalAmount]
        );
        const checkoutId = checkoutResult.insertId;

        const checkoutItems = cartItems.map(item => [checkoutId, item.productId, item.quantity]);
        await pool.query('INSERT INTO checkout_items (checkout_id, product_id, quantity) VALUES ?', [checkoutItems]);

        await redis.del(cartKey);

        res.status(200).json({ message: 'Checkout successful', checkoutId });
    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).json({ error: 'Checkout failed', details: error.message });
    }
});

export default router;