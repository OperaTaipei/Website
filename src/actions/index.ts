import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import * as dbHelpers from '../lib/db';

const translationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional()
});

const translationsInputSchema = z.object({
  en: translationSchema,
  fr: translationSchema.optional().or(z.object({ name: z.string(), description: z.string().optional() })),
  ja: translationSchema.optional().or(z.object({ name: z.string(), description: z.string().optional() })),
  zh: translationSchema.optional().or(z.object({ name: z.string(), description: z.string().optional() }))
});

export const server = {
  // ----------------------------------------------------
  // MENU ITEMS ACTIONS
  // ----------------------------------------------------
  saveMenuItem: defineAction({
    accept: 'json',
    input: z.object({
      id: z.number().optional(), // If provided, update; else create
      code_name: z.string().min(1, 'Code name is required'),
      category_id: z.number(),
      media_id: z.number().nullable(),
      price: z.number().min(0, 'Price must be positive'),
      is_available: z.boolean(),
      ingredients: z.array(z.number()),
      tags: z.array(z.number()),
      translations: translationsInputSchema,
      bottle_type_id: z.number().nullable().optional(),
      bottle_volume: z.number().min(0).nullable().optional()
    }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) {
        throw new Error('Database connection not available in context.');
      }

      try {
        const payload = {
          code_name: input.code_name,
          category_id: input.category_id,
          media_id: input.media_id,
          price: input.price,
          is_available: input.is_available,
          ingredients: input.ingredients,
          tags: input.tags,
          translations: input.translations as dbHelpers.TranslationsInput,
          bottle_type_id: input.bottle_type_id !== null && input.bottle_type_id !== undefined ? input.bottle_type_id : undefined,
          bottle_volume: input.bottle_volume !== null && input.bottle_volume !== undefined ? input.bottle_volume : undefined
        };

        if (input.id) {
          await dbHelpers.updateMenuItem(db, input.id, payload);
          return { success: true, message: 'Menu item updated successfully.' };
        } else {
          const newId = await dbHelpers.createMenuItem(db, payload);
          return { success: true, message: 'Menu item created successfully.', id: newId };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to save menu item.' };
      }
    }
  }),

  deleteMenuItem: defineAction({
    accept: 'json',
    input: z.object({ id: z.number() }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        await dbHelpers.deleteMenuItem(db, input.id);
        return { success: true, message: 'Menu item deleted successfully.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to delete menu item.' };
      }
    }
  }),

  toggleMenuItemAvailability: defineAction({
    accept: 'json',
    input: z.object({ id: z.number(), is_available: z.boolean() }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        await db.prepare('UPDATE menu_items SET is_available = ? WHERE id = ?')
          .bind(input.is_available ? 1 : 0, input.id)
          .run();
        return { success: true, message: 'Availability status toggled successfully.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to toggle availability.' };
      }
    }
  }),

  // ----------------------------------------------------
  // INGREDIENTS ACTIONS
  // ----------------------------------------------------
  saveIngredient: defineAction({
    accept: 'json',
    input: z.object({
      id: z.number().optional(),
      code_name: z.string().min(1, 'Code name is required'),
      translations: translationsInputSchema
    }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        if (input.id) {
          await dbHelpers.updateIngredient(db, input.id, input.code_name, input.translations as dbHelpers.TranslationsInput);
          return { success: true, message: 'Ingredient updated successfully.' };
        } else {
          const newId = await dbHelpers.createIngredient(db, input.code_name, input.translations as dbHelpers.TranslationsInput);
          return { success: true, message: 'Ingredient created successfully.', id: newId };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to save ingredient.' };
      }
    }
  }),

  deleteIngredient: defineAction({
    accept: 'json',
    input: z.object({ id: z.number() }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        await dbHelpers.deleteIngredient(db, input.id);
        return { success: true, message: 'Ingredient deleted successfully.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to delete ingredient.' };
      }
    }
  }),

  // ----------------------------------------------------
  // FLAVOR TAGS ACTIONS
  // ----------------------------------------------------
  saveFlavorTag: defineAction({
    accept: 'json',
    input: z.object({
      id: z.number().optional(),
      code_name: z.string().min(1, 'Code name is required'),
      translations: translationsInputSchema
    }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        if (input.id) {
          await dbHelpers.updateFlavorTag(db, input.id, input.code_name, input.translations as dbHelpers.TranslationsInput);
          return { success: true, message: 'Tag updated successfully.' };
        } else {
          const newId = await dbHelpers.createFlavorTag(db, input.code_name, input.translations as dbHelpers.TranslationsInput);
          return { success: true, message: 'Tag created successfully.', id: newId };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to save tag.' };
      }
    }
  }),

  deleteFlavorTag: defineAction({
    accept: 'json',
    input: z.object({ id: z.number() }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        await dbHelpers.deleteFlavorTag(db, input.id);
        return { success: true, message: 'Tag deleted successfully.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to delete tag.' };
      }
    }
  }),

  // ----------------------------------------------------
  // CATEGORY ACTIONS
  // ----------------------------------------------------
  saveCategory: defineAction({
    accept: 'json',
    input: z.object({
      id: z.number().optional(),
      code_name: z.string().min(1, 'Code name is required'),
      translations: translationsInputSchema
    }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        if (input.id) {
          await dbHelpers.updateCategory(db, input.id, input.code_name, input.translations as dbHelpers.TranslationsInput);
          return { success: true, message: 'Category updated successfully.' };
        } else {
          const newId = await dbHelpers.createCategory(db, input.code_name, input.translations as dbHelpers.TranslationsInput);
          return { success: true, message: 'Category created successfully.', id: newId };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to save category.' };
      }
    }
  }),

  deleteCategory: defineAction({
    accept: 'json',
    input: z.object({ id: z.number() }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        await dbHelpers.deleteCategory(db, input.id);
        return { success: true, message: 'Category deleted successfully.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to delete category.' };
      }
    }
  }),

  // ----------------------------------------------------
  // BOTTLE TYPES ACTIONS
  // ----------------------------------------------------
  saveBottleType: defineAction({
    accept: 'json',
    input: z.object({
      id: z.number().optional(),
      code_name: z.string().min(1, 'Code name is required'),
      translations: translationsInputSchema
    }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        if (input.id) {
          await dbHelpers.updateBottleType(db, input.id, input.code_name, input.translations as dbHelpers.TranslationsInput);
          return { success: true, message: 'Bottle type updated successfully.' };
        } else {
          const newId = await dbHelpers.createBottleType(db, input.code_name, input.translations as dbHelpers.TranslationsInput);
          return { success: true, message: 'Bottle type created successfully.', id: newId };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to save bottle type.' };
      }
    }
  }),

  deleteBottleType: defineAction({
    accept: 'json',
    input: z.object({ id: z.number() }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        await dbHelpers.deleteBottleType(db, input.id);
        return { success: true, message: 'Bottle type deleted successfully.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to delete bottle type.' };
      }
    }
  }),

  // ----------------------------------------------------
  // MEDIA ACTIONS
  // ----------------------------------------------------
  saveMedia: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string().optional(),
      url: z.string().optional(),
      alt_text: z.string().nullable().optional(),
      file: z.any().optional()
    }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      const bucket = context.locals.runtime?.env?.MEDIA_BUCKET;
      if (!db) throw new Error('Database connection not available.');

      try {
        let finalUrl = input.url || '';
        const file = input.file as File | null;

        if (file && file.size > 0) {
          if (file.size > 153600) {
            throw new Error('File size exceeds the 150 KB limit.');
          }
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
          if (!allowedTypes.includes(file.type)) {
            throw new Error('Only JPG and PNG files are allowed.');
          }

          if (!bucket) {
            throw new Error('R2 Bucket connection not available.');
          }

          // Generate a safe unique filename: <timestamp>_<sanitized_name>
          const timestamp = Date.now();
          const cleanName = file.name
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, '_');
          const fileName = `${timestamp}_${cleanName}`;

          // Upload to R2
          const buffer = await file.arrayBuffer();
          await bucket.put(fileName, buffer, {
            httpMetadata: { contentType: file.type }
          });

          // Final URL pointing to custom domain
          finalUrl = `https://media.opera-taipei.com/${fileName}`;
        } else if (!input.id) {
          throw new Error('Please select an image file to upload.');
        }

        const idNum = input.id ? Number(input.id) : undefined;
        if (idNum) {
          await dbHelpers.updateMedia(db, idNum, finalUrl, input.alt_text);
          return { success: true, message: 'Media updated successfully.' };
        } else {
          const newId = await dbHelpers.createMedia(db, finalUrl, input.alt_text);
          return { success: true, message: 'Media created successfully.', id: newId };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to save media.' };
      }
    }
  }),

  deleteMedia: defineAction({
    accept: 'json',
    input: z.object({ id: z.number() }),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      if (!db) throw new Error('Database connection not available.');
      try {
        await dbHelpers.deleteMedia(db, input.id);
        return { success: true, message: 'Media deleted successfully.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to delete media.' };
      }
    }
  }),

  purgeOrphans: defineAction({
    accept: 'json',
    input: z.object({}),
    handler: async (input, context) => {
      const db = context.locals.runtime?.env?.DB;
      const bucket = context.locals.runtime?.env?.MEDIA_BUCKET;
      if (!db) throw new Error('Database connection not available.');
      try {
        // Fetch orphans first to get URLs of media that need to be deleted from R2
        const orphans = await dbHelpers.getOrphans(db);
        if (orphans.media && orphans.media.length > 0 && bucket) {
          for (const media of orphans.media) {
            const fileName = media.url.split('/').pop();
            if (fileName) {
              await bucket.delete(fileName);
            }
          }
        }
        await dbHelpers.purgeOrphans(db);
        return { success: true, message: 'All orphan records purged successfully.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to purge orphan records.' };
      }
    }
  }),

  triggerPublish: defineAction({
    accept: 'json',
    input: z.object({}),
    handler: async (input, context) => {
      const hookUrl = context.locals.runtime?.env?.CLOUDFLARE_DEPLOY_HOOK_URL;
      if (!hookUrl) {
        return { success: false, error: 'Cloudflare Deploy Hook URL not configured. Please define CLOUDFLARE_DEPLOY_HOOK_URL in wrangler.jsonc or your dashboard.' };
      }
      try {
        const res = await fetch(hookUrl, { method: 'POST' });
        if (!res.ok) {
          throw new Error(`Cloudflare API returned status: ${res.status}`);
        }
        return { success: true, message: 'Rebuild triggered successfully!' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to trigger rebuild.' };
      }
    }
  })
};

