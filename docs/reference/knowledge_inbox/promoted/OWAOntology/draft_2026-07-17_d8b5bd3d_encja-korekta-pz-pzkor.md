# Encja: Korekta PZ (PZKOR)
- draftId: `draft_2026-07-17_d8b5bd3d_encja-korekta-pz-pzkor`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.692Z`
- tags: `OWA`, `ontologia`, `optima`, `korekta-pz`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Korekta PZ (PZKOR)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: PZKOR
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek
- `CDN.TraElem` — pozycje korekty
- `DokRelacje` — relacja PZKOR → PZ (oryginał)

## MCP API
### WRITE (NIE WYWOŁANO)
- `create_goods_receipt_correction` `POST /api/v1/warehouse/receipt-correction` — tworzy PZKOR

### Workflow (NIE WYWOŁANO)
- `return_receipt` `POST /api/v1/workflow/receipt/return` — zwrot PZ → PZKOR

## Relacje
- PZKOR KORYGUJE PZ — powiązanie przez `DokRelacje` lub `TrN_RelTrNId`
- Zwrot towaru do dostawcy (PZ na minus)
- Generuje przeciwny ruch magazynowy

## Uwagi
- Osobny typ dokumentu od PZ
- PZKOR może być utworzony ręcznie (`create_goods_receipt_correction`) lub przez workflow (`return_receipt`)
- Analogicznie do FSKOR/FZKOR, ale dla dokumentów magazynowych