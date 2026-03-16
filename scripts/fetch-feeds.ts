import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import Parser from 'rss-parser';
import type { Article, ArticleDataset } from '../src/lib/types';

type FeedSource = {
  name: string;
  url: string;
  category: string;
  weight: number;
};

type ParserItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  contentSnippet?: string;
  content?: string;
  categories?: string[];
};

const SOURCES: FeedSource[] = [
  { name: 'GeekNews', url: 'https://news.hada.io/rss/news', category: 'AI + Tech', weight: 7 },
  { name: 'Aeon', url: 'https://aeon.co/feed.rss', category: 'Philosophy', weight: 8 },
  { name: 'Noema', url: 'https://www.noemamag.com/feed/', category: 'Philosophy', weight: 9 },
  { name: 'One Useful Thing', url: 'https://www.oneusefulthing.org/feed', category: 'AI + Work', weight: 10 },
  { name: 'After Babel', url: 'https://www.afterbabel.com/feed', category: 'Society', weight: 8 },
  { name: 'Stratechery', url: 'https://stratechery.com/feed/', category: 'Business Strategy', weight: 9 },
  { name: 'Import AI', url: 'https://jack-clark.net/feed/', category: 'AI + Research', weight: 9 },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'AI + Society', weight: 8 },
  { name: 'Tech42', url: 'https://www.tech42.co.kr/feed/', category: 'AI + Korea', weight: 8 },
];

const KEYWORDS: Record<string, number> = {
  ai: 6,
  intelligence: 5,
  model: 3,
  future: 4,
  society: 4,
  philosophy: 4,
  power: 4,
  alignment: 5,
  essay: 2,
  research: 3,
  work: 3,
  cognition: 5,
  technology: 3,
  startup: 2,
  education: 2,
  culture: 3,
  claude: 4,
  openai: 4,
  llm: 5,
  agent: 5,
  token: 3,
  korea: 3,
  한국: 3,
  ai시대: 4,
  한국어: 2,
  에이전트: 4,
  인공지능: 4,
};

const CATEGORY_RULES: Array<[string, string]> = [
  ['alignment', 'AI + Alignment'],
  ['geopolitic', 'AI + Geopolitics'],
  ['society', 'AI + Society'],
  ['philosophy', 'Philosophy'],
  ['essay', 'Deep Essay'],
  ['work', 'AI + Work'],
  ['startup', 'Business Strategy'],
  ['product', 'Business Strategy'],
  ['research', 'Research'],
];

const parser = new Parser<Record<string, never>, ParserItem>({
  customFields: {
    item: ['content:encoded'],
  },
});

