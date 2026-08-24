import fs from 'fs';
import path from 'path';

const menuPath = path.resolve('src/data/menu.json');
const i18nDir = path.resolve('src/i18n');
const outputPath = path.resolve('db/seed.sql');

// Helper to escape single quotes for SQL insertion
function sqlEscape(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

async function run() {
  console.log('Starting migration extraction...');

  // 1. Read files
  const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
  const locales = ['en', 'fr', 'ja', 'zh'];
  const translationsData = {};
  
  for (const locale of locales) {
    const filePath = path.join(i18nDir, `${locale}.json`);
    translationsData[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  // Sets to track unique entities
  const categories = new Set();
  const ingredients = new Set();
  const tags = new Set();
  const mediaUrls = new Set();

  // Extract categories and tags from menuData
  menuData.forEach(item => {
    if (item.category) categories.add(item.category);
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(tag => tags.add(tag));
    }
    if (item.image) {
      mediaUrls.add(item.image);
    }
  });

  // Extract ingredients from the English translation file
  const enTranslations = translationsData['en'].menu_items || {};
  Object.keys(enTranslations).forEach(key => {
    const itemTrans = enTranslations[key];
    if (itemTrans.ingredients) {
      // Split ingredients by common separators (comma, ampersand, and)
      const list = itemTrans.ingredients
        .split(/,|\band\b|&/)
        .map(i => i.trim())
        .filter(i => i.length > 0);
      list.forEach(ing => ingredients.add(ing.toLowerCase()));
    }
  });

  const sqlStatements = [];
  sqlStatements.push('-- Database seed generated from current menu configuration');
  sqlStatements.push('PRAGMA foreign_keys = ON;\n');

  // 2. Insert Categories
  const categoryIds = {};
  let catId = 1;
  sqlStatements.push('-- Seeding categories');
  for (const cat of categories) {
    sqlStatements.push(`INSERT OR IGNORE INTO categories (id, code_name) VALUES (${catId}, ${sqlEscape(cat)});`);
    categoryIds[cat] = catId;
    catId++;
  }
  sqlStatements.push('');

  // 3. Insert Ingredients
  const ingredientIds = {};
  let ingId = 1;
  sqlStatements.push('-- Seeding ingredients');
  for (const ing of ingredients) {
    const codeName = ing.replace(/\s+/g, '-');
    sqlStatements.push(`INSERT OR IGNORE INTO ingredients (id, code_name) VALUES (${ingId}, ${sqlEscape(codeName)});`);
    ingredientIds[ing] = ingId;
    ingId++;
  }
  sqlStatements.push('');

  // 4. Insert Tags
  const tagIds = {};
  let tagId = 1;
  sqlStatements.push('-- Seeding flavor tags');
  for (const tag of tags) {
    sqlStatements.push(`INSERT OR IGNORE INTO flavor_tags (id, code_name) VALUES (${tagId}, ${sqlEscape(tag)});`);
    tagIds[tag] = tagId;
    tagId++;
  }
  sqlStatements.push('');

  // 5. Insert Media
  const mediaIds = {};
  let mId = 1;
  sqlStatements.push('-- Seeding media');
  for (const url of mediaUrls) {
    sqlStatements.push(`INSERT OR IGNORE INTO media (id, url, alt_text) VALUES (${mId}, ${sqlEscape(url)}, ${sqlEscape(path.basename(url, path.extname(url)))});`);
    mediaIds[url] = mId;
    mId++;
  }
  sqlStatements.push('');

  // 6. Insert Menu Items and local associations
  sqlStatements.push('-- Seeding menu items and connections');
  let itemId = 1;
  const menuItemKeyToId = {};
  
    menuData.forEach(item => {
    const catId = categoryIds[item.category];
    const mediaId = item.image ? mediaIds[item.image] : 'NULL';
    const price = item.price;
    sqlStatements.push(`INSERT OR IGNORE INTO menu_items (id, code_name, category_id, media_id, price, is_available) VALUES (${itemId}, ${sqlEscape(item.id)}, ${catId}, ${mediaId}, ${price}, 1);`);
    menuItemKeyToId[item.id] = itemId;

    // Seeding bottles table if it has bottle properties
    if (item.category === 'bottles' && item.bottle_type && item.bottle_volume !== undefined) {
      sqlStatements.push(`INSERT OR IGNORE INTO bottles (menu_item_id, type, volume) VALUES (${itemId}, ${sqlEscape(item.bottle_type)}, ${item.bottle_volume});`);
    }

    // Join table tags
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach(t => {
        sqlStatements.push(`INSERT OR IGNORE INTO menu_item_tags (menu_item_id, tag_id) VALUES (${itemId}, ${tagIds[t]});`);
      });
    }

    // Join table ingredients (matched from English translation)
    const enTrans = enTranslations[item.id];
    if (enTrans && enTrans.ingredients) {
      const list = enTrans.ingredients
        .split(/,|\band\b|&/)
        .map(i => i.trim())
        .filter(i => i.length > 0);
      list.forEach(ingName => {
        const id = ingredientIds[ingName.toLowerCase()];
        if (id) {
          sqlStatements.push(`INSERT OR IGNORE INTO menu_item_ingredients (menu_item_id, ingredient_id) VALUES (${itemId}, ${id});`);
        }
      });
    }

    itemId++;
  });
  sqlStatements.push('');

  // 7. Insert Translations
  sqlStatements.push('-- Seeding translations');
  
  // Localized Categories
  for (const locale of locales) {
    const dict = translationsData[locale];
    // Map categories translations from tab_ keys
    for (const cat of categories) {
      const tabKey = `tab_${cat}`;
      const name = dict[tabKey] || cat;
      const catDatabaseId = categoryIds[cat];
      sqlStatements.push(`INSERT OR IGNORE INTO translations (locale, entity_type, entity_id, name, description) VALUES (${sqlEscape(locale)}, 'category', ${catDatabaseId}, ${sqlEscape(name)}, NULL);`);
    }
  }

  // Localized Tags
  for (const locale of locales) {
    const dict = translationsData[locale];
    const tagDict = dict.menu_tags || {};
    for (const tag of tags) {
      const name = tagDict[tag] || tag;
      const tagDatabaseId = tagIds[tag];
      sqlStatements.push(`INSERT OR IGNORE INTO translations (locale, entity_type, entity_id, name, description) VALUES (${sqlEscape(locale)}, 'tag', ${tagDatabaseId}, ${sqlEscape(name)}, NULL);`);
    }
  }

  // Localized Ingredients
  for (const locale of locales) {
    const dict = translationsData[locale];
    const itemTransDict = dict.menu_items || {};
    // Extract translations for ingredients if they exist or fallback to code names
    for (const ing of ingredients) {
      const ingDatabaseId = ingredientIds[ing];
      // Since ingredients are not individually translated in the static file keys,
      // we default to English/code name, allowing translation additions later in the new backend.
      sqlStatements.push(`INSERT OR IGNORE INTO translations (locale, entity_type, entity_id, name, description) VALUES (${sqlEscape(locale)}, 'ingredient', ${ingDatabaseId}, ${sqlEscape(ing)}, NULL);`);
    }
  }

  // Localized Menu Items
  for (const locale of locales) {
    const dict = translationsData[locale];
    const itemTransDict = dict.menu_items || {};
    
    Object.keys(itemTransDict).forEach(itemKey => {
      const dbId = menuItemKeyToId[itemKey];
      if (dbId) {
        const trans = itemTransDict[itemKey];
        const name = trans.name || itemKey;
        const desc = trans.description || null;
        sqlStatements.push(`INSERT OR IGNORE INTO translations (locale, entity_type, entity_id, name, description) VALUES (${sqlEscape(locale)}, 'menu_item', ${dbId}, ${sqlEscape(name)}, ${sqlEscape(desc)});`);
      }
    });
  }

  // Ensure target folder exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, sqlStatements.join('\n'), 'utf8');
  console.log(`Successfully generated seed SQL script at ${outputPath}`);
}

run().catch(err => {
  console.error('Error running migration extraction:', err);
  process.exit(1);
});
