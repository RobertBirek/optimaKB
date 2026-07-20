# Encja: Konto bankowe
- draftId: `draft_2026-07-17_c448c78a_encja-konto-bankowe`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.341Z`
- tags: `OWA`, `ontologia`, `optima`, `konto-bankowe`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Konto bankowe

## Status weryfikacji
**Zweryfikowane** — tabela MSSQL i endpointy MCP potwierdzone.

## Opis biznesowy
Konto bankowe (CDN.BnkRachunki) reprezentuje rachunek bankowy firmy. Zawiera numer rachunku (IBAN lub NRB), akronim, symbol, salda (BO i systemowe), limity kredytowe, oprocentowanie, kursy walut (mnożnik/licznik) oraz flagi SEPA i Split Payment. Konto jest powiązane z bankiem (CDN.BnkNazwy) i definicją dokumentu (CDN.DokDefinicje).

## Reguły biznesowe
- `BRa_Akronim` — UNIQUE
- `BRa_Symbol` — UNIQUE
- `(BRa_BNaID, BRa_RachunekNr)` — UNIQUE
- `BRa_Waluta` (varchar(3)) — kod waluty rachunku
- `BRa_Termin >= 0` (sprawdź czy istnieje CHECK, nie potwierdzono)
- `BRa_SplitPay` (tinyint) — obsługa split payment (MPP)
- `BRa_PrzelewySEPA` (tinyint) — obsługa SEPA
- `BRa_Nieaktywny` (smallint) — flaga dezaktywacji

## Źródła danych
- **Tabela główna**: `CDN.BnkRachunki` (BASE TABLE, 5 wierszy)
- **FK**: `CDN.BnkNazwy` (nazwy banków), `CDN.DokDefinicje`, `CDN.KartyKredytowe`

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `BRa_BRaID` | int IDENTITY | PK (clustered) |
| `BRa_Akronim` | varchar(20) | Akronim (UNIQUE) |
| `BRa_Symbol` | varchar(5) | Symbol (UNIQUE) |

## Pola i mapowanie API↔MSSQL
- `BRa_BRaID` (int, IDENTITY, PK) — `list_bank_accounts` / `create_bank_account`
- `BRa_Akronim` (varchar(20)) — `list_bank_accounts` / `create_bank_account`
- `BRa_Symbol` (varchar(5)) — NOT EXPOSED BY MCP
- `BRa_DDfID` (int, FK→DokDefinicje) — NOT EXPOSED BY MCP
- `BRa_Nazwa` (nvarchar(50)) — `list_bank_accounts` / `create_bank_account`
- `BRa_BNaID` (int, FK→BnkNazwy) — NOT EXPOSED BY MCP
- `BRa_RachunekNr` (nvarchar(51)) — `list_bank_accounts` / `create_bank_account` / `check_bank_account`
- `BRa_IBAN` (smallint) — NOT EXPOSED BY MCP
- `BRa_KKrID` (int, FK→KartyKredytowe) — NOT EXPOSED BY MCP
- `BRa_KartaDW` (datetime) — NOT EXPOSED BY MCP
- `BRa_Waluta` (varchar(3)) — NOT EXPOSED BY MCP
- `BRa_KursSprzedazyNr`, `BRa_KursZakupuNr`, `BRa_KursNumer` — NOT EXPOSED BY MCP
- `BRa_KursL` (decimal(15,4)), `BRa_KursM` (decimal(5,0)) — NOT EXPOSED BY MCP
- `BRa_SaldoBO`, `BRa_SaldoBOSys` (decimal(15,2)) — NOT EXPOSED BY MCP
- `BRa_BRpOkres` (smallint) — NOT EXPOSED BY MCP
- `BRa_Typ` (int) — NOT EXPOSED BY MCP
- `BRa_LimitKredytu` (decimal(15,2)) — NOT EXPOSED BY MCP
- `BRa_OprocRachunku`, `BRa_OprocKredytu`, `BRa_OprocKarne` — NOT EXPOSED BY MCP
- `BRa_KaraZaPrzekr` — NOT EXPOSED BY MCP
- `BRa_NumeryObce` (smallint) — NOT EXPOSED BY MCP
- `BRa_KontoPrzeciwstawne` (nvarchar(50)) — NOT EXPOSED BY MCP
- `BRa_Nieaktywny` (smallint) — NOT EXPOSED BY MCP
- `BRa_MagazynWalut`, `BRa_KursHistorycznyMW`, `BRa_RozKur2SumaMW` — NOT EXPOSED BY MCP
- `BRa_PrzelewySEPA` (tinyint) — NOT EXPOSED BY MCP
- `BRa_SplitPay` (tinyint) — NOT EXPOSED BY MCP
- `BRa_CDC*` (3 kolumny) — NOT EXPOSED BY MCP (CDC=Capgemini Direct Collect?)
- `BRa_GIDTyp`, `BRa_GIDFirma`, `BRa_GIDNumer`, `BRa_GIDLp` — NOT EXPOSED BY MCP

## Relacje ontologiczne
- **NALEZY_DO_BANKU** (N:1) → `CDN.BnkNazwy` przez `BRa_BNaID → BNa_BNaId`
- **MA_DOKUMENT_DOMYSLNY** (N:1) → `CDN.DokDefinicje` przez `BRa_DDfID → DDf_DDfID`
- **POWIAZANA_Z_KARTA** (N:1) → `CDN.KartyKredytowe` przez `BRa_KKrID → KKr_KKrId`
- **UZYWANA_PRZEZ_ZLECENIA** (1:N) → `CDN.BnkZdarzenia` [UNKNOWN pole]
- **UZYWANA_PRZEZ_KONTRAHENTOW** (1:N) → `CDN.Kontrahenci.Knt_RachunekNr` [UNKNOWN powiązanie]

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `list_bank_accounts` | READ — lista kont bankowych |
| `create_bank_account` | WRITE — tworzy konto |
| `check_bank_account` | READ — Biała Lista VAT MF |

## Pochodzenie wiedzy
- `mssql_describe_table` (CDN.BnkRachunki, 2026-07-15)
- 5 wierszy, 53 kolumny, 3 FKi, 8 indeksów
- FK potwierdzone: BnkNazwy, DokDefinicje, KartyKredytowe

## Otwarte problemy
1. `BRa_IBAN` jest `smallint` nie `varchar` — to flaga czy ID?
2. Kolumny `BRa_CDC*` — znaczenie?
3. `check_bank_account` używa NIP+account_number, nie BRa_BRaID — jak mapuje?

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.BnkRachunki` (ROW_COUNT=5)
- PK: `BRa_BRaID` (IDENTITY)
- FK: BnkNazwy, DokDefinicje, KartyKredytowe

## Walidacja
- [x] `mssql_describe_table` potwierdza strukturę
- [ ] Zweryfikuj `list_bank_accounts` — jakie pola zwraca?
- [ ] Sprawdź znaczenie `BRa_IBAN` jako smallint