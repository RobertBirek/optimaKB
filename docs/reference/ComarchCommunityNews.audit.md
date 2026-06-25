# Comarch Community News Audit

Date: `2026-06-02`

## Scope

Audit of `https://spolecznosc.comarch.pl/news` as a potential source for a
separate knowledge base or a supporting corpus.

## Findings

- `POTWIERDZONE`: The public site is a JavaScript SPA shell. The direct HTML for
  `/news` only exposes a loader and app bundle references, not article content.
- `POTWIERDZONE`: The domain already serves public `question` pages and public
  uploaded PDFs/attachments under `cdn.spolecznosc.comarch.pl`.
- `POTWIERDZONE`: The front-end bundle contains forum/news UI logic and a
  `Post` entity model with `Post.Type.News`, so news content is part of the
  product surface rather than an unrelated external blog.
- `POTWIERDZONE`: The SPA news list is fetched through the backend posts API,
  not through a separate `/news` data endpoint. The bundled service
  `newsRequestService.getNewsRequest()` calls `GET ${apiUrl}/posts` and the
  news list is filtered with `filter[type]={"eq":4}` plus date/status/pinned
  filters. This is the concrete listing API for news.
- `POTWIERDZONE`: The runtime config file
  `https://spolecznosc.comarch.pl/assets/config/prod.parameters.json` is public
  and exposes `apiUrl=https://api.spolecznosc.comarch.pl`.
- `POTWIERDZONE`: Full public article content is available through
  `GET https://api.spolecznosc.comarch.pl/posts/{id}`. The payload includes
  `title`, `intro`, HTML `content`, publication timestamps, and attachments.
- `WYMAGA WERYFIKACJI`: A simple public sitemap or RSS/feed endpoint for `/news`
  was not confirmed from the first pass. The listing API is now known, but a
  dedicated feed still is not.

## Recommendation

- This source is suitable as a separate KB or a support corpus, not as part of
  the official product documentation KBs.
- Keep it read-only and public-content-only.
- Prefer indexing:
  - news/article pages
  - public attachments linked from those pages
  - public metadata such as title, date, product tag, and URL
- Avoid mixing it with the official docs KBs, because the content is a blend of
  announcements, community posts, and attachments.

## Operational Decision

- Recommended KB name: `ComarchCommunityNews`
- Recommended role: `supporting public news/community corpus`
- Recommended consumers:
  - routing support for Optima / Betterfly / KSeF questions
  - question-answer enrichment when the answer depends on public announcements

## Next Verification Step

Confirm one of the following before building:

- a public news sitemap/feed
- or a browser-driven extraction path that reliably returns article URLs

The public API path is now known and can be used as the primary source:

- `GET /posts?filter[type]={"eq":4}&filter[status]={"eq":1}&sort[datePublished]=DESC`
- pinned main item: same endpoint with `filter[pinned]={"eq":1}&limit=1`
- full article: `GET /posts/{id}`
