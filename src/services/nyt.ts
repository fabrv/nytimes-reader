import { GlobalWindow } from "happy-dom";
import { ResultAsync, err, ok } from "neverthrow";

export type FetchError =
  | { type: "missing_env"; variable: string }
  | { type: "http_error"; status: number; statusText: string }
  | { type: "parse_error"; message: string };

export type Section =
  | "arts" | "automobiles" | "books/review" | "business" | "fashion"
  | "food" | "health" | "home" | "insider" | "magazine" | "movies"
  | "nyregion" | "obituaries" | "opinion" | "politics" | "realestate"
  | "science" | "sports" | "sundayreview" | "technology" | "theater"
  | "t-magazine" | "travel" | "upshot" | "us" | "world";

export interface Multimedia {
  url: string;
  format: string;
  height: number;
  width: number;
  type: string;
  subtype: string;
  caption: string;
  copyright: string;
}

export interface Article {
  section: string;
  subsection: string;
  title: string;
  abstract: string;
  url: string;
  uri: string;
  byline: string;
  item_type: string;
  updated_date: string;
  created_date: string;
  published_date: string;
  material_type_facet: string;
  kicker: string;
  des_facet: string[];
  org_facet: string[];
  per_facet: string[];
  geo_facet: string[];
  multimedia: Multimedia[];
  short_url: string;
}

export interface TopStoriesResponse {
  status: string;
  copyright: string;
  section: string;
  last_updated: string;
  num_results: number;
  results: Article[];
}

export function fetchTopStories(section: Section = "home"): ResultAsync<TopStoriesResponse, FetchError> {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) {
    return ResultAsync.fromPromise(
      Promise.reject(),
      () => ({ type: "missing_env", variable: "NYT_API_KEY" }) as FetchError
    );
  }

  const url = `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${apiKey}`;

  return ResultAsync.fromPromise(fetch(url), () => ({ type: "http_error", status: 0, statusText: "Network error" }) as FetchError)
    .andThen((response) => {
      if (!response.ok) {
        return err({ type: "http_error", status: response.status, statusText: response.statusText } as FetchError);
      }
      return ok(response);
    })
    .andThen((response) =>
      ResultAsync.fromPromise(
        response.json() as Promise<TopStoriesResponse>,
        () => ({ type: "parse_error", message: "Failed to parse JSON" }) as FetchError
      )
    );
}

export function fetchArticle(uri: string): ResultAsync<string | null, FetchError> {
  const cookies = process.env.NYT_COOKIES;
  if (!cookies) {
    return ResultAsync.fromPromise(
      Promise.reject(),
      () => ({ type: "missing_env", variable: "NYT_COOKIES" }) as FetchError
    );
  }

  return ResultAsync.fromPromise(
    fetch(uri, {
      headers: {
        "Cookie": cookies,
        "Accept-Language": "en",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:148.0) Gecko/20100101 Firefox/148.0",
      },
    }),
    () => ({ type: "http_error", status: 0, statusText: "Network error" }) as FetchError
  )
    .andThen((response) => {
      if (!response.ok) {
        return err({ type: "http_error", status: response.status, statusText: response.statusText } as FetchError);
      }
      return ok(response);
    })
    .andThen((response) =>
      ResultAsync.fromPromise(
        response.text(),
        () => ({ type: "parse_error", message: "Failed to read response body" }) as FetchError
      )
    )
    .map((html) => {
      const window = new GlobalWindow();
      const parser = new window.DOMParser();
      const document = parser.parseFromString(html, "text/html");

      const articleBody = document.querySelector('article#story section[name="articleBody"]');
      if (!articleBody) return null;

      const validPattern = /^(companionColumn|ImageBlock)-\d+$/;
      const children = Array.from(articleBody.children);

      for (const child of children) {
        const testId = child.getAttribute("data-testid");
        if (!testId || !validPattern.test(testId)) {
          child.remove();
        }
      }

      return articleBody.innerHTML;
    });
}
