# Encja: Deklaracja ZUS
- draftId: `draft_2026-07-17_21aaf737_encja-deklaracja-zus`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.755Z`
- tags: `OWA`, `ontologia`, `optima`, `deklaracja-zus`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Deklaracja ZUS

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (współdzieli strukturę z Deklaracją PIT — wszystkie tabele potwierdzone)
- Identyfikator ontologiczny: `OWAOntology.DeklaracjaZUS`
- Aliasy: `DeklZUS`, `ZUS DRA`, `ZUS RCA`, `ZUS RSA`, `DeklNag`

## Opis biznesowy
Deklaracja ZUS reprezentuje deklarację ubezpieczeniową składaną do Zakładu Ubezpieczeń Społecznych. W Comarch Optima deklaracje ZUS współdzielą strukturę nagłówka (`CDN.DeklNag`) i elementów (`CDN.DeklElem`) z deklaracjami PIT — rozróżnienie następuje przez `DkN_TypDeklar`. System obsługuje deklaracje: DRA (deklaracja rozliczeniowa), RCA (raport o składkach), RSA (raport o świadczeniach/przerwach). Tabela `CDN.PozDeklZUS` (59 rekordów) definiuje pozycje specyficzne dla ZUS, zawierające kody nieobecności (`PDZ_KodNieobecnosci`), zwolnienia (`PDZ_Zwolnienie`), kategorię ZUS (`PDZ_KategoriaZUS`) oraz pola dla ubezpieczenia chorobowego i wypadkowego. E-deklaracje ZUS są wysyłane przez system PUE ZUS (szczegóły śledzone w polach `DkN_EDekl_*`).

## Reguły biznesowe
- Współdzielona struktura z deklaracjami PIT — różnicowanie przez `DkN_TypDeklar`
- `DkN_RokMiesiac` — okres deklaracji w formacie RRRRMM
- `DkN_Kwota` — COMPUTED z elementów deklaracji
- `DkN_Zablokowana` — blokada edycji
- `DkN_Finalna` — COMPUTED: czy deklaracja jest ostateczna
- E-deklaracja: śledzenie procesu wysyłki (PUE ZUS)
- Pozycje ZUS definiowane w `PozDeklZUS` (59 rekordów) z kodami specyficznymi dla ZUS
- `PDZ_KategoriaZUS`, `PDZ_UbezpChor`, `PDZ_UbezpWypad` — klasyfikatory specyficzne dla ZUS
- `PDZ_TypRSA` — typ raportu RSA
- `PDZ_KodNieobecnosci` (tinyint) — kod nieobecności dla ZUS

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Nagłówek (współdzielony) | CDN | DeklNag | **Potwierdzona** | `mssql_describe_table` → 51 kolumn, dzielone z PIT |
| Elementy (współdzielone) | CDN | DeklElem | **Potwierdzona** | `mssql_describe_table` → FK→DeklNag (CASCADE) |
| Wiersze tekstowe (współdzielone) | CDN | DeklStr | **Potwierdzona** | `mssql_describe_table` → FK→DeklNag (CASCADE) |
| Pozycje ZUS | CDN | PozDeklZUS | **Potwierdzona** | `mssql_describe_table` → 59 rekordów |
| Typy wypłat | CDN | TypWyplata | Potwierdzona | `mssql_list_tables` (337 rekordów) |
| Elementy ZUS | CDN | — | — | `list_zus_items` w MCP |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK (DeklNag) | DkN_DkNID | Unikalny identyfikator deklaracji (int, IDENTITY) | **Potwierdzony** | MSSQL PK `DkN_Primary` |
| FK | DkN_PraID | Identyfikator pracownika-podatnika | **Potwierdzony** | MSSQL FK FK_DkNPodatnik |
| PK (PozDeklZUS) | PDZ_PdzId | Identyfikator pozycji ZUS (int, IDENTITY) | **Potwierdzony** | MSSQL PK `PDZ_Primary` |

## Kluczowe pola PozDeklZUS
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy |
|---:|---|---|---|---|---|---|---|
| 1 | CDN | PozDeklZUS | PDZ_PdzId | int (IDENTITY) | N | PK | Identyfikator pozycji ZUS |
| 2 | CDN | PozDeklZUS | PDZ_Kod | varchar(254) | N | | Kod pozycji deklaracji |
| 3 | CDN | PozDeklZUS | PDZ_Rodzaj | tinyint | N | | Rodzaj pozycji |
| 4 | CDN | PozDeklZUS | PDZ_Poziom | int | N | | Poziom w hierarchii |
| 5 | CDN | PozDeklZUS | PDZ_Wybieralny | int | N | | Czy pozycja jest wybieralna |
| 6 | CDN | PozDeklZUS | PDZ_Opis | nvarchar(254) | N | | Opis pozycji |
| 7 | CDN | PozDeklZUS | PDZ_KodNieobecnosci | tinyint | N | | Kod nieobecności |
| 8 | CDN | PozDeklZUS | PDZ_Zwolnienie | tinyint | N | | Zwolnienie ze składki |
| 9 | CDN | PozDeklZUS | PDZ_KategoriaZUS | tinyint | N | | Kategoria ZUS |
| 10 | CDN | PozDeklZUS | PDZ_UbezpChor | tinyint | N | | Ubezpieczenie chorobowe |
| 11 | CDN | PozDeklZUS | PDZ_UbezpWypad | tinyint | N | | Ubezpieczenie wypadkowe |
| 12 | CDN | PozDeklZUS | PDZ_TypRSA | tinyint | N | | Typ raportu RSA |
| 13 | CDN | PozDeklZUS | PDZ_ZjeId | nvarchar(128) | N | | ID zasobu językowego |

## Nagłówek deklaracji (współdzielony z PIT)
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | Opis biznesowy |
|---:|---|---|---|---|---|---|
| 1 | CDN | DeklNag | DkN_DkNID | int (IDENTITY) | N | Identyfikator deklaracji |
| 2 | CDN | DeklNag | DkN_TypDeklar | smallint | N | Typ deklaracji (PIT vs ZUS) |
| 3 | CDN | DeklNag | DkN_RokMiesiac | int | N | Okres (RRRRMM) |
| 4 | CDN | DeklNag | DkN_PraID | int | Y | FK→PracKod |
| 5 | CDN | DeklNag | DkN_Kwota | decimal(15,2) | Y | COMPUTED — kwota deklaracji |
| 6 | CDN | DeklNag | DkN_EDekl_RefID | nvarchar(240) | Y | Referencja e-Deklaracji |
| 7 | CDN | DeklNag | DkN_EDekl_Status | int | Y | Status wysyłki |
| 8 | CDN | DeklNag | DkN_EDekl_DataWyslania | datetime | Y | Data wysłania |
| 9 | CDN | DeklNag | DkN_EDekl_DataOdebraniaUPO | datetime | Y | Data UPO |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Status | Dowód |
|---|---|---|---|---|---|---|
| dotyczy_pracownika | DeklaracjaZUS | Pracownik | N:1 | FK (DeklNag) | **Potwierdzona** | FK_DkNPodatnik |
| ma_elementy | DeklaracjaZUS | DeklElem | 1:N | Kompozycja (CASCADE) | **Potwierdzona** | FK_DkEDeklNag |
| ma_wiersze_tekstowe | DeklaracjaZUS | DeklStr | 1:N | Kompozycja (CASCADE) | **Potwierdzona** | FK_DKSDknLink |
| definiowana_przez_pozycje | DeklaracjaZUS | PozDeklZUS | N:M | Definicja | **Potwierdzona** | 59 rekordów słownika |

## Endpointy OptimaMCP

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `declaration_dra` | Generuje deklarację ZUS DRA |
| `declaration_generate` | Generuje deklarację (współdzielone z PIT) |
| `declaration_sign` | Podpisuje deklarację |
| `declaration_send` | Wysyła deklarację |

### Odczyt (READ)
| Narzędzie MCP | Opis |
|---|---|
| `list_zus_items` | Lista elementów deklaracji ZUS |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.DeklNag (51 kolumn) | Nagłówek (współdzielony) |
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.DeklElem (7 kolumn) | Elementy (współdzielone) |
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.PozDeklZUS (59 rekordów) | Definicje pozycji ZUS |
| OptimaMCP | Zestaw narzędzi | declaration_dra, list_zus_items | Endpointy ZUS |

## Otwarte problemy i konflikty
- Deklaracje ZUS i PIT współdzielą tę samą tabelę `DeklNag` — rozróżnienie tylko przez `DkN_TypDeklar`
- `PDZ_KodNieobecnosci` (tinyint) — słownik kodów nieobecności ZUS do rozszyfrowania
- `PDZ_KategoriaZUS` — kategorie ubezpieczeniowe do rozszyfrowania
- Brak osobnego endpointu dla RCA i RSA — być może są one obsługiwane przez `declaration_generate` z odpowiednim typem
- Relacja z `TypWyplata` (337 rekordów) do potwierdzenia

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Nagłówek potwierdzony (współdzielony z PIT): CDN.DeklNag (51 kolumn)
- [x] Elementy potwierdzone (współdzielone z PIT): CDN.DeklElem (7 kolumn)
- [x] Pozycje ZUS potwierdzone: CDN.PozDeklZUS (59 rekordów)
- [x] Endpointy MCP zidentyfikowane: declaration_dra, list_zus_items
- [ ] Endpointy WRITE do przetestowania
- [ ] Kody nieobecności ZUS do rozszyfrowania