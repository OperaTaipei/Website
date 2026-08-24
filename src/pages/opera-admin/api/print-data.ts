export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'DB binding missing' }), { status: 500 });
  }

  const url = new URL(request.url);
  const idsStr = url.searchParams.get('ids');
  const locale = url.searchParams.get('locale') || 'en';

  if (!idsStr) {
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const ids = idsStr.split(',').map(Number);
  
  try {
    // Generate parameterized place holders for safety
    const placeholders = ids.map(() => '?').join(',');
    
    // Fetch core items with category name translated into targeted language (falling back to English, then code name)
    const itemsQuery = `
      SELECT m.id, m.category_id, m.price,
             COALESCE(cat_t.name, cat_en.name, c.code_name) as category_name,
             COALESCE(t.name, t_en.name, m.code_name) as name,
             COALESCE(t.description, t_en.description) as description,
             COALESCE(bt_t.name, bt_en.name, bt.code_name) as bottle_type,
             b.volume as bottle_volume
      FROM menu_items m
      INNER JOIN categories c ON c.id = m.category_id
      LEFT JOIN translations cat_t ON cat_t.entity_type = 'category' AND cat_t.entity_id = c.id AND cat_t.locale = ?
      LEFT JOIN translations cat_en ON cat_en.entity_type = 'category' AND cat_en.entity_id = c.id AND cat_en.locale = 'en'
      LEFT JOIN translations t ON t.entity_type = 'menu_item' AND t.entity_id = m.id AND t.locale = ?
      LEFT JOIN translations t_en ON t_en.entity_type = 'menu_item' AND t_en.entity_id = m.id AND t_en.locale = 'en'
      LEFT JOIN bottles b ON b.menu_item_id = m.id
      LEFT JOIN bottle_types bt ON bt.id = b.bottle_type_id
      LEFT JOIN translations bt_t ON bt_t.entity_type = 'bottle_type' AND bt_t.entity_id = bt.id AND bt_t.locale = ?
      LEFT JOIN translations bt_en ON bt_en.entity_type = 'bottle_type' AND bt_en.entity_id = bt.id AND bt_en.locale = 'en'
      WHERE m.id IN (${placeholders})
    `;
    
    const { results: items } = await db.prepare(itemsQuery).bind(locale, locale, locale, ...ids).all();

    // Fetch ingredients translated to target language (falling back to English)
    const ingQuery = `
      SELECT mii.menu_item_id, COALESCE(t.name, t_en.name, i.code_name) as name
      FROM menu_item_ingredients mii
      INNER JOIN ingredients i ON i.id = mii.ingredient_id
      LEFT JOIN translations t ON t.entity_type = 'ingredient' AND t.entity_id = i.id AND t.locale = ?
      LEFT JOIN translations t_en ON t_en.entity_type = 'ingredient' AND t_en.entity_id = i.id AND t_en.locale = 'en'
      WHERE mii.menu_item_id IN (${placeholders})
    `;
    const { results: ings } = await db.prepare(ingQuery).bind(locale, ...ids).all();

    // Group relations
    const ingsMap: Record<number, string[]> = {};
    ings.forEach((r: any) => {
      if (!ingsMap[r.menu_item_id]) ingsMap[r.menu_item_id] = [];
      ingsMap[r.menu_item_id].push(r.name);
    });

    // Fetch tags translated to target language (falling back to English)
    const tagsQuery = `
      SELECT mit.menu_item_id, COALESCE(t.name, t_en.name, ft.code_name) as name
      FROM menu_item_tags mit
      INNER JOIN flavor_tags ft ON ft.id = mit.tag_id
      LEFT JOIN translations t ON t.entity_type = 'tag' AND t.entity_id = ft.id AND t.locale = ?
      LEFT JOIN translations t_en ON t_en.entity_type = 'tag' AND t_en.entity_id = ft.id AND t_en.locale = 'en'
      WHERE mit.menu_item_id IN (${placeholders})
    `;
    const { results: tags } = await db.prepare(tagsQuery).bind(locale, ...ids).all();

    const tagsMap: Record<number, string[]> = {};
    tags.forEach((r: any) => {
      if (!tagsMap[r.menu_item_id]) tagsMap[r.menu_item_id] = [];
      tagsMap[r.menu_item_id].push(r.name);
    });

    const responseData = items.map((item: any) => ({
      id: item.id,
      category_id: item.category_id,
      name: item.name,
      price: item.price,
      category_name: item.category_name,
      description: item.description,
      ingredients: ingsMap[item.id] || [],
      tags: tagsMap[item.id] || [],
      bottle_type: item.bottle_type || undefined,
      bottle_volume: item.bottle_volume !== null && item.bottle_volume !== undefined ? item.bottle_volume : undefined
    }));

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
