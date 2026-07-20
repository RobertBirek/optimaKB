# Encja: Nieobecność
- draftId: `draft_2026-07-17_827c2fbf_encja-nieobecnosc`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.018Z`
- tags: `OWA`, `ontologia`, `optima`, `nieobecnosc`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Nieobecność

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (pełny schemat potwierdzony przez `mssql_describe_table`)
- Identyfikator ontologiczny: `OWAOntology.Nieobecnosc`
- Aliasy: `PracNieobec`, `Absence`, `Nieobecność`, `Zwolnienie`

## Opis biznesowy
Nieobecność reprezentuje każdy okres nieobecności pracownika (urlop wypoczynkowy, chorobowy, macierzyński, okolicznościowy, bezpłatny itp.). Każda nieobecność należy do pracownika (`PNB_PraId` → `PracKod.PRA_PraId`) i jest sklasyfikowana przez typ nieobecności (`PNB_TnbId` → `TypNieobec`) oraz tytuł ubezpieczeniowy (`PNB_TyuId` → `TytUbezp`). System śledzi daty zwolnienia lekarskiego (`PNB_ZwolnWystawione`, `PNB_ZwolnDostarczone`), wymiar (liczba dni pracy, dni kalendarzowych, godzin) oraz status rozliczenia (`PNB_Rozliczona`). Istnieje hierarchia nieobecności (`PNB_ParentId`) dla kontynuacji zwolnień. Można wskazać zastępcę (`PNB_Zastepca` → `PracKod`).

## Reguły biznesowe
- Każda nieobecność należy do jednego pracownika (`PNB_PraId` → `PracKod.PRA_PraId`, FK CASCADE)
- `PNB_OkresOd` / `PNB_OkresDo` — daty okresu nieobecności
- `PNB_DniPracy` / `PNB_DniKalend` — liczba dni (robocze/kalendarzowe)
- `PNB_Calodzienna` / `PNB_Godz` — nieobecność całodzienna vs godzinowa
- `PNB_WymiarL` / `PNB_WymiarM` — wymiar etatu w chwili nieobecności (licznik/mianownik)
- `PNB_Rozliczona` = 1 gdy nieobecność została rozliczona na liście płac
- `PNB_Seria` + `PNB_Numer` — numer dokumentu (np. zwolnienia lekarskiego)
- `PNB_KodNieobecnosci` (nvarchar(4)) — kod nieobecności (np. "C" dla choroby)
- `PNB_Przyczyna` — kod przyczyny (np. choroba, wypadek w pracy)
- Hierarchia: `PNB_ParentId` dla kontynuacji (np. przedłużenie zwolnienia)
- Zastępca: `PNB_Zastepca` → `PracKod.PRA_PraId`

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Podstawowa | CDN | PracNieobec | **Potwierdzona** | `mssql_describe_table` → PK=PNB_PnbId, 48 kolumn, 0 rekordów |
| Typy nieobecności | CDN | TypNieobec | Potwierdzona | FK PNB_TnbId → TypNieobec |
| Tytuły ubezpieczenia | CDN | TytUbezp | Potwierdzona | FK PNB_TyuId → TytUbezp |
| Rodzina | CDN | Rodzina | Potwierdzona | FK PNB_RdzId → Rodzina |
| Pracownik (zastępca) | CDN | PracKod | Potwierdzona | FK PNB_Zastepca → PracKod |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | PNB_PnbId | Unikalny identyfikator nieobecności (int, IDENTITY) | **Potwierdzony** | MSSQL PK `PNB_Primary` |
| FK | PNB_PraId | Identyfikator pracownika | **Potwierdzony** | MSSQL FK `FK_PNBPraLink` (CASCADE) |
| FK | PNB_TnbId | Identyfikator typu nieobecności | Potwierdzony | MSSQL FK `FK_PNBTnbLink` |
| FK | PNB_TyuId | Identyfikator tytułu ubezpieczenia | Potwierdzony | MSSQL FK `FK_PNBTyuLink` |

## Kluczowe pola PracNieobec
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy |
|---:|---|---|---|---|---|---|---|
| 1 | CDN | PracNieobec | PNB_PnbId | int (IDENTITY) | N | PK | Identyfikator nieobecności |
| 2 | CDN | PracNieobec | PNB_PraId | int | N | FK→PracKod | Identyfikator pracownika |
| 3 | CDN | PracNieobec | PNB_TnbId | int | Y | FK→TypNieobec | Typ nieobecności |
| 4 | CDN | PracNieobec | PNB_TyuId | int | N | FK→TytUbezp | Tytuł ubezpieczenia |
| 5 | CDN | PracNieobec | PNB_OkresOd | datetime | N | | Data rozpoczęcia nieobecności |
| 6 | CDN | PracNieobec | PNB_OkresDo | datetime | N | | Data zakończenia nieobecności |
| 7 | CDN | PracNieobec | PNB_DniPracy | int | N | | Liczba dni roboczych |
| 8 | CDN | PracNieobec | PNB_DniKalend | int | N | | Liczba dni kalendarzowych |
| 9 | CDN | PracNieobec | PNB_Calodzienna | int | N | | Flaga całodziennej nieobecności |
| 10 | CDN | PracNieobec | PNB_KodNieobecnosci | nvarchar(4) | Y | | Kod nieobecności (np. "C", "U") |
| 11 | CDN | PracNieobec | PNB_Rozliczona | tinyint | N | | Status rozliczenia na liście płac |
| 12 | CDN | PracNieobec | PNB_Seria | nvarchar(10) | N | | Seria dokumentu |
| 13 | CDN | PracNieobec | PNB_Numer | nvarchar(20) | N | | Numer dokumentu |
| 14 | CDN | PracNieobec | PNB_Przyczyna | int | N | | Kod przyczyny nieobecności |
| 15 | CDN | PracNieobec | PNB_Zastepca | int | Y | FK→PracKod | Identyfikator pracownika zastępującego |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| nalezydo_pracownika | Nieobecnosc | Pracownik | N:1 | FK | PracNieobec.PNB_PraId = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK FK_PNBPraLink (CASCADE) |
| ma_typ_nieobecnosci | Nieobecnosc | TypNieobecnosci | N:1 | FK | PracNieobec.PNB_TnbId = TypNieobec.TNB_TnbId | **Potwierdzona** | MSSQL FK FK_PNBTnbLink |
| ma_tytul_ubezpieczenia | Nieobecnosc | TytulUbezpieczenia | N:1 | FK | PracNieobec.PNB_TyuId = TytUbezp.TYU_TyuId | **Potwierdzona** | MSSQL FK FK_PNBTyuLink |
| ma_zastepce | Nieobecnosc | Pracownik | N:1 | Referencja | PracNieobec.PNB_Zastepca = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK FK_PNBZastepcaPraLink |
| dotyczy_czlonka_rodziny | Nieobecnosc | Rodzina | N:1 | FK | PracNieobec.PNB_RdzId = Rodzina.RDZ_RdzId | Potwierdzona | MSSQL FK FK_PNBRdzLink |
| jest_kontynuacja | Nieobecnosc | Nieobecnosc | N:1 | Hierarchia | PracNieobec.PNB_ParentId = PracNieobec.PNB_PnbId | Potwierdzona | MSSQL indeks PNBParentId |

## Endpointy OptimaMCP

### Odczyt (READ)
| Narzędzie MCP | Opis | Status |
|---|---|---|
| `list_absence_types` | Lista typów nieobecności | Dostępne |
| `list_absence_card_types` | Typy nieobecności na karcie | Dostępne |
| `list_absence_limits` | Lista limitów nieobecności | Dostępne |

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `add_employee_absence` | Dodaje nieobecność pracownika z walidacją limitu |
| `check_absence_limit` | Sprawdza limit nieobecności |
| `absence_check_limit` | Sprawdza limit nieobecności (drugi endpoint) |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.PracNieobec (48 kolumn) | Pełny schemat tabeli |
| MSSQL (CDN_TEST) | FK constraints | FK_PNBPraLink, FK_PNBTnbLink, FK_PNBTyuLink, FK_PNBZastepcaPraLink, FK_PNBRdzLink | Relacje |
| OptimaMCP | Zestaw narzędzi | list_absence_*, absence_check_limit, add_employee_absence | Odczyt i zapis |

## Otwarte problemy i konflikty
- `PNB_KodNieobecnosci` (nvarchar(4)) — lista kodów do ustalenia
- `PNB_Przyczyna` (int) — słownik przyczyn do rozszyfrowania
- `PNB_Tryb` — niejasne znaczenie
- `PNB_PierwszyDzienChor` — flaga czy liczy się od pierwszego dnia
- `PNB_ZwolnWystawione` vs `PNB_ZwolnDostarczone` — workflow zwolnienia lekarskiego

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona w MSSQL: CDN.PracNieobec (48 kolumn)
- [x] PK potwierdzony: PNB_PnbId (int, IDENTITY)
- [x] FK potwierdzone: FK_PNBPraLink (CASCADE), FK_PNBTnbLink, FK_PNBTyuLink, FK_PNBZastepcaPraLink, FK_PNBRdzLink
- [x] Endpointy MCP READ zidentyfikowane: list_absence_types, list_absence_card_types, list_absence_limits
- [x] Endpointy MCP WRITE zidentyfikowane: add_employee_absence, check_absence_limit, absence_check_limit
- [ ] Endpointy WRITE do przetestowania
- [ ] Kody nieobecności do rozszyfrowania