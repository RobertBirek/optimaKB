# Encja: Wydanie Zewnętrzne (WZ)
- draftId: `draft_2026-07-15_05af9e1c_wydanie-zewnetrzne`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-22T14:41:10.881Z`
- tags: `OWA`, `ontologia`, `optima`, `wydanie-zewnetrzne`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 33 drafts from dashboard
## Content
# Encja: Wydanie Zewnętrzne (WZ)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: WZ
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek, kolumny magazynowe: `TrN_MagZrodlo`, `TrN_MagDocelowy`
- `CDN.TraElem` — pozycje wydania

## MCP API
### READ (NIE WYWOŁANO)
- `list_warehouse_docs(type=?)` — lista dokumentów magazynowych
- `get_warehouse_doc(id)` — szczegóły WZ

### WRITE (NIE WYWOŁANO)
- `create_goods_issue` `POST /api/v1/warehouse/issue` — tworzy WZ
- `create_warehouse_release` `POST /api/v1/warehouse-releases` — tworzy wydanie magazynowe

## Relacje
- WZ może powstać z RO przez `fulfill_order`
- WZ może być samodzielnym dokumentem (niepowiązanym z RO)
- WZ generuje ruch magazynowy — zmniejsza stan w magazynie źródłowym

## Uwagi
- Dokument wydania towaru z magazynu na zewnątrz
- Może być powiązany z FS (faktura do WZ) lub wystawiony osobno
- W ramach `complete_order`: RO → WZ + FS
