import type { ArticleWithContent } from "../../index";

interface Props {
  path: string;
  articles: ArticleWithContent[]
}

export function ArticlesList({articles}: Props) {
  return (
    <div class="container">
    <header>
      <h1><a href="/">NYT Reader</a></h1>
    </header>

    <div class="articles-list">
      {articles.map((article, index) => (
        <article class="article-card" key={article.uri}>
          <h2>
            <a href={`/article/${index}`}>{article.title}</a>
          </h2>
          <p class="byline">{article.byline}</p>
          <p class="abstract">{article.abstract}</p>
        </article>
      ))}
    </div>
    </div>
  );
}
