# Encja: Faktura Zaliczkowa (FA)
- draftId: `draft_2026-07-15_60d92e04_faktura-zaliczkowa`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-22T14:41:09.225Z`
- tags: `OWA`, `ontologia`, `optima`, `faktura-zaliczkowa`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 33 drafts from dashboard
## Content
# Encja: Faktura Zaliczkowa (FA)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: FA
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek
- `CDN.TraElem` — pozycje faktury zaliczkowej

## MCP API
### WRITE (NIE WYWOŁANO)
- `advance_invoice_from_proforma` `POST /api/v1/workflow/proforma/advance` — generuje FA z FPF
- `document_advance_invoice` `POST /api/v1/documents/advance-invoice` — generuje fakturę zaliczkową

## Relacje
- FA generowana z FPF (Faktura Proforma) przez `advance_invoice_from_proforma`
- FA dokumentuje otrzymaną zaliczkę/przedpłatę
- FA może być później rozliczona z FS końcową

## Uwagi
- Faktura zaliczkowa wystawiana po otrzymaniu przedpłaty
- Podlega księgowaniu i podlega VAT
- Workflow: FPF → wpłata zaliczki → FA → docelowa FS (z pomniejszeniem o zaliczkę)
