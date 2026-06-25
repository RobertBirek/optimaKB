# Comarch Community News KB Seed

## Scope

This KB is a public, read-only community-news layer for Comarch ERP topics.

It is not an official product-documentation KB and it must not be mixed into
the official documentation KBs as if both corpora had the same authority.

## Primary references

- public news landing page:
  `https://spolecznosc.comarch.pl/news`
- public posts API used by the SPA:
  `https://spolecznosc.comarch.pl/api/posts`

## Local snapshot

Recommended local snapshot root:

- `downloads/community_news/api/`
- `downloads/community_news/pages/`
- `downloads/community_news/meta/`

Expected local source artifacts:

- `api/posts_index.json`
- per-post HTML pages under `pages/`
- `meta/source_registry.json`

## Seed entity plan

- `ReferenceDocument`
  - public news articles and promoted local notes
- `NewsTopic`
  - normalized category/tag/topic layer from public news metadata
- `CommunityAttachment`
  - public attachments linked from news posts
- `KnowledgeRoute`
  - route layer from community news toward official KBs
- `EntryGuide`
  - curated first-stop entry points for update-driven questions
- `Chunk`
  - retrieval chunks from article intro/body text

## Design decisions

1. Treat this KB as a supporting public corpus, not as an authoritative
   product-manual layer.
2. Prefer public news posts and their public attachments over comments or
   forum-style conversational content.
3. Keep the schema light: documents, topics, attachments, routes, chunks.
4. Use this KB mainly for:
   - release awareness
   - public announcements
   - update-driven routing into official KBs
5. Keep URL provenance explicit for duplicate checks and source attribution.

## Extension policy

Extend this KB by:

- refreshing the public `/api/posts` news index
- downloading newly discovered public article pages
- indexing public attachments linked from those pages
- adding promoted local notes only when they summarize or contextualize public
  news without replacing the source

Do not use this KB for private partner materials or live customer data.
