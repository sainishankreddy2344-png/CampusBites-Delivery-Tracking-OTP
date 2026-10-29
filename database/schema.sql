CREATE DATABASE IF NOT EXISTS campusbites CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campusbites;
CREATE TABLE IF NOT EXISTS users (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('STUDENT','ADMIN') NOT NULL DEFAULT 'STUDENT',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS menu_items (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(160) NOT NULL,
 category VARCHAR(80) NOT NULL,
 price DECIMAL(10,2) NOT NULL,
 available TINYINT(1) NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT NOT NULL,
 status ENUM('PLACED','PREPARING','ALMOST_DONE','OUT_FOR_DELIVERY','DELIVERED','COMPLETED','READY','CANCELLED') NOT NULL DEFAULT 'PLACED',
 total_amount DECIMAL(10,2) NOT NULL,
 fulfillment VARCHAR(80) NOT NULL DEFAULT 'Delivery',
 delivery_address TEXT NULL,
 delivery_phone VARCHAR(20) NULL,
 delivery_otp_hash VARCHAR(255) NULL,
 delivery_otp_expires DATETIME NULL,
 delivery_otp_attempts INT NOT NULL DEFAULT 0,
 delivered_at DATETIME NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_orders_user FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS order_items (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT NOT NULL,
 menu_item_id BIGINT NOT NULL,
 item_name VARCHAR(160) NOT NULL,
 quantity INT NOT NULL,
 unit_price DECIMAL(10,2) NOT NULL,
 CONSTRAINT fk_order_items_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
INSERT INTO menu_items(id,name,category,price,available) VALUES
(1,'Mysore Masala Dosa','Breakfast',75,1),(2,'Classic Idli Vada (2+1)','Breakfast',55,1),(3,'Hyderabadi Veg Biryani','Meals',120,1),(4,'Paneer Tikka Wrap','Snacks',95,1),(5,'Chicken Dum Biryani','Meals',145,1),(6,'Chocolate Thick Shake','Beverages',80,1),(7,'Crispy French Fries','Snacks',65,1),(8,'South Indian Meals','Meals',110,1),(9,'Cold Coffee','Beverages',70,1)
ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),price=VALUES(price);
