# Encja: Przyjęcie Zewnętrzne (PZ)
- draftId: `draft_2026-07-17_d4097219_encja-przyjecie-zewnetrzne-pz`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:48.057Z`
- tags: `OWA`, `ontologia`, `optima`, `przyjecie-zewnetrzne`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Przyjęcie Zewnętrzne (PZ)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: PZ
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek, kolumny magazynowe
- `CDN.TraElem` — pozycje przyjęcia

## MCP API
### READ (NIE WYWOŁANO)
- `list_warehouse_docs(type=?)` — lista dokumentów magazynowych
- `get_warehouse_doc(id)` — szczegóły PZ

### WRITE (NIE WYWOŁANO)
- `create_goods_receipt` `POST /api/v1/warehouse/receipt` — tworzy PZ

### Workflow (NIE WYWOŁANO)
- `receive_purchase_order` `POST /api/v1/workflow/purchase/receive` — przyjmuje ZO → PZ

## Relacje
- PZ może powstać z ZO (Zamówienie u Dostawcy) przez `receive_purchase_order`
- PZ może być korygowane → PZKOR przez `return_receipt`
- PZ generuje ruch magazynowy — zwiększa stan w magazynie docelowym

## Uwagi
- Dokument przyjęcia towaru do magazynu z zewnątrz (od dostawcy)
- Może być powiązany z FZ (faktura zakupu)
- Workflow zakupowy: ZO → PZ → FZ