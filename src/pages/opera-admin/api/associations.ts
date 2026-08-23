export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'DB binding missing' }), { status: 500 });
  }

  const url = new URL(request.url);
  const idStr = url.searchParams.get('id');
  if (!idStr) {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), { status: 400 });
  }

  const id = Number(idStr);
  try {
    const { results: ings } = await db
      .prepare('SELECT ingredient_id FROM menu_item_ingredients WHERE menu_item_id = ?')
      .bind(id)
      .all();
      
    const { results: tags } = await db
      .prepare('SELECT tag_id FROM menu_item_tags WHERE menu_item_id = ?')
      .bind(id)
      .all();

    return new Response(
      JSON.stringify({
        ingredients: ings.map((r: any) => r.ingredient_id),
        tags: tags.map((r: any) => r.tag_id)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
