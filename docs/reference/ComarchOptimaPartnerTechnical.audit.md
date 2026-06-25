# Comarch Optima Partner Technical Audit

Date:
- 2026-05-24

Scope:
- audited authenticated partner portal content reachable from `https://partner.erp.comarch.pl/`
- focused only on `Comarch ERP Optima` partner materials relevant to technical KB design
- did not download bulk assets yet

Authentication note:
- the portal session used for this audit was authenticated
- do not store session cookies or credentials in repo files

## Key finding

The Optima partner technical area behaves more like a categorized asset repository than a classic article-only documentation site.

Practical consequence:
- the future KB should treat downloadable files as first-class source objects
- article pages are secondary metadata carriers
- categories and version bands matter as much as document text

## Confirmed platform shape

The site exposes a WordPress REST API:
- `/wp-json/`
- `/wp-json/wp/v2/categories`
- `/wp-json/wp/v2/media`
- `/wp-json/wp/v2/posts`
- `/wp-json/wp/v2/pages`
- `/wp-json/wp/v2/search`

Confirmed content types:
- `post`
- `page`
- `attachment`

Important technical observation:
- the most valuable Optima partner technical sections are heavily populated in `attachment` / `media`
- `posts` are present, but many of them are release/news wrappers or routing pages

## Root Optima category

Root category:
- id `3`
- name `Comarch ERP Optima`
- slug `comarch-erp-optima`

Selected direct child categories under Optima:

| id | name | slug | count |
|---|---|---|---:|
| 328 | Aktualna dokumentacja techniczna działa z Comarch ERP Optima | `aktualna-dokumentacja-techniczna-dziala-z-comarch-erp-optima` | 93 |
| 329 | Archiwalna dokumentacja techniczna działa z Comarch ERP Optima | `archiwalna-dokumentacja-techniczna-dziala-z-comarch-erp-optima` | 103 |
| 314 | Funkcje dodatkowe | `funkcje-dodatkowe` | 84 |
| 313 | Migrator | `migrator` | 128 |
| 312 | Struktura baz danych | `struktura-baz-danych` | 10 |
| 309 | Struktura plików XML | `struktura-plikow-xml` | 35 |
| 311 | Makra księgowe | `makra-ksiegowe` | 19 |
| 315 | Pliki pomocnicze | `pliki-pomocnicze` | 14 |
| 310 | Sterowniki | `sterowniki` | 8 |
| 71 | Biuletyny | `biuletyny` | 20 |
| 70 | Podręczniki i Instrukcje | `podreczniki-i-instrukcje` | 6 |
| 67 | Wizje nowych wersji | `wizje-nowych-wersji-comarch-erp-optima` | 22 |

These counts come from the category API and should be treated as portal-state values as of 2026-05-24.

## Confirmed nested category splits

Under `Dokumentacja techniczna`:
- `238` `Aktualna dokumentacja techniczna`
- `239` `Archiwalna dokumentacja techniczna`

Under `Struktura baz danych`:
- `330` `Aktualna struktura bazy danych` -> `50`
- `331` `Archiwalna struktura bazy danych` -> `154`

This means version state is a first-class navigation concept in the portal:
- current
- archived

The KB should model this explicitly instead of flattening everything into one document list.

## Media-first technical sections

For the most technical Optima categories, `wp/v2/media` returns strong, directly usable results.

Confirmed media counts by category on 2026-05-24:

| category id | category | media count |
|---|---|---:|
| 312 | Struktura baz danych | 10 |
| 314 | Funkcje dodatkowe | 84 |
| 315 | Pliki pomocnicze | 14 |
| 311 | Makra księgowe | 19 |
| 310 | Sterowniki | 8 |
| 309 | Struktura plików XML | 35 |
| 328 | Aktualna dokumentacja techniczna działa z Comarch ERP Optima | 93 |
| 329 | Archiwalna dokumentacja techniczna działa z Comarch ERP Optima | 103 |

This is the strongest signal from the audit:
- a partner technical KB should ingest partner files primarily from `media`
- article pages should be treated as metadata, grouping, or routing

## Sample technical assets

### Struktura baz danych

