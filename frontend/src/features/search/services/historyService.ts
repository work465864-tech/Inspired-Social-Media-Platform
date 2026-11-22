import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { Tables } from '../../../types/database.types';
import { searchHistoryLimit } from '../constants';
import type { RecentSearch } from '../types';
import {
  normalizeSearchError,
  normalizeSearchQuery,
  SearchError,
} from './searchUtils';

type HistoryRow = Pick<
  Tables<'search_history'>,
  'id' | 'query' | 'searched_at'
>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toRecentSearch(row: HistoryRow): RecentSearch {
  return {
    id: row.id,
    query: row.query,
    searchedAt: row.searched_at,
  };
}

function requireUser(userId: string): void {
  if (!uuidPattern.test(userId)) {
    throw new SearchError('unauthorized', 'Sign in to access search history.');
  }
}

export class HistoryService {
  async getRecent(
    userId: string,
    signal: AbortSignal,
  ): Promise<RecentSearch[]> {
    requireUser(userId);
    try {
      const { data, error } = await createSupabaseBrowserClient()
        .from('search_history')
        .select('id,query,searched_at')
        .eq('user_id', userId)
        .order('searched_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(searchHistoryLimit * 3)
        .abortSignal(signal)
        .returns<HistoryRow[]>();
      if (error) {
        throw error;
      }

      const seen = new Set<string>();
      const uniqueRows = (data ?? []).filter((row) => {
        const key = normalizeSearchQuery(row.query).toLocaleLowerCase();
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      return uniqueRows.slice(0, searchHistoryLimit).map(toRecentSearch);
    } catch (error) {
      throw normalizeSearchError(error);
    }
  }

  async record(userId: string, value: string): Promise<RecentSearch> {
    requireUser(userId);
    const query = normalizeSearchQuery(value);
    if (query.length < 1 || query.length > 200) {
      throw new SearchError('validation', 'The search term is invalid.');
    }

    try {
      const { data, error } = await createSupabaseBrowserClient()
        .from('search_history')
        .insert({ user_id: userId, query })
        .select('id,query,searched_at')
        .single()
        .returns<HistoryRow>();
      if (error) {
        throw error;
      }
      return toRecentSearch(data);
    } catch (error) {
      throw normalizeSearchError(error);
    }
  }

  async clear(userId: string): Promise<void> {
    requireUser(userId);
    try {
      const { error } = await createSupabaseBrowserClient()
        .from('search_history')
        .delete()
        .eq('user_id', userId);
      if (error) {
        throw error;
      }
    } catch (error) {
      throw normalizeSearchError(error);
    }
  }
}

export const historyService = new HistoryService();
