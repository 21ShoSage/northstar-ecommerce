
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'admin')),
  profile_picture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add the column to existing databases without deleting user data.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category VARCHAR(80) NOT NULL DEFAULT 'General',
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  image_url TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color VARCHAR(80) NOT NULL DEFAULT '',
  name VARCHAR(120) NOT NULL DEFAULT 'Standard',
  sku VARCHAR(80) NOT NULL UNIQUE,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, name, color)
);

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS color VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_product_name_color
ON product_variants(product_id, name, color);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_name VARCHAR(120) NOT NULL,
  shipping_address TEXT NOT NULL,
  phone VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(180) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS variant_name VARCHAR(120) NOT NULL DEFAULT 'Standard';

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
ON product_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON orders(created_at DESC);
