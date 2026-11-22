import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { exploreCategories } from '../constants';
import type { ExploreCategorySlug } from '../types';

type HashtagIdRow = { id: number };

export class CategoryService {
  private readonly categoryIds = new Map<string, number | null>();

  listCategories() {
    return exploreCategories;
  }

  async getHashtagId(
    category: ExploreCategorySlug,
    signal: AbortSignal,
  ): Promise<number | null> {
    if (category === 'all') {
      return null;
    }

    if (this.categoryIds.has(category)) {
      return this.categoryIds.get(category) ?? null;
    }

    const { data, error } = await createSupabaseBrowserClient()
      .from('hashtags')
      .select('id')
      .eq('slug', category)
      .abortSignal(signal)
      .maybeSingle()
      .returns<HashtagIdRow | null>();

    if (error) {
      throw error;
    }

    this.categoryIds.set(category, data?.id ?? null);
    return data?.id ?? null;
  }

  clearCache(): void {
    this.categoryIds.clear();
  }
}

export const categoryService = new CategoryService();
