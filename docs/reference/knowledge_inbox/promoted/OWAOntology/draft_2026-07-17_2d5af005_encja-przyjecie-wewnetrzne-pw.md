# Encja: Przyjęcie Wewnętrzne (PW)
- draftId: `draft_2026-07-17_2d5af005_encja-przyjecie-wewnetrzne-pw`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.043Z`
- tags: `OWA`, `ontologia`, `optima`, `przyjecie-wewnetrzne`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Przyjęcie Wewnętrzne (PW)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: PW
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek
- `CDN.TraElem` — pozycje przyjęcia

## MCP API
### WRITE (NIE WYWOŁANO)
- `create_internal_receipt` `POST /api/v1/warehouse/internal-receipt` — tworzy PW

## Relacje
- PW zwiększa stan magazynowy (przychód)
- Do celów wewnętrznych: nadwyżki inwentaryzacyjne, przyjęcie z produkcji
- Nie jest powiązany z kontrahentem zewnętrznym ani FZ

## Uwagi
- Dokument przyjęcia towaru na cele wewnętrzne
- Typowe zastosowania: przyjęcie nadwyżek, przyjęcie wyrobów gotowych z produkcji
- Przeciwieństwo RW (Rozchód Wewnętrzny)