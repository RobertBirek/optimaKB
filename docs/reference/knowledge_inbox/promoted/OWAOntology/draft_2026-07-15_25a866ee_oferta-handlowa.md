# Encja: Oferta Handlowa (OFER)
- draftId: `draft_2026-07-15_25a866ee_oferta-handlowa`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-22T14:41:10.285Z`
- tags: `OWA`, `ontologia`, `optima`, `oferta-handlowa`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 33 drafts from dashboard
## Content
# Encja: Oferta Handlowa (OFER)

## Klasyfikacja
- **Typ nadrzędny**: Dokument handlowy (dokument-handlowy)
- **Typ dokumentu**: `TrN_TypDokumentu = ?` (do weryfikacji MCP)
- **Symbol**: OFER
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
- `CDN.TraNag` — nagłówek oferty
- `CDN.TraElem` — pozycje oferty

## MCP API
### WRITE (NIE WYWOŁANO)
- `create_sales_offer` `POST /api/v1/sales/offer` — tworzy OFER

## Relacje
- OFER może być przekształcona w RO (Rezerwacja Odbiorcy) lub FS
- OFER nie jest dokumentem magazynowym — nie wpływa na stany
- OFER nie podlega księgowaniu

## Uwagi
- Dokument ofertowy dla klienta
- Nie rezerwuje towarów (w przeciwieństwie do RO)
- Stanowi podstawę do dalszych negocjacji lub złożenia zamówienia
- Typowy workflow: OFER → akceptacja → RO → WZ + FS
