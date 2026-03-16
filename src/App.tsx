import { useMemo, useState } from 'react';
import { useArticles } from './hooks/useArticles';
import { useBookmarks } from './hooks/useBookmarks';
import type { Article } from './lib/types';

type ViewMode = 'all' | 'today' | 'saved';

type CuratedLink = {
  title: string;
  source: string;
  url: string;
  note: string;
};

const classicLongReads: CuratedLink[] = [
  {
    title: 'What You Can’t Say',
    source: 'Paul Graham',
    url: 'https://paulgraham.com/say.html',
    note: '생각과 문장을 동시에 날카롭게 만드는 고전.',
  },
  {
    title: 'The Bitter Lesson',
    source: 'Rich Sutton',
    url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
    note: 'AI 발전의 장기 패턴을 이해하는 데 여전히 유효하다.',
  },
  {
    title: 'The Bus Ticket Theory of Genius',
    source: 'Paul Graham',
    url: 'https://paulgraham.com/genius.html',
    note: '비범함이 어디서 오는지에 대한 아름다운 에세이.',
  },
  {
    title: 'Seeing Like a State',
    source: 'James C. Scott',
    url: 'https://yalebooks.yale.edu/book/9780300078152/seeing-like-a-state/',
    note: '시스템과 단순화의 폭력성을 읽는 데 좋은 장기 참조점.',
  },
  {
    title: 'You and Your Research',
    source: 'Richard Hamming',
    url: 'https://www.cs.virginia.edu/~robins/YouAndYourResearch.html',
    note: '깊이 있는 일과 중요한 문제를 고르는 감각을 다룬다.',
  },
  {
    title: 'The Extended Mind',
    source: 'Andy Clark & David Chalmers',
    url: 'https://consc.net/papers/extended.html',
    note: '생각이 뇌 바깥으로 확장된다는 관점을 제공한다.',
  },
];

const aiReferenceShelf: CuratedLink[] = [
  {
    title: 'Claude Code usage and agentic workflows',
    source: 'GeekNews / practitioner posts',
    url: 'https://news.hada.io/topic?id=27560',
    note: '실무에서 에이전트 코딩을 다루는 감각을 준다.',
  },
  {
    title: 'Import AI',
    source: 'Jack Clark',
    url: 'https://jack-clark.net/feed/',
    note: '연구 흐름과 산업 맥락을 동시에 읽는 데 좋다.',
  },
  {
    title: 'One Useful Thing',
    source: 'Ethan Mollick',
    url: 'https://www.oneusefulthing.org/',
    note: '현실 업무에 AI를 어떻게 넣을지 가장 실용적으로 다룬다.',
  },
  {
    title: 'Stratechery',
    source: 'Ben Thompson',
    url: 'https://stratechery.com/',
    note: '툴이 아니라 시장 구조와 배치 전략을 읽게 해준다.',
  },
  {
    title: 'Simon Willison weblog',
    source: 'Simon Willison',
    url: 'https://simonwillison.net/',
    note: '실전 LLM 활용과 도구 실험을 집요하게 기록한다.',
  },
  {
    title: 'Benedict Evans essays',
    source: 'Benedict Evans',
    url: 'https://www.ben-evans.com/benedictevans',
    note: 'AI를 비즈니스와 전략의 언어로 번역해 준다.',
  },
  {
    title: 'Andrej Karpathy public writing',
    source: 'Karpathy',
    url: 'https://karpathy.ai/',
    note: '기술의 본질을 단순하고 깊게 설명하는 드문 레퍼런스.',
  },
  {
    title: 'Tech42 AI coverage',
    source: 'Tech42',
    url: 'https://www.tech42.co.kr/',
    note: '국내 AI 흐름을 한글로 빠르게 따라가기 좋다.',
  },
];

function formatDate(input: string): string {
  const date = new Date(input);
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
}

