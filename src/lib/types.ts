export type Article = {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  articleUrl: string;
  thumbnailUrl: string | null;
  author: string;
  category: string;
  publishedAt: string;
  readingMinutes: number;
  score: number;
  whyItMatters: string;
  excerpt: string;
  tags: string[];
  isNew: boolean;
};

export type ArticleDataset = {
  fetchedAt: string;
  todayPickIds: string[];
  sourceCount: number;
  articleCount: number;
  articles: Article[];
};
