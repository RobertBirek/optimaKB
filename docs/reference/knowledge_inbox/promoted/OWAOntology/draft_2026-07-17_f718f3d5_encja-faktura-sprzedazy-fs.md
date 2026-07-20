# Encja: Faktura Sprzedaży FS
- draftId: `draft_2026-07-17_f718f3d5_encja-faktura-sprzedazy-fs`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.380Z`
- tags: `OWA`, `ontologia`, `optima`, `faktura-sprzedazy`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Faktura Sprzedaży (FS)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = 302`, symbol FS
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek, `TrN_TypDokumentu = 302`
- `CDN.TraElem` — pozycje faktury

## Pola MCP (potwierdzone)
Wszystkie pola wspólne TraNag (patrz dokument-handlowy) plus:
- `totalVat` — suma VAT (obecna dla faktur)

## MCP API
### READ (NIE WYWOŁANO)
- `list_invoices(date_from?, date_to?, type=302)` — lista faktur
- `get_invoice(id)` — szczegóły faktury
- `get_invoice_ksef_status(invoice_id)` — status KSeF
- `get_document(id)` — ogólny endpoint dokumentu
- `get_document_balance(id)` — saldo (brutto, zapłacone, pozostaje)
- `get_document_timeline(id)` — historia

### WRITE (NIE WYWOŁANO)
- `create_sales_invoice` `POST /api/v1/sales/invoice` — tworzy FS
- `correct_invoice` `POST /api/v1/workflow/invoice/correct` — koryguje FS → FSKOR
- `create_sales_correction` `POST /api/v1/sales/correction` — tworzy FSKOR bezpośrednio
- `document_recalculate` `POST /api/v1/documents/recalculate` — przelicza
- `document_toggle_split_payment` `POST /api/v1/documents/{id}/split-payment` — MPP
- `pay_document` `POST /api/v1/settlements/pay/{id}/` — płatność KP/KW

## Relacje
- FS może być korygowana → FSKOR (Korekta FS)
- FS może pochodzić z RO (Rezerwacja Odbiorcy) przez `invoice_order`
- FS może pochodzić z FPF (Proforma) przez `advance_invoice_from_proforma` → FA
- Powiązania przez `DokRelacje` lub `TrN_RelTrNId`

## Uwagi
- Typ 302 potwierdzony przez MCP
- `splitPayment` — mechanizm podzielonej płatności (MPP)
- KSeF: faktura wysyłana do Krajowego Systemu e-Faktur