import type { D1Database } from '@cloudflare/workers-types';

export interface Category {
  id: number;
  code_name: string;
  name: string; // English default name
}

export interface Ingredient {
  id: number;
  code_name: string;
  name: string;
  is_unused?: number;
}

export interface FlavorTag {
  id: number;
  code_name: string;
  name: string;
  is_unused?: number;
}

export interface Media {
  id: number;
  url: string;
  alt_text?: string;
}

export interface BottleType {
  id: number;
  code_name: string;
  name: string;
}

export interface MenuItem {
  id: number;
  code_name: string;
  category_id: number | null;
  category_name: string;
  media_id: number | null;
  media_url: string | null;
  price: number;
  is_available: boolean;
  name: string; // English translation name
  description: string | null;
  ingredients: string[]; // List of ingredient names
  tags: string[]; // List of tag names
  bottle_type?: string;
  bottle_type_id?: number;
  bottle_volume?: number;
  has_no_category?: number;
}

export interface TranslationsInput {
  en: { name: string; description?: string };
  fr: { name: string; description?: string };
  ja: { name: string; description?: string };
  zh: { name: string; description?: string };
}

// ----------------------------------------------------
// READ Operations
// ----------------------------------------------------

export async function getCategories(db: D1Database): Promise<Category[]> {
  const query = `
    SELECT c.id, c.code_name, COALESCE(t.name, c.code_name) as name
    FROM categories c
    LEFT JOIN translations t ON t.entity_type = 'category' AND t.entity_id = c.id AND t.locale = 'en'
  `;
  const { results } = await db.prepare(query).all();
  return results as unknown as Category[];
}

export async function getIngredients(db: D1Database): Promise<Ingredient[]> {
  const query = `
    SELECT i.id, i.code_name, COALESCE(t.name, i.code_name) as name,
           CASE WHEN i.id NOT IN (SELECT DISTINCT ingredient_id FROM menu_item_ingredients) THEN 1 ELSE 0 END as is_unused
    FROM ingredients i
    LEFT JOIN translations t ON t.entity_type = 'ingredient' AND t.entity_id = i.id AND t.locale = 'en'
    ORDER BY name ASC
  `;
  const { results } = await db.prepare(query).all();
  return results as unknown as Ingredient[];
}

export async function getFlavorTags(db: D1Database): Promise<FlavorTag[]> {
  const query = `
    SELECT f.id, f.code_name, COALESCE(t.name, f.code_name) as name,
           CASE WHEN f.id NOT IN (SELECT DISTINCT tag_id FROM menu_item_tags) THEN 1 ELSE 0 END as is_unused
    FROM flavor_tags f
    LEFT JOIN translations t ON t.entity_type = 'tag' AND t.entity_id = f.id AND t.locale = 'en'
    ORDER BY name ASC
  `;
  const { results } = await db.prepare(query).all();
  return results as unknown as FlavorTag[];
}

export async function getMedia(db: D1Database): Promise<Media[]> {
  const { results } = await db.prepare(`SELECT id, url, alt_text FROM media`).all();
  return results as unknown as Media[];
}

