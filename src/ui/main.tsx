import { render } from "preact";
import Router from "preact-router";
import { ArticlesList } from "./pages/ArticlesList";
import { ArticleDetail } from "./pages/ArticleDetail";
import { useEffect, useState } from "preact/hooks";
import type { ArticleWithContent } from "..";

function App() {
  const [articles, setArticles] = useState<ArticleWithContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data.json")
      .then((res) => res.json())
      .then((data) => {
        setArticles(data);
        setLoading(false);
      });
  }, []);

  if (loading) return (<p>Loading...hellppp</p>)
  return (
      <Router>
        <ArticlesList articles={articles} path="/" />
        <ArticleDetail articles={articles} path="/article/:index" />
      </Router>
  );
}

render(<App />, document.getElementById("app")!);