Examples:
- `Struktura_Bazy_2025.5.1-1.zip`
- `Struktura_Bazy_2025.3.1.zip`
- `Zmiany w strukturze baz danych i obiektów COM programu Comarch ERP Optima w wersji 2026.4.1 i 2026.3.1.pdf`

Observed asset types:
- `zip`
- `pdf`

### Funkcje dodatkowe

Examples:
- `Narzedzia-serwisowe-do-wersji-2026.4.1.zip`
- `Narzedzia-serwisowe-do-wersji-2026.3.1.zip`
- `Narzedzia-serwisowe-do-wersji-2026.2.1.zip`

Observed asset types:
- `zip`

### Pliki pomocnicze

Examples:
- `Crystal-Reports-dla-Comarch-ERP-Optima-201x-podglad.zip`
- `Crystal-Reports-dla-Comarch-ERP-Optima-201x-silnik.zip`
- `WeryfikacjaWymagan.zip`

Observed asset types:
- `zip`

### Makra księgowe

Examples:
- `Opis_makr_w_schematach_ksiegowych_v_2022.0.1.zip`
- `Opis_makr_w_schematach_ksiegowych_v_2018.6.1.zip`

Observed asset types:
- `zip`

### Sterowniki

Examples:
- `ComarchERPMenadzerKluczy2025012033.zip`
- `SQL-DMO-dla-Comarch-OPTMA.zip`

Observed asset types:
- `zip`

### Struktura plików XML

Examples:
- `OPT021-Struktura-plikow-XML-do-pracy-rozproszonej-v.2025.2.1.pdf`
- `OPT021-Struktura-plikow-XML-do-pracy-rozproszonej-v.2025.pdf`

Observed asset types:
- `pdf`

## Article-layer observations

`posts` do exist, but they are not the whole technical corpus.

Examples of Optima post content seen through REST:
- release posts such as `Nowa wersja Comarch ERP Optima 2026.4.1`
- those posts link out to:
  - `pomoc.comarch.pl`
  - `spolecznosc.comarch.pl`

Implication:
- some partner posts are only announcement/routing wrappers
- these should not dominate the future KB
- the technical KB should prioritize partner-hosted assets and technical attachment metadata

## Recommended KB direction

Create a dedicated KB:
- `ComarchOptimaPartnerTechnical`

Recommended scope:
- technical documentation
- current and archived database structure packs
- XML structure manuals
- helper files
- drivers
- accounting macros
- additional-function / service-tool packages
- technical bulletins where relevant

Keep out of this KB:
- sales offers
- pricing
- promotions
- formal statements
- warranty/commercial documents

Those should become a separate partner-commercial KB if needed later.

## Recommended schema direction

The schema should be asset-first.

Minimum useful entity set:
- `PartnerCategory`
- `PartnerAsset`
- `PartnerArticle`
- `TechnicalSeries`
- `VersionBand`
- `DownloadArtifact`
- `AssetType`
- `ProductArea`
- `KnowledgeRoute`
- `Chunk`

Strong candidate properties:
- category id / slug / parent
- title
- portal URL
- direct download URL
- mime type
- file extension
- version hint
- current vs archived
- product area
- language
- source family
- summary / preview

Important cross-KB links:
- `PartnerAsset` -> `ComarchOptimaSchema`
- `PartnerAsset` -> `ComarchOptimaAdditionalFunctions`
- `PartnerAsset` -> `ComarchOptimaSprint`

Not as native graph relations if the build still refuses to materialize custom relations; use explicit `...RefId` properties if needed.

## Recommended ingestion strategy

Do not start with full-site scraping.

Preferred sequence:
1. catalog categories and media metadata through WordPress REST
2. download only the technical Optima asset families
3. classify by:
   - area
   - version
   - current/archived
   - file type
4. extract text where possible:
   - PDF text best-effort
   - ZIP inventory first
   - unpack known text-bearing archives selectively
5. build KB from local staged corpus

## Immediate next step

If this KB is approved, the next implementation step should be:
- create local source directory for partner technical materials
- write a metadata-first exporter using `wp/v2/categories` and `wp/v2/media`
- delay bulk asset download until the exporter and scope filters are fixed

This is safer than downloading the whole partner corpus blindly.