export async function getMenuItems(db: D1Database): Promise<MenuItem[]> {
  const itemsQuery = `
    SELECT m.id, m.code_name, m.category_id, m.media_id, m.price, m.is_available,
           COALESCE(cat_t.name, c.code_name, 'No Category') as category_name,
           med.url as media_url,
           COALESCE(t.name, m.code_name) as name,
           t.description as description,
           b.bottle_type_id,
           COALESCE(bt_t.name, bt.code_name) as bottle_type,
           b.volume as bottle_volume,
           CASE WHEN c.id IS NULL THEN 1 ELSE 0 END as has_no_category
     FROM menu_items m
     LEFT JOIN categories c ON c.id = m.category_id
     LEFT JOIN translations cat_t ON cat_t.entity_type = 'category' AND cat_t.entity_id = c.id AND cat_t.locale = 'en'
     LEFT JOIN media med ON med.id = m.media_id
     LEFT JOIN translations t ON t.entity_type = 'menu_item' AND t.entity_id = m.id AND t.locale = 'en'
     LEFT JOIN bottles b ON b.menu_item_id = m.id
     LEFT JOIN bottle_types bt ON bt.id = b.bottle_type_id
     LEFT JOIN translations bt_t ON bt_t.entity_type = 'bottle_type' AND bt_t.entity_id = bt.id AND bt_t.locale = 'en'
     ORDER BY category_name ASC, name ASC
  `;
  
  const { results: items } = await db.prepare(itemsQuery).all();

  // Fetch ingredients relation
  const ingQuery = `
    SELECT mii.menu_item_id, COALESCE(t.name, i.code_name) as name
    FROM menu_item_ingredients mii
    INNER JOIN ingredients i ON i.id = mii.ingredient_id
    LEFT JOIN translations t ON t.entity_type = 'ingredient' AND t.entity_id = i.id AND t.locale = 'en'
  `;
  const { results: ings } = await db.prepare(ingQuery).all();

  // Fetch tags relation
  const tagQuery = `
    SELECT mit.menu_item_id, COALESCE(t.name, f.code_name) as name
    FROM menu_item_tags mit
    INNER JOIN flavor_tags f ON f.id = mit.tag_id
    LEFT JOIN translations t ON t.entity_type = 'tag' AND t.entity_id = f.id AND t.locale = 'en'
  `;
  const { results: tags } = await db.prepare(tagQuery).all();

  // Group relations by menu_item_id
  const ingsMap: Record<number, string[]> = {};
  ings.forEach((r: any) => {
    if (!ingsMap[r.menu_item_id]) ingsMap[r.menu_item_id] = [];
    ingsMap[r.menu_item_id].push(r.name);
  });

  const tagsMap: Record<number, string[]> = {};
  tags.forEach((r: any) => {
    if (!tagsMap[r.menu_item_id]) tagsMap[r.menu_item_id] = [];
    tagsMap[r.menu_item_id].push(r.name);
  });

  return items.map((item: any) => ({
    id: item.id,
    code_name: item.code_name,
    category_id: item.category_id,
    category_name: item.category_name,
    media_id: item.media_id,
    media_url: item.media_url,
    price: item.price,
    is_available: Boolean(item.is_available),
    name: item.name,
    description: item.description,
    ingredients: ingsMap[item.id] || [],
    tags: tagsMap[item.id] || [],
    bottle_type: item.bottle_type || undefined,
    bottle_type_id: item.bottle_type_id !== null && item.bottle_type_id !== undefined ? item.bottle_type_id : undefined,
    bottle_volume: item.bottle_volume !== null && item.bottle_volume !== undefined ? item.bottle_volume : undefined,
    has_no_category: item.has_no_category
  }));
}

export async function getTranslationsForEntity(
  db: D1Database,
  entityType: 'menu_item' | 'category' | 'ingredient' | 'tag' | 'bottle_type',
  entityId: number
): Promise<Record<string, { name: string; description?: string }>> {
  const { results } = await db
    .prepare(`SELECT locale, name, description FROM translations WHERE entity_type = ? AND entity_id = ?`)
    .bind(entityType, entityId)
    .all();

  const trans: Record<string, { name: string; description?: string }> = {
    en: { name: '' },
    fr: { name: '' },
    ja: { name: '' },
    zh: { name: '' }
  };

  results.forEach((row: any) => {
    trans[row.locale] = {
      name: row.name,
      description: row.description || undefined
    };
  });

  return trans;
}

// ----------------------------------------------------
// WRITE Operations (with transactional behavior for translations)
// ----------------------------------------------------

