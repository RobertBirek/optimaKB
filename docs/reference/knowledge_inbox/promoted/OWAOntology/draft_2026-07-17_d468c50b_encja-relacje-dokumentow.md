# Encja: Relacje dokumentów
- draftId: `draft_2026-07-17_d468c50b_encja-relacje-dokumentow`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.149Z`
- tags: `OWA`, `ontologia`, `optima`, `relacje-dokumentow`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Relacje dokumentów

## Identyfikacja

- **Typ encji:** Relacja
- **Tabela MSSQL:** `CDN.DokRelacje`
- **Klucz główny:** `DoR_DoRId` (int, IDENTITY)
- **Liczba rekordów:** 0 (tabela pusta w CDN_TEST)
- **Status weryfikacji:** częściowo-zweryfikowane

## Struktura tabeli

| Kolumna | Typ | Opis |
|---------|-----|------|
| `DoR_DoRId` | int (PK, IDENTITY) | Identyfikator relacji |
| `DoR_ParentTyp` | smallint | Typ dokumentu nadrzędnego (klucz/typ encji) |
| `DoR_ParentId` | int | ID dokumentu nadrzędnego |
| `DoR_ParentGUID` | uniqueidentifier | GUID dokumentu nadrzędnego |
| `DoR_DokumentTyp` | smallint | Typ dokumentu podrzędnego |
| `DoR_DokumentId` | int | ID dokumentu podrzędnego |
| `DoR_DokumentGUID` | uniqueidentifier | GUID dokumentu podrzędnego |
| `DoR_Flaga` | smallint | Flaga określająca typ relacji |
| `DoR_HRM` | smallint | Dodatkowy identyfikator HRM (nullable) |

## Indeksy

- `DoR_Primary` (CLUSTERED) — `DoR_DoRId`
- `DoRUniqueDok` (UNIQUE) — kombinacja `DoR_ParentTyp + DoR_ParentId + DoR_DokumentTyp + DoR_DokumentId + DoR_ParentGUID + DoR_DokumentGUID`
- `DokRelacjeParentGUID` — `DoR_ParentGUID + DoR_DokumentTyp`
- `DokRelacjeParentId` — `DoR_ParentId + DoR_DokumentTyp` (INCLUDE: `DoR_ParentTyp, DoR_DokumentId`)
- `DoSDokument` — `DoR_DokumentTyp + DoR_DokumentId` (INCLUDE: `DoR_ParentTyp, DoR_ParentId`)
- `DosParent` — `DoR_ParentTyp + DoR_ParentId + DoR_DoRId`

## Semantyka

Tabela `DokRelacje` definiuje relacje między dokumentami w systemie Optima. Główne zastosowania:

1. **Relacje parent-child** — dokument nadrzędny (parent) → dokument podrzędny (child), np. Zamówienie (ZO) → Faktura zakupu (FZ), Rezerwacja odbiorcy (RO) → Wydanie zewnętrzne (WZ)
2. **Relacje korekt** — dokument korygowany → korekta, np. Faktura sprzedaży (FS) → Faktura korygująca (FSKOR)
3. **Relacje łańcuchowe** — umożliwiają śledzenie pełnej ścieżki dokumentu od zamówienia przez realizację po płatność

Kolumna `DoR_Flaga` rozróżnia typ relacji (np. korekta, powiązanie zwykłe, anulowanie). Kolumna `DoR_HRM` jest używana w kontekście kadrowo-płacowym.

## MCP API

- `OptimaMCP_optima_list_document_relations` — lista relacji (READ), zwraca wszystkie zdefiniowane powiązania między dokumentami

## Reguły biznesowe

1. Każda relacja między parą dokumentów jest unikalna (wymuszona przez indeks `DoRUniqueDok`).
2. Typ dokumentu nadrzędnego i podrzędnego (`DoR_ParentTyp`, `DoR_DokumentTyp`) odpowiadają identyfikatorom z `DokDefinicje.DDf_Klasa` lub innemu systemowi typów.
3. Relacje są używane do nawigacji w interfejsie użytkownika (przycisk "Dokumenty powiązane") oraz w workflow (np. automatyczne generowanie FSKOR z FS).
4. Usunięcie dokumentu nadrzędnego może skutkować kaskadowym usunięciem lub osieroceniem relacji (zależne od konfiguracji).