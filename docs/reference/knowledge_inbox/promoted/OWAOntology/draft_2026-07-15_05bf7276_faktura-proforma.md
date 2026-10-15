# Encja: Faktura Proforma (FPF)
- draftId: `draft_2026-07-15_05bf7276_faktura-proforma`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-22T14:41:10.816Z`
- tags: `OWA`, `ontologia`, `optima`, `faktura-proforma`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 33 drafts from dashboard
## Content
# Encja: Faktura Proforma (FPF)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: FPF
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek
- `CDN.TraElem` — pozycje proformy

## MCP API
### WRITE (NIE WYWOŁANO)
- `create_proforma` `POST /api/v1/sales/proforma` — tworzy FPF
- `advance_invoice_from_proforma` `POST /api/v1/workflow/proforma/advance` — generuje FA (Faktura Zaliczkowa) z FPF

## Relacje
- FPF → FA (Faktura Zaliczkowa) przez `advance_invoice_from_proforma`
- FPF nie jest dokumentem księgowym — to dokument ofertowy/przedpłatowy
- Po opłaceniu zaliczki, z FPF generowana jest FA

## Uwagi
- Proforma służy do potwierdzenia warunków przedpłaty
- Nie podlega księgowaniu — księguje się dopiero FA
- Typowy workflow: FPF → wpłata zaliczki → FA → FS
