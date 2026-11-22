import type { InfiniteData } from '@tanstack/react-query';
import type { Comment, CommentPage } from '../types';

export type CommentPages = InfiniteData<CommentPage, number>;

export function prependCachedComment(
  current: CommentPages | undefined,
  comment: Comment,
  fallbackCount = 0,
): CommentPages {
  if (!current) {
    return {
      pages: [
        {
          items: [comment],
          totalCount: fallbackCount + 1,
          nextOffset: null,
        },
      ],
      pageParams: [0],
    };
  }

  const firstPage = current.pages[0];
  if (!firstPage || firstPage.items.some((item) => item.id === comment.id)) {
    return current;
  }

  return {
    ...current,
    pages: [
      {
        ...firstPage,
        items: [comment, ...firstPage.items],
        totalCount: firstPage.totalCount + 1,
      },
      ...current.pages.slice(1),
    ],
  };
}

export function replaceCachedComment(
  current: CommentPages | undefined,
  comment: Comment,
  previousId = comment.id,
): CommentPages | undefined {
  if (!current) {
    return current;
  }

  const alreadyCached = current.pages.some((page) =>
    page.items.some((item) => item.id === comment.id && item.id !== previousId),
  );

  return {
    ...current,
    pages: current.pages.map((page) => {
      const items = page.items.flatMap((item) => {
        if (item.id === previousId) {
          return alreadyCached ? [] : [comment];
        }
        return [item];
      });
      return { ...page, items };
    }),
  };
}

export function removeCachedComment(
  current: CommentPages | undefined,
  commentId: string,
): CommentPages | undefined {
  if (!current) {
    return current;
  }

  let removed = false;
  const pages = current.pages.map((page) => {
    const items = page.items.filter((item) => {
      if (item.id === commentId) {
        removed = true;
        return false;
      }
      return true;
    });
    return {
      ...page,
      items,
    };
  });

  if (!removed || pages.length === 0) {
    return current;
  }

  pages[0] = {
    ...pages[0],
    totalCount: Math.max(0, pages[0].totalCount - 1),
  };
  return { ...current, pages };
}
