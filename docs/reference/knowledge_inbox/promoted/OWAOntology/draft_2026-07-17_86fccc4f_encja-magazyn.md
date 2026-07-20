# Encja: Magazyn
- draftId: `draft_2026-07-17_86fccc4f_encja-magazyn`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.096Z`
- tags: `OWA`, `ontologia`, `optima`, `magazyn`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Magazyn

## Status weryfikacji
**Zweryfikowane** — tabela MSSQL i endpointy MCP potwierdzone.

## Opis biznesowy
Magazyn (CDN.Magazyny) reprezentuje fizyczną lub logiczną lokalizację przechowywania towarów. Każdy magazyn ma symbol (`Mag_Symbol`, UNIQUE), nazwę, opis, rejestr, typ. Wspiera magazyny unijne (`Mag_Unijny`) z kodem kraju UE i kodem transakcji. Magazyny są używane w dokumentach handlowych i magazynowych (TraNag, TwrIlosci, TwrZasoby).

## Reguły biznesowe
- `Mag_Symbol` — UNIQUE (varchar(20))
- `Mag_Typ` (smallint) — typ magazynu [UNKNOWN enum]
- `Mag_NieAktywny` (tinyint) — flaga dezaktywacji
- `Mag_Unijny` (tinyint) — magazyn unijny (WDT/WNT)
- `Mag_UEKraj` (nvarchar(2)) — kod kraju UE (jeśli unijny)
- `Mag_KodTransakcji` (nvarchar(2)) — kod transakcji unijnej
- `Mag_Rejestr` (nvarchar(5)) — rejestr księgowy
- `Mag_TwCNumer` (int, DEFAULT 0) — domyślny numer ceny

## Źródła danych
- **Tabela główna**: `CDN.Magazyny` (BASE TABLE, 2 wiersze)
- **eSklep**: `CDN.eSklepMagazyny`

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `Mag_MagId` | int IDENTITY | PK (clustered) |
| `Mag_Symbol` | varchar(20) | Symbol (UNIQUE) |
| `Mag_Nazwa` | nvarchar(50) | Nazwa |

## Pola i mapowanie API↔MSSQL
- `Mag_MagId` (int, IDENTITY, PK) — `list_warehouses` / `create_warehouse` / `update_warehouse` / `delete_warehouse`
- `Mag_GIDNumer` (int) — NOT EXPOSED BY MCP
- `Mag_MagazynZwrotnyXL` (tinyint) — NOT EXPOSED BY MCP
- `Mag_Typ` (smallint) — NOT EXPOSED BY MCP
- `Mag_Symbol` (varchar(20)) — `list_warehouses` / `create_warehouse`
- `Mag_Nazwa` (nvarchar(50)) — `list_warehouses` / `create_warehouse` / `update_warehouse`
- `Mag_Opis` (nvarchar(254)) — `list_warehouses` / `create_warehouse` / `update_warehouse`
- `Mag_Rejestr` (nvarchar(5)) — NOT EXPOSED BY MCP
- `Mag_NieAktywny` (tinyint) — NOT EXPOSED BY MCP
- `Mag_MagIdXL` (int) — NOT EXPOSED BY MCP
- `Mag_Unijny` (tinyint) — NOT EXPOSED BY MCP
- `Mag_UEKraj` (nvarchar(2)) — NOT EXPOSED BY MCP
- `Mag_KodTransakcji` (nvarchar(2)) — NOT EXPOSED BY MCP
- `Mag_Konto` (varchar(50)) — NOT EXPOSED BY MCP
- `Mag_OpeZalId`, `Mag_StaZalId`, `Mag_TS_Zal` — NOT EXPOSED BY MCP
- `Mag_OpeModId`, `Mag_StaModId`, `Mag_TS_Mod` — NOT EXPOSED BY MCP
- `Mag_TwCNumer` (int, DEFAULT 0) — NOT EXPOSED BY MCP
- `Mag_Adres` (int, DEFAULT 0) — NOT EXPOSED BY MCP
- `Mag_OpeModKod`, `Mag_OpeModNazwisko`, `Mag_OpeZalKod`, `Mag_OpeZalNazwisko` — NOT EXPOSED BY MCP

## Relacje ontologiczne
- **UZYWANY_PRZEZ_DOKUMENTY** (1:N) → `CDN.TraNag` przez `TrN_MagZrdId`, `TrN_MagDocId`
- **POSIADA_ILOSCI** (1:N) → `CDN.TwrIlosci` przez `TwI_MagId`
- **POSIADA_ZASOBY** (1:N) → `CDN.TwrZasoby` przez `TwZ_MagId`
- **UZYWANY_PRZEZ_ESKLEP** (1:N?) → `CDN.eSklepMagazyny`

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `list_warehouses` | READ — lista magazynów |
| `create_warehouse` | WRITE — tworzy magazyn |
| `update_warehouse` | WRITE — aktualizuje magazyn |
| `delete_warehouse` | WRITE — usuwa magazyn |

## Pochodzenie wiedzy
- `mssql_describe_table` (CDN.Magazyny, 2026-07-15)
- 2 wiersze, 26 kolumn, brak FK constraints, 2 indeksy

## Otwarte problemy
1. Enum `Mag_Typ` — jakie wartości?
2. `Mag_MagazynZwrotnyXL` — znaczenie?
3. `Mag_MagIdXL` — referencja do eSklepMagazyny?
4. `Mag_Adres` (int) — FK do tabeli adresów?
5. Mapping endpointów MCP do konkretnych kolumn niepotwierdzony — które pola są mutowalne?

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.Magazyny` (ROW_COUNT=2)
- PK: `Mag_MagId` (IDENTITY)

## Walidacja
- [x] `mssql_describe_table` potwierdza strukturę
- [ ] Zweryfikuj `list_warehouses` — jakie pola zwraca?
- [ ] Sprawdź enum `Mag_Typ`