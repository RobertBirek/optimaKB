# Encja: Zamówienie u Dostawcy (ZO)
- draftId: `draft_2026-07-17_0ac2c01f_encja-zamowienie-u-dostawcy-zo`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.995Z`
- tags: `OWA`, `ontologia`, `optima`, `zamowienie-dostawcy`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Zamówienie u Dostawcy (ZO)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: ZO
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek zamówienia
- `CDN.TraElem` — pozycje zamówienia

## MCP API
### WRITE (NIE WYWOŁANO)
- `create_purchase_order` `POST /api/v1/purchase/order` — tworzy ZO

### Workflow (NIE WYWOŁANO)
- `receive_purchase_order` `POST /api/v1/workflow/purchase/receive` — przyjmuje ZO → PZ
- `invoice_purchase_order` `POST /api/v1/workflow/purchase/invoice` — fakturuje ZO → FZ

## Relacje
- ZO → PZ (Przyjęcie Zewnętrzne) przez `receive_purchase_order`
- ZO → FZ (Faktura Zakupu) przez `invoice_purchase_order`
- ZO jest dokumentem zamówienia u dostawcy

## Uwagi
- Dokument zamówienia składanego do dostawcy
- Może być realizowany etapami (częściowe PZ)
- Workflow zakupowy: ZO → PZ → FZ