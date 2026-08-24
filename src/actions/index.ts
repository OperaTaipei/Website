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
  })
};
