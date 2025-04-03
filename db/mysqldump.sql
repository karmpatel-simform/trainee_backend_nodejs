-- Disable foreign key checks
SET foreign_key_checks = 0;

-- Drop tables in the correct order (dependent tables first)
DROP TABLE IF EXISTS checkout_items;
DROP TABLE IF EXISTS checkouts;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key checks
SET foreign_key_checks = 1;

-- Recreate tables

-- Users Table
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `reset_password_token` varchar(255) DEFAULT NULL,
  `reset_password_expire` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;

-- Products Table
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `image` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4;

-- Carts Table
CREATE TABLE `carts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cart Items Table
CREATE TABLE `cart_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cart_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `cart_product_unique` (`cart_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Checkouts Table
CREATE TABLE `checkouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `status` ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `checkouts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Checkout Items Table
CREATE TABLE `checkout_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `checkout_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `checkout_id` (`checkout_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `checkout_items_ibfk_1` FOREIGN KEY (`checkout_id`) REFERENCES `checkouts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `checkout_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data
INSERT INTO `users` VALUES (1,'test','test@gmail.com','$2b$10$Yr35VXflmEFc5q61Ym0fMut4E2tegBP15CMOQ/C.QDAyVnsk4D.Qq',NULL,NULL,'2025-03-20 09:11:42','2025-03-20 09:11:42');

-- Insert sample data with placeholder images for products without images
INSERT INTO `products` VALUES 
(1, 'Product Name', 'This is a product description', 19.99, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(2, 'Laptop', 'A powerful gaming laptop', 1299.99, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(3, 'Bottle', 'New Model', 100.00, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(4, 'Bottle 2', 'New Model', 100.00, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(5, 'Bottle 3', 'New Model 3', 100.00, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(6, 'Bottle 3', 'New Model', 100.00, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(7, 'ada', 'adad', 3434.00, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(8, 'asqw', 'as', 787.00, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(9, 'Shirt', 'Description', 100.00, 'https://placehold.co/600x400'),
(10, 'product 2', 'description of it', 100.00, 'https://placeholder.co/600x400'),
(11, 'Pants', 'Cotton', 100.00, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(12, 'product1', 'desc', 10.00, 'https://media.licdn.com/dms/image/v2/D4E12AQFZqsWCUYqRlw/article-cover_image-shrink_600_2000/article-cover_image-shrink_600_2000/0/1668178512985?e=2147483647&v=beta&t=GXpn9KbIi8IWj3Lmpqr4OyewDLsS1Cs6q7aVTUMitnY'),
(13, 'Bottle 3', 'New Model', 100.00, 'https://m.media-amazon.com/images/I/517Hfmb19RL._SY741_.jpg'),
(14, 'Shirts', 'Its Description', 100.00, 'https://placehold.co/600x400');