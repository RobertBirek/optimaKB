# Encja: Waluta
- draftId: `draft_2026-07-17_3df6d829_encja-waluta`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.665Z`
- tags: `OWA`, `ontologia`, `optima`, `waluta`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Waluta

## Status weryfikacji
**Częściowo zweryfikowane** — endpointy MCP potwierdzone, ale **brak dedykowanej tabeli CDN.Waluty w MSSQL**. Waluty są przechowywane jako kod varchar(3) w polach tabel (np. `BRa_Waluta`, `TwrCeny waluta`).

## Opis biznesowy
Waluta w Optimie nie ma osobnej tabeli słownikowej. Kod waluty (PLN, EUR, USD, …) jest przechowywany inline w rekordach. Endpointy MCP (`list_currencies`, `create_currency`, `get_currency_rate`) sugerują istnienie API do zarządzania walutami, ale backing storage jest prawdopodobnie po stronie API, nie MSSQL.

## Reguły biznesowe
- Kod waluty: 3 znaki (ISO 4217)
- Kursy walut pobierane z NBP (tabela A, kurs średni) przez `get_currency_rate`
- Przeszacowania walut: `CDN.PrzeszacWalutNag` / `CDN.PrzeszacWalutElem`

## Źródła danych
- **Brak dedykowanej tabeli** — waluty inline w `CDN.BnkRachunki.BRa_Waluta (varchar(3))`
- **eSklep**: `CDN.eSklepWaluty`
- **Asocjacja**: `CDN.FormyPlatnWaluty`
- **Przeszacowania**: `CDN.PrzeszacWalutNag`, `CDN.PrzeszacWalutElem`

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| Kod waluty | varchar(3) | ISO 4217 (np. PLN, EUR) |

## Pola i mapowanie API↔MSSQL
- Kod waluty — `list_currencies`, `create_currency`, `get_currency_rate`
- Kurs — `get_currency_rate` (z NBP)
- Data kursu — `get_currency_rate`
- `BRa_Waluta` (varchar(3)) na `CDN.BnkRachunki` — pole inline, nie FK

## Relacje ontologiczne
- **UZYWANA_PRZEZ_RACHUNEK** (1:N) → `CDN.BnkRachunki.BRa_Waluta` (pole inline)
- **UZYWANA_PRZEZ_FORME_PLATNOSCI** (N:M) → `CDN.FormyPlatnWaluty`
- **UZYWANA_PRZEZ_CENE** (1:N) → `CDN.TwrCeny` [UNKNOWN pole]
- **PRZESZACOWANA** (1:N) → `CDN.PrzeszacWalutNag`

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `list_currencies` | READ — lista walut |
| `create_currency` | WRITE — tworzy walutę |
| `get_currency_rate` | READ — kurs z NBP (tabela A) |

## Pochodzenie wiedzy
- Analiza MSSQL: `INFORMATION_SCHEMA.TABLES` — brak `CDN.Waluty`
- Potwierdzone tabele: `CDN.eSklepWaluty`, `CDN.FormyPlatnWaluty`, `CDN.PrzeszacWalutNag/Elem`
- Endpointy MCP zdefiniowane w KB

## Otwarte problemy
1. Gdzie MCP `create_currency` zapisuje dane? (backing storage nieznany)
2. `list_currencies` — skąd pobiera listę? (hardcoded? NBP?)
3. `CDN.eSklepWaluty` — czy to jest słownik walut dla e-sklepu?
4. Brak tabeli `CDN.Waluty` — czy API OptimaApi ma własny storage poza MSSQL?

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: **BRAK** — waluty inline w `CDN.BnkRachunki.BRa_Waluta`

## Walidacja
- [x] Potwierdzono brak `CDN.Waluty` w INFORMATION_SCHEMA
- [ ] Zweryfikuj `list_currencies` runtime
- [ ] Zbadaj `CDN.eSklepWaluty` strukturę
- [ ] Ustal backing storage dla `create_currency`