const outputPath = resolve(process.cwd(), 'public/data/articles.json');

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImage(input: string): string | null {
  const match = input.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function toIso(dateValue?: string): string {
  if (!dateValue) return new Date().toISOString();
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function hoursSince(dateIso: string): number {
  return (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60);
}

function scoreArticle(source: FeedSource, title: string, text: string, publishedAt: string): number {
  const haystack = `${title} ${text}`.toLowerCase();
  let score = source.weight * 10;
  for (const [keyword, weight] of Object.entries(KEYWORDS)) {
    if (haystack.includes(keyword)) score += weight;
  }
  const recencyHours = hoursSince(publishedAt);
  if (recencyHours < 24) score += 8;
  else if (recencyHours < 72) score += 4;
  if (recencyHours < 168) score += 2;
  return score;
}

function classify(source: FeedSource, title: string, text: string): string {
  const haystack = `${source.category} ${title} ${text}`.toLowerCase();
  for (const [keyword, category] of CATEGORY_RULES) {
    if (haystack.includes(keyword)) return category;
  }
  return source.category;
}

function estimateReadingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const estimate = Math.ceil(words / 180);
  return Math.max(4, Math.min(22, estimate));
}

function buildWhyItMatters(source: FeedSource, title: string, category: string): string {
  if (source.name === 'One Useful Thing') return 'AI를 실제 업무 판단으로 연결해주는 현실 감각이 있다.';
  if (source.name === 'Noema') return '기술 변화의 의미를 문명·인간 관점에서 깊게 해석한다.';
  if (source.name === 'Aeon') return '빠른 정보가 아니라 긴 호흡의 사유를 회복시켜 준다.';
  if (source.name === 'GeekNews') return '한국어 커뮤니티 관점에서 지금의 흐름을 빠르게 잡게 해준다.';
  if (source.name === 'Tech42') return '한국어 기반으로 AI 산업과 정책 흐름을 빠르게 정리해준다.';
  if (source.name === 'Import AI') return 'AI 연구의 실전 감도와 산업 변화의 속도를 동시에 잡게 해준다.';
  if (source.name === 'MIT Technology Review') return '시의성과 사회적 함의를 함께 읽게 해주는 좋은 균형점이다.';
  if (title.toLowerCase().includes('ai')) return 'AI 변화가 사회와 일에 어떤 파장을 만드는지 읽게 해준다.';
  if (category.includes('Philosophy')) return '변화의 속도보다 변화의 의미를 더 오래 붙잡게 해준다.';
  return '정보보다 해석, 속보보다 관점을 남기는 글에 가깝다.';
}

function articleId(url: string): string {
  return Buffer.from(url).toString('base64').replace(/=+$/g, '');
}

async function readExisting(): Promise<ArticleDataset> {
  if (!existsSync(outputPath)) {
    return { fetchedAt: '', todayPickIds: [], sourceCount: 0, articleCount: 0, articles: [] };
  }
  const raw = await readFile(outputPath, 'utf8');
  return JSON.parse(raw) as ArticleDataset;
}

async function fetchSource(source: FeedSource): Promise<Article[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items ?? [])
      .slice(0, 15)
      .filter((item) => item.title && item.link)
      .map((item) => {
        const title = stripHtml(item.title ?? 'Untitled');
        const rawContent = item.content ?? item.contentSnippet ?? '';
        const excerpt = stripHtml(item.contentSnippet ?? item.content ?? '').slice(0, 240);
        const thumbnailUrl = extractImage(rawContent) ?? extractImage(item.contentSnippet ?? '') ?? null;
        const publishedAt = toIso(item.isoDate ?? item.pubDate);
        const category = classify(source, title, excerpt);
        const readingMinutes = estimateReadingMinutes(excerpt || title);
        const score = scoreArticle(source, title, `${excerpt} ${item.categories?.join(' ') ?? ''}`, publishedAt);
        const tags = [source.name.toLowerCase().replace(/\s+/g, '-'), ...((item.categories ?? []).slice(0, 3).map((tag) => tag.toLowerCase()))];

        if (tags.includes('sponsored') || title.toLowerCase().includes('sponsored')) {
          return null;
        }

        return {
          id: articleId(item.link ?? title),
          title,
          source: source.name,
          sourceUrl: source.url,
          articleUrl: item.link ?? source.url,
          thumbnailUrl,
          author: item.creator ?? source.name,
          category,
          publishedAt,
          readingMinutes,
          score,
          whyItMatters: buildWhyItMatters(source, title, category),
          excerpt: excerpt || '피드 제공 요약이 없어 원문에서 직접 확인이 필요하다.',
          tags,
          isNew: hoursSince(publishedAt) < 48,
        } satisfies Article;
      })
      .filter((item): item is Article => item !== null);
  } catch (error) {
    console.warn(`Failed to fetch ${source.name}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

function pickToday(articles: Article[]): string[] {
  const recent = [...articles]
    .filter((article) => hoursSince(article.publishedAt) < 168)
    .sort((a, b) => {
      const recencyBoostA = Math.max(0, 168 - hoursSince(a.publishedAt));
      const recencyBoostB = Math.max(0, 168 - hoursSince(b.publishedAt));
      return (b.score + recencyBoostB * 0.6) - (a.score + recencyBoostA * 0.6);
    });

  const sourceCounts = new Map<string, number>();
  const picks: Article[] = [];
  for (const article of recent) {
    const current = sourceCounts.get(article.source) ?? 0;
    if (current >= 1) continue;
    picks.push(article);
    sourceCounts.set(article.source, current + 1);
    if (picks.length === 5) break;
  }

  if (picks.length < 5) {
    for (const article of articles) {
      if (picks.find((item) => item.id === article.id)) continue;
      picks.push(article);
      if (picks.length === 5) break;
    }
  }

  return picks.map((article) => article.id);
}

async function main(): Promise<void> {
  const previous = await readExisting();
  const merged = new Map(previous.articles.map((article) => [article.id, article]));
  const fetched = await Promise.all(SOURCES.map((source) => fetchSource(source)));
  const successfulSources = fetched.filter((items) => items.length > 0).length;
  for (const article of fetched.flat()) {
    merged.set(article.id, article);
  }
  const articles = [...merged.values()]
    .sort((a, b) => {
      const scoreGap = b.score - a.score;
      if (scoreGap !== 0) return scoreGap;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .slice(0, 300);
  const todayPickIds = pickToday(articles);

  const dataset: ArticleDataset = {
    fetchedAt: new Date().toISOString(),
    todayPickIds,
    sourceCount: successfulSources,
    articleCount: articles.length,
    articles,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(dataset, null, 2), 'utf8');
  console.log(`Fetched ${articles.length} articles from ${successfulSources} successful sources.`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
