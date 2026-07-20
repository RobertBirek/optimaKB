# Encja: Dokument handlowy
- draftId: `draft_2026-07-17_37b933aa_encja-dokument-handlowy`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.118Z`
- tags: `OWA`, `ontologia`, `optima`, `dokument-handlowy`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Dokument handlowy (abstrakcyjna baza)

## Klasyfikacja
- **Warstwa**: ontologia domeny
- **Status**: częściowo-zweryfikowane

## Tabele MSSQL
Wszystkie podtypy dokumentów współdzielą dwie tabele:
- `CDN.TraNag` (nagłówek, PK=`TrN_TrNID`, 120+ kolumn) — kluczowe: `TrN_TypDokumentu` (int), `TrN_PelnyNumer`, `TrN_DataWystawienia`, `TrN_DataOperacji`, `TrN_KntId`, `TrN_SumaNetto`, `TrN_SumaVAT`, `TrN_SumaBrutto`, `TrN_FormaPlatnosci`, `TrN_Termin`, `TrN_Bufor`, `TrN_Anulowany`, `TrN_Waluta`, `TrN_KursWaluty`, `TrN_NumerObcy`, `TrN_MagZrodlo`, `TrN_MagDocelowy`, `TrN_PodzialPlatnosci`, `TrN_StatusStr`
- `CDN.TraElem` (pozycje, PK=`TrE_TrEId`, FK=`TrE_TrNId` → `TraNag.TrN_TrNID`)

## Definicje dokumentów
Typy dokumentów zdefiniowane w `CDN.DokDefinicje` (PK=`DDf_DDfID`):
- `DDf_Symbol` — skrót (np. FS, FZ, RO, WZ, PZ)
- `DDf_Nazwa` — pełna nazwa
- `DDf_Typ` — kategoria
- `isActive` — czy aktywny

## Potwierdzone typy
- **FS (302)** — Faktura Sprzedaży, potwierdzone MCP

## Pola MCP (wspólne dla TraNag)
`id`, `type`, `fullNumber`, `issueDate`, `operationDate`, `contractorId`, `contractorName`, `contractorCode`, `sourceWarehouseId`, `destinationWarehouseId`, `totalNet`, `totalVat` (tylko faktury), `totalGross`, `paymentFormId`, `dueDate`, `isBuffer`, `isCancelled`, `statusString`, `updatedAt`, `lines[]`, `splitPayment`, `currencyCode`, `exchangeRate`, `externalNumber`

## MCP API
- **READ**: `list_documents(type?, date_from?, date_to?, updated_from?)` — lista dokumentów
- **READ**: `get_document(id)` — szczegóły dokumentu (SEK)
- **READ**: `list_document_definitions` — definicje typów (DokDefinicje)
- **READ**: `list_document_relations` — relacje między dokumentami (DokRelacje)
- **READ**: `get_document_timeline(id)` — historia dokumentu
- **READ**: `get_document_balance(id)` — saldo dokumentu

## Relacje
- `DokRelacje` — powiązania między dokumentami (np. Korekta→oryginał)
- `TrN_RelTrNId` — ID dokumentu powiązanego (np. FSKOR→FS)
- Każdy dokument może mieć wiele pozycji (`TraElem`, 1:N)

## Uwagi
- Typ dokumentu (`TrN_TypDokumentu`) jednoznacznie określa podtyp
- `TrN_Bufor=1` oznacza dokument w buforze (niezatwierdzony)
- `TrN_Anulowany=1` oznacza dokument anulowany