async function saveTranslations(
  db: D1Database,
  entityType: 'menu_item' | 'category' | 'ingredient' | 'tag',
  entityId: number,
  translations: TranslationsInput
) {
  const locales: ('en' | 'fr' | 'ja' | 'zh')[] = ['en', 'fr', 'ja', 'zh'];
  const statements = [];

  for (const locale of locales) {
    const data = translations[locale];
    if (data && data.name) {
      statements.push(
        db.prepare(`
          INSERT INTO translations (locale, entity_type, entity_id, name, description)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(locale, entity_type, entity_id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description
        `).bind(locale, entityType, entityId, data.name, data.description || null)
      );
    }
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

export async function createMenuItem(
  db: D1Database,
  data: {
    code_name: string;
    category_id: number;
    media_id: number | null;
    price: number;
    is_available: boolean;
    ingredients: number[]; // IDs
    tags: number[]; // IDs
    translations: TranslationsInput;
    bottle_type_id?: number;
    bottle_volume?: number;
  }
): Promise<number> {
  // 1. Insert Menu Item
  const res = await db
    .prepare(`
      INSERT INTO menu_items (code_name, category_id, media_id, price, is_available)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(data.code_name, data.category_id, data.media_id, data.price, data.is_available ? 1 : 0)
    .run();

  const insertId = res.meta.last_row_id;

  // Insert bottle details if provided
  if (data.bottle_type_id && data.bottle_volume !== undefined) {
    await db
      .prepare(`INSERT INTO bottles (menu_item_id, bottle_type_id, volume) VALUES (?, ?, ?)`)
      .bind(insertId, data.bottle_type_id, data.bottle_volume)
      .run();
  }

  // 2. Insert Join Tables
  const batchStatements = [];
  if (data.ingredients.length > 0) {
    data.ingredients.forEach(ingId => {
      batchStatements.push(
        db.prepare(`INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id) VALUES (?, ?)`).bind(insertId, ingId)
      );
    });
  }
  if (data.tags.length > 0) {
    data.tags.forEach(tagId => {
      batchStatements.push(
        db.prepare(`INSERT INTO menu_item_tags (menu_item_id, tag_id) VALUES (?, ?)`).bind(insertId, tagId)
      );
    });
  }
  if (batchStatements.length > 0) {
    await db.batch(batchStatements);
  }

  // 3. Save Translations
  await saveTranslations(db, 'menu_item', insertId, data.translations);

  return insertId;
}

export async function updateMenuItem(
  db: D1Database,
  id: number,
  data: {
    code_name: string;
    category_id: number;
    media_id: number | null;
    price: number;
    is_available: boolean;
    ingredients: number[]; // IDs
    tags: number[]; // IDs
    translations: TranslationsInput;
    bottle_type_id?: number;
    bottle_volume?: number;
  }
) {
  // 1. Update Core
  await db
    .prepare(`
      UPDATE menu_items
      SET code_name = ?, category_id = ?, media_id = ?, price = ?, is_available = ?
      WHERE id = ?
    `)
    .bind(data.code_name, data.category_id, data.media_id, data.price, data.is_available ? 1 : 0, id)
    .run();

  // Update or insert or delete bottle details
  if (data.bottle_type_id && data.bottle_volume !== undefined) {
    await db.prepare(`
      INSERT INTO bottles (menu_item_id, bottle_type_id, volume)
      VALUES (?, ?, ?)
      ON CONFLICT(menu_item_id) DO UPDATE SET
        bottle_type_id = excluded.bottle_type_id,
        volume = excluded.volume
    `).bind(id, data.bottle_type_id, data.bottle_volume).run();
  } else {
    await db.prepare(`DELETE FROM bottles WHERE menu_item_id = ?`).bind(id).run();
  }

  // 2. Update Relations (Clear and insert)
  await db.batch([
    db.prepare(`DELETE FROM menu_item_ingredients WHERE menu_item_id = ?`).bind(id),
    db.prepare(`DELETE FROM menu_item_tags WHERE menu_item_id = ?`).bind(id)
  ]);

  const batchStatements = [];
  if (data.ingredients.length > 0) {
    data.ingredients.forEach(ingId => {
      batchStatements.push(
        db.prepare(`INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id) VALUES (?, ?)`).bind(id, ingId)
      );
    });
  }
  if (data.tags.length > 0) {
    data.tags.forEach(tagId => {
      batchStatements.push(
        db.prepare(`INSERT INTO menu_item_tags (menu_item_id, tag_id) VALUES (?, ?)`).bind(id, tagId)
      );
    });
  }
  if (batchStatements.length > 0) {
    await db.batch(batchStatements);
  }

  // 3. Save Translations
  await saveTranslations(db, 'menu_item', id, data.translations);
}

// ----------------------------------------------------
// GENERIC CRUD Helpers for Categories, Ingredients, Tags
// ----------------------------------------------------

export async function createCategory(db: D1Database, codeName: string, translations: TranslationsInput): Promise<number> {
  const res = await db.prepare(`INSERT INTO categories (code_name) VALUES (?)`).bind(codeName).run();
  const insertId = res.meta.last_row_id;
  await saveTranslations(db, 'category', insertId, translations);
  return insertId;
}

export async function updateCategory(db: D1Database, id: number, codeName: string, translations: TranslationsInput) {
  await db.prepare(`UPDATE categories SET code_name = ? WHERE id = ?`).bind(codeName, id).run();
  await saveTranslations(db, 'category', id, translations);
}

export async function createIngredient(db: D1Database, codeName: string, translations: TranslationsInput): Promise<number> {
  const res = await db.prepare(`INSERT INTO ingredients (code_name) VALUES (?)`).bind(codeName).run();
  const insertId = res.meta.last_row_id;
  await saveTranslations(db, 'ingredient', insertId, translations);
  return insertId;
}

export async function updateIngredient(db: D1Database, id: number, codeName: string, translations: TranslationsInput) {
  await db.prepare(`UPDATE ingredients SET code_name = ? WHERE id = ?`).bind(codeName, id).run();
  await saveTranslations(db, 'ingredient', id, translations);
}

export async function createFlavorTag(db: D1Database, codeName: string, translations: TranslationsInput): Promise<number> {
  const res = await db.prepare(`INSERT INTO flavor_tags (code_name) VALUES (?)`).bind(codeName).run();
  const insertId = res.meta.last_row_id;
  await saveTranslations(db, 'tag', insertId, translations);
  return insertId;
}

export async function updateFlavorTag(db: D1Database, id: number, codeName: string, translations: TranslationsInput) {
  await db.prepare(`UPDATE flavor_tags SET code_name = ? WHERE id = ?`).bind(codeName, id).run();
  await saveTranslations(db, 'tag', id, translations);
}

// ----------------------------------------------------
// DELETION & Safe Constraint Handling
// ----------------------------------------------------

export async function deleteMenuItem(db: D1Database, id: number) {
  // Casacades translations and joins
  await db.batch([
    db.prepare(`DELETE FROM translations WHERE entity_type = 'menu_item' AND entity_id = ?`).bind(id),
    db.prepare(`DELETE FROM menu_items WHERE id = ?`).bind(id)
  ]);
}

export async function deleteCategory(db: D1Database, id: number) {
  try {
    // Check if referenced by menu items
    const { results } = await db.prepare(`SELECT id, code_name FROM menu_items WHERE category_id = ? LIMIT 1`).bind(id).all();
    if (results.length > 0) {
      throw new Error(`Cannot delete this category because it is currently referenced by menu items.`);
    }
    await db.batch([
      db.prepare(`DELETE FROM translations WHERE entity_type = 'category' AND entity_id = ?`).bind(id),
      db.prepare(`DELETE FROM categories WHERE id = ?`).bind(id)
    ]);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteIngredient(db: D1Database, id: number) {
  try {
    // Check if referenced by menu item ingredients
    const { results } = await db.prepare(`
      SELECT m.code_name 
      FROM menu_item_ingredients mii
      INNER JOIN menu_items m ON m.id = mii.menu_item_id
      WHERE mii.ingredient_id = ? LIMIT 1
    `).bind(id).all();
    
    if (results.length > 0) {
      const itemName = results[0].code_name;
      throw new Error(`Cannot delete this ingredient because it is currently referenced by menu item '${itemName}'.`);
    }

    await db.batch([
      db.prepare(`DELETE FROM translations WHERE entity_type = 'ingredient' AND entity_id = ?`).bind(id),
      db.prepare(`DELETE FROM ingredients WHERE id = ?`).bind(id)
    ]);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteFlavorTag(db: D1Database, id: number) {
  try {
    // Check if referenced by menu item tags
    const { results } = await db.prepare(`
      SELECT m.code_name 
      FROM menu_item_tags mit
      INNER JOIN menu_items m ON m.id = mit.menu_item_id
      WHERE mit.tag_id = ? LIMIT 1
    `).bind(id).all();
    
    if (results.length > 0) {
      const itemName = results[0].code_name;
      throw new Error(`Cannot delete this tag because it is currently referenced by menu item '${itemName}'.`);
    }

    await db.batch([
      db.prepare(`DELETE FROM translations WHERE entity_type = 'tag' AND entity_id = ?`).bind(id),
      db.prepare(`DELETE FROM flavor_tags WHERE id = ?`).bind(id)
    ]);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getBottleTypes(db: D1Database): Promise<BottleType[]> {
  const query = `
    SELECT b.id, b.code_name, COALESCE(t.name, b.code_name) as name
    FROM bottle_types b
    LEFT JOIN translations t ON t.entity_type = 'bottle_type' AND t.entity_id = b.id AND t.locale = 'en'
    ORDER BY name ASC
  `;
  const { results } = await db.prepare(query).all();
  return results as unknown as BottleType[];
}

export async function createBottleType(db: D1Database, codeName: string, translations: TranslationsInput): Promise<number> {
  const res = await db.prepare(`INSERT INTO bottle_types (code_name) VALUES (?)`).bind(codeName).run();
  const insertId = res.meta.last_row_id;
  await saveTranslations(db, 'bottle_type', insertId, translations);
  return insertId;
}

export async function updateBottleType(db: D1Database, id: number, codeName: string, translations: TranslationsInput): Promise<void> {
  await db.prepare(`UPDATE bottle_types SET code_name = ? WHERE id = ?`).bind(codeName, id).run();
  await saveTranslations(db, 'bottle_type', id, translations);
}

export async function deleteBottleType(db: D1Database, id: number): Promise<void> {
  try {
    // Check if referenced by bottles
    const { results } = await db.prepare(`SELECT menu_item_id FROM bottles WHERE bottle_type_id = ? LIMIT 1`).bind(id).all();
    if (results.length > 0) {
      throw new Error(`Cannot delete this bottle type because it is currently referenced by bottles in the menu.`);
    }
    await db.batch([
      db.prepare(`DELETE FROM translations WHERE entity_type = 'bottle_type' AND entity_id = ?`).bind(id),
      db.prepare(`DELETE FROM bottle_types WHERE id = ?`).bind(id)
    ]);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getOrphans(db: D1Database): Promise<{
  ingredients: { id: number; name: string; code_name: string }[];
  translations: { id: number; locale: string; entity_type: string; entity_id: number; name: string }[];
  pivotIngredients: { menu_item_id: number; ingredient_id: number }[];
  pivotTags: { menu_item_id: number; tag_id: number }[];
  media: { id: number; url: string; alt_text: string | null }[];
}> {
  // 1. Orphan Ingredients (not in menu_item_ingredients)
  const orphanIngredientsQuery = `
    SELECT i.id, i.code_name, COALESCE(t.name, i.code_name) as name
    FROM ingredients i
    LEFT JOIN translations t ON t.entity_type = 'ingredient' AND t.entity_id = i.id AND t.locale = 'en'
    WHERE i.id NOT IN (SELECT DISTINCT ingredient_id FROM menu_item_ingredients)
    ORDER BY name ASC
  `;
  const { results: ingredients } = await db.prepare(orphanIngredientsQuery).all();

  // 2. Orphan Translations
  const orphanTranslationsQuery = `
    SELECT id, locale, entity_type, entity_id, name
    FROM translations
    WHERE (entity_type = 'menu_item' AND entity_id NOT IN (SELECT id FROM menu_items))
       OR (entity_type = 'category' AND entity_id NOT IN (SELECT id FROM categories))
       OR (entity_type = 'ingredient' AND entity_id NOT IN (SELECT id FROM ingredients))
       OR (entity_type = 'tag' AND entity_id NOT IN (SELECT id FROM flavor_tags))
       OR (entity_type = 'bottle_type' AND entity_id NOT IN (SELECT id FROM bottle_types))
    ORDER BY entity_type ASC, name ASC
  `;
  const { results: translations } = await db.prepare(orphanTranslationsQuery).all();

  // 3. Orphan Pivot Entries
  const orphanPivotIngredientsQuery = `
    SELECT mii.menu_item_id, mii.ingredient_id
    FROM menu_item_ingredients mii
    WHERE mii.menu_item_id NOT IN (SELECT id FROM menu_items)
       OR mii.ingredient_id NOT IN (SELECT id FROM ingredients)
  `;
  const { results: pivotIngredients } = await db.prepare(orphanPivotIngredientsQuery).all();

  const orphanPivotTagsQuery = `
    SELECT mit.menu_item_id, mit.tag_id
    FROM menu_item_tags mit
    WHERE mit.menu_item_id NOT IN (SELECT id FROM menu_items)
       OR mit.tag_id NOT IN (SELECT id FROM flavor_tags)
  `;
  const { results: pivotTags } = await db.prepare(orphanPivotTagsQuery).all();

  // 4. Orphan Media
  const orphanMediaQuery = `
    SELECT id, url, alt_text
    FROM media
    WHERE id NOT IN (SELECT DISTINCT media_id FROM menu_items WHERE media_id IS NOT NULL)
    ORDER BY url ASC
  `;
  const { results: media } = await db.prepare(orphanMediaQuery).all();

  return {
    ingredients: ingredients as any,
    translations: translations as any,
    pivotIngredients: pivotIngredients as any,
    pivotTags: pivotTags as any,
    media: media as any
  };
}

export async function purgeOrphans(db: D1Database): Promise<void> {
  // Execute deletion queries in correct sequence:
  // 1. Pivot entries (referencing non-existent menu items, ingredients, or tags)
  // 2. Orphan ingredients (ingredients not in menu_item_ingredients)
  // 3. Orphan translations (translations referencing non-existent categories, ingredients, tags, menu_items, or bottle_types)
  // 4. Orphan media (media not referenced by any menu_item)
  const statements = [
    // 1. Pivot Entries
    db.prepare(`
      DELETE FROM menu_item_ingredients
      WHERE menu_item_id NOT IN (SELECT id FROM menu_items)
         OR ingredient_id NOT IN (SELECT id FROM ingredients)
    `),
    db.prepare(`
      DELETE FROM menu_item_tags
      WHERE menu_item_id NOT IN (SELECT id FROM menu_items)
         OR tag_id NOT IN (SELECT id FROM flavor_tags)
    `),
    // 2. Orphan Ingredients
    db.prepare(`
      DELETE FROM ingredients
      WHERE id NOT IN (SELECT DISTINCT ingredient_id FROM menu_item_ingredients)
    `),
    // 3. Orphan Translations
    db.prepare(`
      DELETE FROM translations
      WHERE (entity_type = 'menu_item' AND entity_id NOT IN (SELECT id FROM menu_items))
         OR (entity_type = 'category' AND entity_id NOT IN (SELECT id FROM categories))
         OR (entity_type = 'ingredient' AND entity_id NOT IN (SELECT id FROM ingredients))
         OR (entity_type = 'tag' AND entity_id NOT IN (SELECT id FROM flavor_tags))
         OR (entity_type = 'bottle_type' AND entity_id NOT IN (SELECT id FROM bottle_types))
    `),
    // 4. Orphan Media
    db.prepare(`
      DELETE FROM media
      WHERE id NOT IN (SELECT DISTINCT media_id FROM menu_items WHERE media_id IS NOT NULL)
    `)
  ];

  await db.batch(statements);
}

export async function createMedia(db: D1Database, url: string, altText?: string | null): Promise<number> {
  const res = await db.prepare(`INSERT INTO media (url, alt_text) VALUES (?, ?)`).bind(url, altText || null).run();
  return res.meta.last_row_id;
}

export async function updateMedia(db: D1Database, id: number, url: string, altText?: string | null): Promise<void> {
  await db.prepare(`UPDATE media SET url = ?, alt_text = ? WHERE id = ?`).bind(url, altText || null, id).run();
}

export async function deleteMedia(db: D1Database, id: number): Promise<void> {
  await db.prepare(`DELETE FROM media WHERE id = ?`).bind(id).run();
}

