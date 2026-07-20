# Encja: Korekta FZ (FZKOR)
- draftId: `draft_2026-07-17_9197d815_encja-korekta-fz-fzkor`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.865Z`
- tags: `OWA`, `ontologia`, `optima`, `korekta-fz`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Korekta FZ (FZKOR)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: FZKOR
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek, osobny typ dokumentu
- `CDN.TraElem` — pozycje korekty zakupu
- `DokRelacje` — relacja FZKOR → FZ (oryginał)

## MCP API
### READ (NIE WYWOŁANO)
- `list_invoices(type=?)` — lista faktur zakupu korygujących
- `get_invoice(id)` — szczegóły FZKOR
- `get_document(id)` — ogólny endpoint

### WRITE (NIE WYWOŁANO)
- `create_purchase_correction` `POST /api/v1/purchase/correction` — tworzy FZKOR

## Relacje
- FZKOR KORYGUJE FZ — powiązanie przez `DokRelacje` lub `TrN_RelTrNId`
- Analogicznie do FSKOR, może być in plus lub in minus

## Uwagi
- Osobny typ dokumentu od FZ
- Brak dedykowanego workflow "correct" dla zakupu (w przeciwieństwie do `correct_invoice` dla sprzedaży)
- Tworzenie przez `create_purchase_correction`