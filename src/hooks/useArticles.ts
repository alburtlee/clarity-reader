import { useEffect, useMemo, useState } from 'react';
import type { ArticleDataset } from '../lib/types';

const EMPTY_DATASET: ArticleDataset = {
  fetchedAt: '',
  todayPickIds: [],
  sourceCount: 0,
  articleCount: 0,
  articles: [],
};

export function useArticles(): {
  data: ArticleDataset;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<ArticleDataset>(EMPTY_DATASET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      try {
        setLoading(true);
        const response = await fetch('/data/articles.json', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load dataset: ${response.status}`);
        }
        const json = (await response.json()) as ArticleDataset;
        if (active) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}
