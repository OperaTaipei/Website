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
    
    // Fetch core items with category name translated into targeted language
    const itemsQuery = `
      SELECT m.id, m.price,
             COALESCE(cat_t.name, c.code_name) as category_name,
             COALESCE(t.name, m.code_name) as name,
             t.description as description
      FROM menu_items m
      INNER JOIN categories c ON c.id = m.category_id
      LEFT JOIN translations cat_t ON cat_t.entity_type = 'category' AND cat_t.entity_id = c.id AND cat_t.locale = ?
      LEFT JOIN translations t ON t.entity_type = 'menu_item' AND t.entity_id = m.id AND t.locale = ?
      WHERE m.id IN (${placeholders})
    `;
    
    const { results: items } = await db.prepare(itemsQuery).bind(locale, locale, ...ids).all();

    // Fetch ingredients translated to target language
    const ingQuery = `
      SELECT mii.menu_item_id, COALESCE(t.name, i.code_name) as name
      FROM menu_item_ingredients mii
      INNER JOIN ingredients i ON i.id = mii.ingredient_id
      LEFT JOIN translations t ON t.entity_type = 'ingredient' AND t.entity_id = i.id AND t.locale = ?
      WHERE mii.menu_item_id IN (${placeholders})
    `;
    const { results: ings } = await db.prepare(ingQuery).bind(locale, ...ids).all();

    // Group relations
    const ingsMap: Record<number, string[]> = {};
    ings.forEach((r: any) => {
      if (!ingsMap[r.menu_item_id]) ingsMap[r.menu_item_id] = [];
      ingsMap[r.menu_item_id].push(r.name);
    });

    const responseData = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category_name: item.category_name,
      description: item.description,
      ingredients: ingsMap[item.id] || []
    }));

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
