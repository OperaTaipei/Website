-- Cloudflare D1 SQL Database Schema for Opera Taipei Menu

-- 1. Category table (signatures, food, ontap, classics, bottles)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_name TEXT UNIQUE NOT NULL
);

-- 2. Ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_name TEXT UNIQUE NOT NULL
);

-- 3. Flavor Tags table
CREATE TABLE IF NOT EXISTS flavor_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_name TEXT UNIQUE NOT NULL
);

-- 4. Media table (for menu item images)
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    alt_text TEXT
);

-- 5. Menu Items table (Name is managed in translations, price is required)
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_name TEXT UNIQUE NOT NULL,
    category_id INTEGER NOT NULL,
    media_id INTEGER,
    price REAL NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1, -- 1 = true, 0 = false
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE SET NULL
);

-- 5b. Bottles table to store bottle-specific properties (Option B)
CREATE TABLE IF NOT EXISTS bottles (
    menu_item_id INTEGER PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('Whiskey', 'Gin', 'Vodka', 'Tequila', 'Mescal', 'Spirit', 'Liqueur', 'Rum')),
    volume REAL NOT NULL, -- in Liters
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- 6. Menu Item Ingredients Join Table (with restrict checks to prevent deletion of ingredients if in use)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    menu_item_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    PRIMARY KEY (menu_item_id, ingredient_id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
);

-- 7. Menu Item Tags Join Table (with restrict checks)
CREATE TABLE IF NOT EXISTS menu_item_tags (
    menu_item_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (menu_item_id, tag_id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES flavor_tags(id) ON DELETE RESTRICT
);

-- 8. Translations table to support EN, FR, JA, ZH
CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    locale TEXT NOT NULL CHECK(locale IN ('en', 'fr', 'ja', 'zh')),
    entity_type TEXT NOT NULL CHECK(entity_type IN ('menu_item', 'category', 'ingredient', 'tag')),
    entity_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    UNIQUE(locale, entity_type, entity_id)
);
