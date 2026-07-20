# Encja: Podmiot / Firma własna
- draftId: `draft_2026-07-17_7bb99fcf_encja-podmiot-firma-w-asna`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.540Z`
- tags: `OWA`, `ontologia`, `optima`, `podmiot-firma`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Podmiot / Firma własna

## Status weryfikacji
**Częściowo zweryfikowane** — endpointy MCP i tabela MSSQL potwierdzone. Struktura Firma to EAV (Entity-Attribute-Value).

## Opis biznesowy
Firma własna (CDN.Firma) zawiera dane podmiotu gospodarczego zdefiniowanego w Optimie. Tabela ma strukturę EAV: `Fir_FirID` (ID firmy), `Fir_Numer` (numer atrybutu), `Fir_Wartosc` (wartość tekstowa), `Fir_Opis` (opis). 1417 wierszy w testowej bazie. Dane obejmują NIP, REGON, nazwę, adres, dane kontaktowe i konfigurację.

## Reguły biznesowe
- `Fir_FirID` — identyfikator firmy (może być wiele firm w jednej bazie)
- `Fir_Numer` — numer atrybutu (klucz z mapowania do pól)
- `Fir_Wartosc` (nvarchar) — wartość atrybutu (zawsze tekst, nawet dla wartości numerycznych)

## Źródła danych
- **Tabela główna**: `CDN.Firma` (BASE TABLE, 1417 wierszy)
- **Widok**: `CDN.PodmiotyView` — lista podmiotów
- **Konfiguracja**: `CDN.CfgKlucze` (1132 wierszy), `CDN.CfgWartosci` (1122 wierszy)

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `Fir_FirID` | int | ID firmy (część PK) |
| `Fir_Numer` | int | Numer atrybutu (część PK) |

## Pola i mapowanie API↔MSSQL
- `Fir_FirID` (int) — `get_config_firm`
- `Fir_Numer` (int) — NOT EXPOSED BY MCP
- `Fir_Wartosc` (nvarchar) — `get_config_firm` (wartość atrybutu)
- `Fir_Opis` (nvarchar) — `get_config_firm` (nazwa atrybutu)
- Konfiguracja systemowa — `get_config` (READ przez CfgKlucze/CfgWartosci)
- Konfiguracja MCP — `config_update` (WRITE)

## Relacje ontologiczne
- **POSIADA_KONFIGURACJE** (1:N) → `CDN.CfgKlucze` / `CDN.CfgWartosci`
- **JEST_WIDOCZNY_PRZEZ** → `CDN.PodmiotyView`
- **REFEROWANY_PRZEZ** (1:N) → większość tabel przez `*Firma` lub `*GIDFirma` kolumny (multi-tenancy)

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `get_config_firm` | READ — dane firmy |
| `get_config` | READ — konfiguracja (CfgKlucze) |
| `list_entity_views` | READ — lista podmiotów |
| `config_update` | WRITE — aktualizuje klucz konfiguracji |
| `get_context` | READ — kontekst MCP (OrganizationId, baza CDN) |
| `get_license_status` | READ — stan licencji |

## Pochodzenie wiedzy
- `mssql_execute_query`: INFORMATION_SCHEMA.COLUMNS dla CDN.Firma potwierdza 4 kolumny EAV
- `mssql_list_tables`: `CDN.PodmiotyView` istnieje
- Endpointy MCP zdefiniowane w AGENTS.md
- `get_context` pokazuje OrganizationId — ID firmy w kontekście MCP

## Otwarte problemy
1. EAV — jak mapować `Fir_Numer` na nazwy pól? Gdzie jest słownik?
2. `CDN.PodmiotyView` — jakie kolumny zawiera (zdenormalizowana wersja Firma?)
3. Relacja między `Fir_FirID` a `OrganizationId` z `get_context`
4. Multi-tenancy: czy `GIDFirma` w innych tabelach wskazuje na `Fir_FirID`?

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.Firma` (ROW_COUNT=1417, EAV)
- Klucz: (Fir_FirID, Fir_Numer)

## Walidacja
- [x] `mssql_execute_query` potwierdza strukturę EAV
- [ ] Wykonaj SELECT TOP 20 * FROM CDN.Firma aby zobaczyć mapowanie Numer→Opis
- [ ] Wykonaj SELECT TOP 1 * FROM CDN.PodmiotyView
- [ ] Zweryfikuj `get_config_firm` runtime — jakie pola zwraca?
- [ ] Ustal słownik `Fir_Numer` → nazwa pola