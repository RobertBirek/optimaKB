# Encja: Przesunięcie Międzymagazynowe (MM)
- draftId: `draft_2026-07-17_f0509d1f_encja-przesuniecie-miedzymagazynowe-mm`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.024Z`
- tags: `OWA`, `ontologia`, `optima`, `przesuniecie-mm`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Przesunięcie Międzymagazynowe (MM)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: MM
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek, wymagane: `TrN_MagZrodlo` (magazyn źródłowy) i `TrN_MagDocelowy` (magazyn docelowy)
- `CDN.TraElem` — pozycje przesunięcia

## MCP API
### WRITE (NIE WYWOŁANO)
- `create_warehouse_transfer` `POST /api/v1/warehouse/transfer` — tworzy MM

## Relacje
- MM przenosi towary między dwoma magazynami
- Magazyn źródłowy → zmniejszenie stanu
- Magazyn docelowy → zwiększenie stanu
- Nie zmienia sumarycznego stanu firmy, tylko rozmieszczenie

## Uwagi
- Ruch wewnętrzny — nie ma kontrahenta zewnętrznego
- Wymagane są oba magazyny: źródłowy i docelowy
- MM może być użyty do przesunięcia między magazynem głównym a produkcyjnym