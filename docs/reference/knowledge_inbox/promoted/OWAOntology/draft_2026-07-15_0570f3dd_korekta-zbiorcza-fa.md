# Encja: Korekta zbiorcza FA
- draftId: `draft_2026-07-15_0570f3dd_korekta-zbiorcza-fa`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-22T14:41:10.945Z`
- tags: `OWA`, `ontologia`, `optima`, `korekta-zbiorcza-fa`, `wymaga-weryfikacji`
- reviewNote: Bulk approved 33 drafts from dashboard
## Content
# Encja: Korekta zbiorcza FA

## Status weryfikacji
- Status: `wymaga-weryfikacji`
- Poziom pewności: `niski` (tylko wzmianka w KB ComarchOptimaAdditionalFunctions; brak potwierdzenia MSSQL i MCP)
- Identyfikator ontologiczny: `OWAOntology.KorektaZbiorczaFA`
- Aliasy: `KorektaZbiorcza`, `FA`, `CollectiveCorrection`, `BulkCorrection`

## Opis biznesowy
Korekta zbiorcza FA to mechanizm w Comarch Optima umożliwiający masową korektę wielu faktur sprzedaży jedną operacją. Funkcjonalność należy do modułu Funkcji Dodatkowych (Comarch Optima Additional Functions) i nie jest dostępna bezpośrednio w API OptimaMCP. Korekta FA służy do grupowego wystawiania faktur korygujących dla zdefiniowanego zbioru faktur pierwotnych, np. w przypadku zmiany stawki VAT, rabatu retroaktywnego lub błędu systemowego dotyczącego wielu dokumentów.

## Reguły biznesowe
- [HIPOTEZA] Korekta zbiorcza generuje po jednym dokumencie FSKOR dla każdej faktury w zbiorze
- [HIPOTEZA] Operacja jest wykonywana po stronie serwera Optima (aplikacja desktopowa, nie API)
- [HIPOTEZA] Może wymagać uprawnień administratora systemu
- Znajduje się w module "Funkcje Dodatkowe" (ComarchOptimaAdditionalFunctions, KB 6)
- Nazwa pliku w repozytorium KB: `KorektaZbiorczaFA.js`

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Kod funkcji KB | OpenSPG | ComarchOptimaAdditionalFunctions (KB 6) | Potwierdzona | Plik `KorektaZbiorczaFA.js` |
| Dokument korygowany | CDN | TraNag (FS) | Potwierdzona | Faktury sprzedaży |
| Dokument korygujący | CDN | TraNag (FSKOR) | Potwierdzona | Faktury korygujące |
| Definicja typu | CDN | DokDefinicje | Hipotetyczna | Typ dokumentu FSKOR |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK (korekta) | TrN_TrNID | Identyfikator dokumentu korygującego (FSKOR) | Potwierdzony |
| FK | TrN_Korekta | Flaga: 1 = dokument korygujący | Potwierdzony |
| FK | TrN_DDfId | FK do definicji typu FSKOR | Hipotetyczny |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Status |
|---|---|---|---|---|---|
| koryguje | KorektaZbiorczaFA | FakturaSprzedazy | 1:N | Agregacja | Hipotetyczna |
| generuje | KorektaZbiorczaFA | FakturaKorygujacaSprzedazy | 1:N | Generowanie | Hipotetyczna |

## Endpointy OptimaMCP
- **Brak bezpośredniego narzędzia MCP.** Funkcjonalność nie jest dostępna przez OptimaMCP — jest to funkcja dodatkowa (KB 6) wykonywana lokalnie w aplikacji Comarch Optima.

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| OpenSPG KB 6 | ComarchOptimaAdditionalFunctions | KorektaZbiorczaFA.js | Kod funkcji dodatkowej |
| AGENTS.md | /docker/openspg | AGENTS.md (linia o KB 6) | Wzmianka o pliku |
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.TraNag | Struktura FSKOR |
| Wiedza domenowa | Analityk | Optima ERP | Funkcje dodatkowe |

## Otwarte problemy i konflikty
- [WYMAGA WERYFIKACJI MSSQL] Czy korekta zbiorcza ma własną tabelę/metadane w MSSQL, czy jest tylko funkcją UI?
- [WYMAGA WERYFIKACJI] Zakres działania — czy FA koryguje tylko FS, czy również FZ i inne typy dokumentów?
- [WYMAGA WERYFIKACJI] Czy wynik korekty zbiorczej pozostawia ślad w `CDN.TraNag` (np. pole `TrN_KorektaZbiorcza`)?
- [UNKNOWN] Czy korekta zbiorcza FA może być wywołana przez API? Czy wymaga interaktywnej sesji Optima?
- [UNKNOWN] Jaki jest format pliku `KorektaZbiorczaFA.js` w KB 6? (skrypt, definicja czy dokumentacja?)

## Walidacja
- [x] Istnienie pliku w KB 6 potwierdzone (AGENTS.md)
- [ ] Struktura FSKOR w MSSQL (TraNag z TrN_Korekta=1) — do potwierdzenia
- [ ] Test z danymi — wykonanie korekty zbiorczej na CDN_TEST
- [ ] Analiza kodu `KorektaZbiorczaFA.js`
- [ ] Potwierdzenie dostępności przez API
