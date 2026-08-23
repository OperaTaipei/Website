export const prerender = false;

import type { APIRoute } from 'astro';
import * as dbHelpers from '../../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'DB binding missing' }), { status: 500 });
  }

  const url = new URL(request.url);
  const entityType = url.searchParams.get('entity_type') as any;
  const idStr = url.searchParams.get('id');

  if (!entityType || !idStr) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  const id = Number(idStr);
  try {
    const translations = await dbHelpers.getTranslationsForEntity(db, entityType, id);
    return new Response(JSON.stringify(translations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
