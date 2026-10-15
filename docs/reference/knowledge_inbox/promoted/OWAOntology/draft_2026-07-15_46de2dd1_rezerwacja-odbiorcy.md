# Encja: Rezerwacja Odbiorcy (RO)
- draftId: `draft_2026-07-15_46de2dd1_rezerwacja-odbiorcy`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-22T14:41:09.884Z`
- tags: `OWA`, `ontologia`, `optima`, `rezerwacja-odbiorcy`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 33 drafts from dashboard
## Content
# Encja: Rezerwacja Odbiorcy (RO)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: RO
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek zamówienia
- `CDN.TraElem` — pozycje zamówienia

## MCP API
### WRITE (NIE WYWOŁANO)
- `create_sales_order` `POST /api/v1/sales/order` — tworzy RO

### Workflow (NIE WYWOŁANO)
- `fulfill_order` `POST /api/v1/workflow/order/fulfill` — realizuje RO → WZ (Wydanie Zewnętrzne)
- `invoice_order` `POST /api/v1/workflow/order/invoice` — fakturuje RO → FS (Faktura Sprzedaży)
- `complete_order` `POST /api/v1/workflow/order/complete` — pełna realizacja RO → WZ + FS

## Relacje
- RO → WZ przez `fulfill_order`
- RO → FS przez `invoice_order`
- RO → WZ + FS przez `complete_order` (oba kroki)
- RO rezerwuje stany magazynowe

## Uwagi
- Dokument zamówienia od klienta
- Rezerwuje towary w magazynie (zmniejsza dostępne stany)
- Może być realizowany etapami (częściowe WZ, częściowe FS)
