# Encja: Paragon (PA)
- draftId: `draft_2026-07-17_d0b56114_encja-paragon-pa`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.976Z`
- tags: `OWA`, `ontologia`, `optima`, `paragon`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Paragon (PA)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: PA
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek paragonu
- `CDN.TraElem` — pozycje paragonu

## MCP API
### READ (NIE WYWOŁANO)
- `list_receipt_rules` — lista reguł paragonowych
- `list_documents(type=?)` — lista dokumentów

### WRITE (NIE WYWOŁANO)
- `create_receipt` `POST /api/v1/sales/receipt` — tworzy PA

## Relacje
- PA jest dokumentem sprzedaży detalicznej
- PA podlega fiskalizacji (kasa fiskalna)
- PA może być wystawiony na paragon (bez danych kontrahenta) lub jako faktura uproszczona

## Uwagi
- Dokument sprzedaży dla osób fizycznych nieprowadzących działalności
- `list_receipt_rules` zwraca reguły wystawiania paragonów (np. limity kwotowe)
- Paragon może być później wymieniony na FS (na żądanie klienta w ciągu 15 dni)