export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'DB binding missing' }), { status: 500 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'structure';

  try {
    if (type === 'structure') {
      const query = `
        SELECT sql 
        FROM sqlite_master 
        WHERE type IN ('table', 'index', 'trigger') 
          AND name NOT LIKE 'sqlite_%' 
          AND sql IS NOT NULL;
      `;
      const { results } = await db.prepare(query).all();
      const sqlContent = results.map((row: any) => row.sql + ';').join('\n\n');

      return new Response(sqlContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': 'attachment; filename="schema_backup.sql"',
          'Cache-Control': 'no-cache'
        }
      });
    } else if (type === 'data') {
      // 1. Get all user tables
      const tablesQuery = `
        SELECT name 
        FROM sqlite_master 
        WHERE type='table' 
          AND name NOT LIKE 'sqlite_%' 
          AND name NOT LIKE '_cf_%';
      `;
      const { results: tables } = await db.prepare(tablesQuery).all();

      let sqlContent = `-- OPERA TAIPEI DATABASE BACKUP - DATA\n`;
      sqlContent += `PRAGMA foreign_keys=OFF;\n\n`;

      for (const tRow of tables) {
        const tableName = tRow.name;
        // Fetch all rows
        const { results: rows } = await db.prepare(`SELECT * FROM [${tableName}]`).all();
        if (rows.length === 0) continue;

        sqlContent += `-- Data for table: ${tableName}\n`;
        const columns = Object.keys(rows[0]);
        const columnsEscaped = columns.map(c => `[${c}]`).join(', ');

        for (const row of rows) {
          const valuesFormatted = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val.toString();
            if (typeof val === 'boolean') return val ? '1' : '0';
            return `'${val.toString().replace(/'/g, "''")}'`;
          }).join(', ');

          sqlContent += `INSERT INTO [${tableName}] (${columnsEscaped}) VALUES (${valuesFormatted});\n`;
        }
        sqlContent += `\n`;
      }

      sqlContent += `PRAGMA foreign_keys=ON;\n`;

      return new Response(sqlContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': 'attachment; filename="data_backup.sql"',
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid type parameter' }), { status: 400 });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
