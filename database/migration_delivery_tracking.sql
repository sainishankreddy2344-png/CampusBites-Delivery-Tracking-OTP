-- Run this ONCE in MySQL Workbench for an existing CampusBites database.
USE campusbites;
ALTER TABLE orders MODIFY status ENUM('PLACED','PREPARING','ALMOST_DONE','OUT_FOR_DELIVERY','DELIVERED','COMPLETED','READY','CANCELLED') NOT NULL DEFAULT 'PLACED';
ALTER TABLE orders ADD COLUMN delivery_address TEXT NULL;
ALTER TABLE orders ADD COLUMN delivery_phone VARCHAR(20) NULL;
ALTER TABLE orders ADD COLUMN delivery_otp_hash VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN delivery_otp_expires DATETIME NULL;
ALTER TABLE orders ADD COLUMN delivery_otp_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN delivered_at DATETIME NULL;
