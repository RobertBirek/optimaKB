# Encja: Faktura Zakupu FZ
- draftId: `draft_2026-07-17_f0eef23a_encja-faktura-zakupu-fz`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.931Z`
- tags: `OWA`, `ontologia`, `optima`, `faktura-zakupu`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Faktura Zakupu (FZ)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji przez MCP)
- **Symbol**: FZ
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek, `TrN_TypDokumentu = ?`
- `CDN.TraElem` — pozycje faktury zakupu

## MCP API
### READ (NIE WYWOŁANO)
- `list_invoices(date_from?, date_to?, type=?)` — lista faktur zakupu
- `get_invoice(id)` — szczegóły faktury zakupu
- `get_document(id)` — ogólny endpoint dokumentu
- `get_document_balance(id)` — saldo

### WRITE (NIE WYWOŁANO)
- `create_purchase_invoice` `POST /api/v1/purchase/invoice` — tworzy FZ
- `create_purchase_correction` `POST /api/v1/purchase/correction` — tworzy FZKOR
- `create_internal_purchase_proof` `POST /api/v1/purchase/internal-proof` — Dowód Wewnętrzny Zakupu (FZWFZ)

## Relacje
- FZ może pochodzić z ZO (Zamówienie u Dostawcy) przez `invoice_purchase_order`
- FZ może być korygowana → FZKOR (Korekta FZ)
- Powiązana z PZ (Przyjęcie Zewnętrzne) przez workflow zakupowy
- Powiązania przez `DokRelacje` lub `TrN_RelTrNId`

## Workflow zakupowy
1. `create_purchase_order` → ZO (Zamówienie u Dostawcy)
2. `receive_purchase_order` → PZ (Przyjęcie Zewnętrzne)
3. `invoice_purchase_order` → FZ (Faktura Zakupu)