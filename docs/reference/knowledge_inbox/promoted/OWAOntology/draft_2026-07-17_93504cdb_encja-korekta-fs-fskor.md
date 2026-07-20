# Encja: Korekta FS (FSKOR)
- draftId: `draft_2026-07-17_93504cdb_encja-korekta-fs-fskor`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.735Z`
- tags: `OWA`, `ontologia`, `optima`, `korekta-fs`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Korekta FS (FSKOR)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: FSKOR
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek, osobny typ dokumentu
- `CDN.TraElem` — pozycje korekty
- `DokRelacje` — relacja FSKOR → FS (oryginał)

## MCP API
### READ (NIE WYWOŁANO)
- `list_invoices(type=?)` — lista faktur korygujących
- `get_invoice(id)` — szczegóły FSKOR
- `get_document(id)` — ogólny endpoint

### WRITE (NIE WYWOŁANO)
- `correct_invoice` `POST /api/v1/workflow/invoice/correct` — generuje FSKOR z FS (workflow)
- `create_sales_correction` `POST /api/v1/sales/correction` — tworzy FSKOR bezpośrednio

## Relacje
- FSKOR KORYGUJE FS — powiązanie przez `DokRelacje` lub `TrN_RelTrNId`
- Korekta może dotyczyć kwot (zmiana ceny, rabatu) lub ilości (zwrot towaru)
- Korekta może być in plus (zwiększenie) lub in minus (zmniejszenie)

## Uwagi
- FSKOR jest osobnym typem dokumentu, nie modyfikuje oryginalnego FS
- Workflow `correct_invoice` automatyzuje tworzenie korekty z istniejącej FS
- Alternatywnie można utworzyć FSKOR ręcznie przez `create_sales_correction`