function relativeTime(input: string): string {
  const diffHours = Math.max(1, Math.floor((Date.now() - new Date(input).getTime()) / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours}h ago`;
  const days = Math.floor(diffHours / 24);
  return `${days}d ago`;
}

function isRecent(article: Article): boolean {
  return Date.now() - new Date(article.publishedAt).getTime() < 1000 * 60 * 60 * 24 * 14;
}

function App() {
  const { data, loading, error } = useArticles();
  const { savedIds, readIds, toggleRead, toggleSaved } = useBookmarks();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('all');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSource, setActiveSource] = useState('All');

  const recentArticles = useMemo(() => data.articles.filter(isRecent), [data.articles]);
  const categories = useMemo(() => ['All', ...new Set(recentArticles.map((article) => article.category))], [recentArticles]);
  const sources = useMemo(() => ['All', ...new Set(recentArticles.map((article) => article.source))], [recentArticles]);
  const todayPicks = useMemo(() => data.articles.filter((article) => data.todayPickIds.includes(article.id)).slice(0, 5), [data.articles, data.todayPickIds]);

  const filteredArticles = useMemo(() => {
    let list = view === 'saved' ? data.articles : recentArticles;

    if (view === 'today') {
      const pickIds = new Set(todayPicks.map((article) => article.id));
      list = list.filter((article) => pickIds.has(article.id));
    }

    if (view === 'saved') {
      const saved = new Set(savedIds);
      list = list.filter((article) => saved.has(article.id));
    }

    if (activeCategory !== 'All') {
      list = list.filter((article) => article.category === activeCategory);
    }
    if (activeSource !== 'All') {
      list = list.filter((article) => article.source === activeSource);
    }

    const normalized = query.trim().toLowerCase();
    if (normalized) {
      list = list.filter((article) => [article.title, article.source, article.author, article.excerpt, article.whyItMatters, ...article.tags].join(' ').toLowerCase().includes(normalized));
    }

    return list;
  }, [activeCategory, activeSource, data.articles, query, recentArticles, savedIds, todayPicks, view]);

  const savedArticles = useMemo(() => {
    const saved = new Set(savedIds);
    return data.articles.filter((article) => saved.has(article.id));
  }, [data.articles, savedIds]);

  if (loading) return <div className="state-shell">Clarity Reader를 불러오는 중...</div>;
  if (error) return <div className="state-shell">데이터를 불러오지 못했다: {error}</div>;

  return (
    <div className="page-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow">CLARITY READER · DAILY CURATION DESK</div>
          <h1>알벗을 위한 daily reading desk</h1>
          <p>
            최근 발행된 시의성 있는 글과 오래 남는 클래식 롱리드를 분리해 보여준다.
            빠른 신호와 느린 해석을 한 화면에서 함께 다루는 개인용 큐레이션 대시보다.
          </p>
          <div className="hero-stats">
            <div><strong>{recentArticles.length}</strong><span>Recent articles</span></div>
            <div><strong>{data.sourceCount}</strong><span>Live sources</span></div>
            <div><strong>{todayPicks.length}</strong><span>Top picks</span></div>
            <div><strong>{savedIds.length}</strong><span>Saved queue</span></div>
          </div>
        </div>
        <aside className="hero-card">
          <div className="card-label">UPDATED DAILY · 08:00 KST</div>
          <h2>{data.fetchedAt ? `${formatDate(data.fetchedAt)} 업데이트` : '오늘의 큐레이션'}</h2>
          <p>
            이 제품의 목적은 많은 글을 보여주는 것이 아니라,
            알벗의 기준으로 오늘 읽을 가치가 있는 글만 남기는 것이다.
          </p>
          <div className="hero-tags">
            <span>Recent signal</span>
            <span>Classic depth</span>
            <span>AI use references</span>
          </div>
        </aside>
      </header>

      <section className="section-block slim-block">
        <div className="section-heading compact">
          <div className="eyebrow">Today&apos;s Picks</div>
          <h2>오늘의 탑픽 5개</h2>
          <p>최근성, 다양성, 해석 가치가 함께 높은 기사만 골랐다.</p>
        </div>
        <div className="pick-grid">
          {todayPicks.map((article, index) => (
            <article key={article.id} className="pick-card">
              {article.thumbnailUrl ? <img className="pick-thumb" src={article.thumbnailUrl} alt="" /> : null}
              <div className="pick-rank">0{index + 1}</div>
              <div className="pick-meta">{article.source} · {article.readingMinutes} min · {relativeTime(article.publishedAt)}</div>
              <h3>{article.title}</h3>
              <p>{article.whyItMatters}</p>
              <a href={article.articleUrl} target="_blank" rel="noreferrer">원문 열기</a>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block slim-block references-block">
        <div className="section-heading compact">
          <div className="eyebrow">Reference Shelf</div>
          <h2>AI 활용법 레퍼런스</h2>
          <p>Claude Code, 에이전트 코딩, 실전 워크플로를 배우기 좋은 리더와 레퍼런스를 분리해 두었다.</p>
        </div>
        <div className="reference-grid">
          {aiReferenceShelf.map((item) => (
            <a key={item.url} className="reference-card" href={item.url} target="_blank" rel="noreferrer">
              <div className="reference-source">{item.source}</div>
              <h3>{item.title}</h3>
              <p>{item.note}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="section-block control-panel slim-block">
        <div className="section-heading compact">
          <div className="eyebrow">Filter</div>
          <h2>최근 기사 필터</h2>
        </div>
        <div className="toolbar">
          <div className="segmented">
            {([
              ['all', '전체'],
              ['today', '오늘 픽'],
              ['saved', '저장 큐'],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" className={view === key ? 'active' : ''} onClick={() => setView(key)}>
                {label}
              </button>
            ))}
          </div>
          <input aria-label="검색" className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 소스, 태그 검색" />
        </div>
        <div className="filter-row">
          <div className="chip-group">
            {categories.map((category) => (
              <button key={category} type="button" className={activeCategory === category ? 'chip active' : 'chip'} onClick={() => setActiveCategory(category)}>
                {category}
              </button>
            ))}
          </div>
          <div className="chip-group">
            {sources.map((source) => (
              <button key={source} type="button" className={activeSource === source ? 'chip active' : 'chip'} onClick={() => setActiveSource(source)}>
                {source}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="content-layout">
        <main className="feed-column">
          <section className="section-block feed-block">
            <div className="section-heading compact">
              <div className="eyebrow">Recent Feed</div>
              <h2>{filteredArticles.length}개의 최근 아티클</h2>
              <p>메인 피드는 최근 14일 이내 발행 글만 보여준다.</p>
            </div>
            <div className="feed-grid">
              {filteredArticles.map((article) => {
                const isSaved = savedIds.includes(article.id);
                const isRead = readIds.includes(article.id);
                return (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    isRead={isRead}
                    isSaved={isSaved}
                    onToggleRead={toggleRead}
                    onToggleSaved={toggleSaved}
                  />
                );
              })}
            </div>
          </section>

          <section className="section-block slim-block classics-block">
            <div className="section-heading compact">
              <div className="eyebrow">Classic Long Reads</div>
              <h2>오래 남는 클래식 롱리드</h2>
              <p>매일 피드는 최신성을, 이 섹션은 장기적인 해석력을 담당한다.</p>
            </div>
            <div className="classic-grid">
              {classicLongReads.map((item) => (
                <a key={item.url} className="classic-card" href={item.url} target="_blank" rel="noreferrer">
                  <div className="classic-source">{item.source}</div>
                  <h3>{item.title}</h3>
                  <p>{item.note}</p>
                </a>
              ))}
            </div>
          </section>
        </main>

        <aside className="sidebar-column">
          <section className="sidebar-card">
            <div className="eyebrow">Reading Queue</div>
            <h2>저장한 글</h2>
            <ul className="queue-list">
              {savedArticles.length === 0 ? (
                <li className="empty-state">아직 저장한 글이 없다. 오늘의 탑픽부터 담아라.</li>
              ) : (
                savedArticles.map((article) => (
                  <li key={article.id}>
                    <strong>{article.title}</strong>
                    <span>{article.source} · {article.readingMinutes} min</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="sidebar-card">
            <div className="eyebrow">Taste Filter</div>
            <h2>알벗 취향 필터</h2>
            <ul className="taste-list">
              <li>세상이 크게 바뀐다는 감각</li>
              <li>기술 변화의 의미를 해석하는 long read</li>
              <li>실전 AI 활용법과 사고 도구</li>
              <li>정보보다 관점을 남기는 글</li>
            </ul>
          </section>

          <section className="sidebar-card">
            <div className="eyebrow">Source Radar</div>
            <h2>실시간 소스</h2>
            <div className="source-list">
              {sources.filter((source) => source !== 'All').map((source) => (
                <button key={source} type="button" onClick={() => setActiveSource(source)}>
                  {source}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ArticleCard(props: {
  article: Article;
  isSaved: boolean;
  isRead: boolean;
  onToggleSaved: (id: string) => void;
  onToggleRead: (id: string) => void;
}) {
  const { article, isSaved, isRead, onToggleRead, onToggleSaved } = props;
  return (
    <article className={isRead ? 'story-card read' : 'story-card'}>
      {article.thumbnailUrl ? <img className="story-thumb" src={article.thumbnailUrl} alt="" /> : null}
      <div className="story-topline">
        <span>{article.category}</span>
        <span className="score">Clarity Score {article.score}</span>
      </div>
      <h3>{article.title}</h3>
      <div className="story-meta">
        <span>{article.source}</span>
        <span>{article.author}</span>
        <span>{article.readingMinutes} min</span>
        <span>{formatDate(article.publishedAt)}</span>
        {article.isNew ? <span className="story-new">NEW</span> : null}
      </div>
      <p className="story-why">{article.whyItMatters}</p>
      <p className="story-excerpt">{article.excerpt}</p>
      <div className="tag-row">
        {article.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="story-actions">
        <a href={article.articleUrl} target="_blank" rel="noreferrer">원문 보기</a>
        <button type="button" onClick={() => onToggleSaved(article.id)}>{isSaved ? '저장 해제' : '저장'}</button>
        <button type="button" onClick={() => onToggleRead(article.id)}>{isRead ? '읽음 취소' : '읽음 표시'}</button>
      </div>
    </article>
  );
}

export default App;
