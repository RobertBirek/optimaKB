# Encja: Rozchód Wewnętrzny (RW)
- draftId: `draft_2026-07-17_0b3556b0_encja-rozchod-wewnetrzny-rw`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.745Z`
- tags: `OWA`, `ontologia`, `optima`, `rozchod-wewnetrzny`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Rozchód Wewnętrzny (RW)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: RW
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek
- `CDN.TraElem` — pozycje rozchodu

## MCP API
### WRITE (NIE WYWOŁANO)
- `create_internal_issue` `POST /api/v1/warehouse/internal-issue` — tworzy RW

## Relacje
- RW zmniejsza stan magazynowy (rozchód)
- Do celów wewnętrznych: zużycie własne, braki, uszkodzenia
- Nie jest powiązany z kontrahentem zewnętrznym ani FS

## Uwagi
- Dokument wydania towaru na cele wewnętrzne firmy
- Typowe zastosowania: zużycie materiałów, likwidacja, wydanie do produkcji
- Przeciwieństwo PW (Przyjęcie Wewnętrzne)