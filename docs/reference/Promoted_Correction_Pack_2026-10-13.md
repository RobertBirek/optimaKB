# Pakiet propozycji korekt promowanych źródeł — 13 października 2026

**14/14 pełnych ID ma po jednej propozycji następcy.** Payloady zawiera [JSON pakietu](Promoted_Correction_Pack_2026-10-13.json), w `records[].payload`. Każdy payload ma `namespace`, `title`, `sourceUrl`, `content`, `tags` i `metadata`. Streszczenia po polsku mają 1240–2840 znaków. Pakiet pozostaje propozycją do przeglądu; nie utworzono draftów ani ID następników.

Task ID: `Promoted_Correction_Pack_2026-10-13`. Repozytorium `/docker/openspg`, gałąź `main`, commit bazowy `79e376d241322b2debbffb900a68bcf67ae78004`. Zmiany tego zadania: wyłącznie niniejszy raport i JSON, zapisane przez `apply_patch` poza inboxem.

## Dowody i sposób weryfikacji

**POTWIERDZONE** oznacza odczyt źródłowego dowodu lub wynik lokalnej walidacji. **WNIOSEK** oznacza wybór redakcyjny albo konsekwencję ustalonej granicy. **NIEUSTALONE** oznacza brak danych; pakiet nie uzupełnia takich miejsc domysłem.

Wejście:

- [Porównanie priorytetowe: 4 rekordy](Promoted_Source_Comparison_Priority_2026-10-13.md), [JSON](Promoted_Source_Comparison_Priority_2026-10-13.json).
- [Porównanie pozostałych: 10 rekordów](Promoted_Source_Comparison_Remaining_2026-10-13.md), [JSON](Promoted_Source_Comparison_Remaining_2026-10-13.json).

Odczytałem istniejące materiały w `/tmp/opencode`, nie tylko oceny odziedziczone z raportów:

- INFOR: oba kontenery artykułów, ich sekcje i kompletne tabele w dowodzie przeglądu prawa pracy.
- Poradnik: bibliografię, spis, wstęp i merytoryczne fragmenty wszystkich sześciu rozdziałów. Odniesienia stron w JSON wskazują zakres rzeczywistego odczytu. Nie przedstawiam próbkowania jako pełnego audytu każdej szczegółowej tezy książki.
- MRPiPS: pełny komunikat z 24.06.2025, w tym końcowe akapity GUS/CIOP-PIB i linki do materiałów.
- MF: rozwinięty katalog JPK, pełny komunikat struktur i sekcje CIT. Dla wyjątków stawek oraz banków/SKOK odczytałem także `officialAccordionBodies` w oryginalnym roboczym śladzie DOM.
- ZUS: pełne `journal-content-article` z istniejących dowodów JSON, po odkodowaniu tekstu, bez ograniczenia do uciętych podglądów narzędzia.
- Społeczność Comarch: rozwinięte pytanie, odpowiedź i reakcję Betterfly oraz ogłoszenie Optimy z datowanymi komentarzami.
- UC127: pełną kartę, planowane rozwiązania i historię publikacji w `remaining-a939510d-official.txt`.

Nie pobierałem nowych stron ani nie uruchamiałem ekstrakcji lub zewnętrznych wywołań LLM. `sourceRetrievedAt` zachowuje czas wcześniejszego pobrania źródła, nie czas redakcji pakietu. Hashe SHA-256 wskazują bajty istniejących plików dowodowych. Dla zbiorczego śladu DOM metadata podaje hash całego pliku i selektor dokładnego rekordu. Dla HTML/PDF zachowuje hash oryginału oraz dodatkowo hash odczytanego tekstu. Dowody `/tmp/opencode` są tymczasowe; same hashe nie zapewniają ich trwałego przechowania.

## Pokrycie i treść korekt

Pełne ID i literalne URL znajdują się w JSON. Klucze w tabeli służą wyłącznie do nawigacji; nie są identyfikatorami operacji.

| Klucz | Namespace | Proponowany zakres | Daty i zastrzeżenia |
|---|---|---|---|
| `de720ffd` | `TaxbellAccountingVATReference` | Oryginalne streszczenie artykułu JPK/KSeF zamiast obcego schematu CDN; oznaczenia, korekty, kaucje, FP | INFOR, Paweł Huczko, 09.04.2026; osobne konteksty konsultacji i broszury, bez rozstrzygania prawa |
| `bf920a10` | `TaxbellLegalReference` | Bibliografia i tematy wszystkich rozdziałów z numerami stron | Wydanie I/2025, grudzień 2025; modyfikacja PDF/HTTP z lutego 2026 oddzielona od daty wydania |
| `d1c8371c` | `TaxbellPayrollHRReference` | Cały zakres komunikatu: dyrektywa, zespół, GUS, wartościowanie, materiały | 24.06.2025; narzędzia pozostają zapowiedziami |
| `08cfe029` | `TaxbellPayrollHRReference` | Wszystkie cztery sekcje, 14 świąt, miesięczne wartości czasu pracy, urlop i projekty | INFOR, Tomasz Kowalski, 09.02.2025; dane tabel przypisane autorowi, projekty odróżnione od uchwalenia |
| `6b5ac5ed` | `TaxbellAccountingVATReference` | Pięć sekcji katalogu, wersja specyfikacji, środowiska, mocki, broszury i przykłady | Publikacja 15.12.2025, aktualizacja 16.09.2026; JPK_VAT(3) oddzielone od V7M/V7K(3) |
| `dcfc95c2` | `TaxbellAccountingVATReference` | Wzory V7M/V7K, numery CRWDE, oznaczenia i linki zestawień | 19.12.2025 / 29.12.2025; data stosowania przypisana komunikatowi |
| `93f75109` | `TaxbellLegalReference` | Podatnicy, obowiązek, dochód, koszty, zwolnienia, podstawy, warunkowe stawki i zeznania | 15.12.2025 / 24.06.2026; wyjątki i reżim banków/SKOK zachowane jako odrębne, bez bezwarunkowego CIT 9% |
| `0bdb5e10` | `TaxbellPayrollHRReference` | Okno serwisowe, trzy ograniczenia i warunkowe alternatywy mobilne | Komunikat 03.06.2026 o nocy 05–06.06.2026; brak twierdzenia o trwającej awarii |
| `fb53cb2b` | `ComarchCommunityNews` | Pytanie biuro, sugestia Tomasza Bryknera i reakcja | 21–23.03.2026; podziękowanie nie potwierdza przyczyny ani naprawy |
| `f0ede681` | `ComarchCommunityNews` | Siedem zmian wydania 2026.2.1 i przypisane autorom komentarze | 29.01.2026 / 10.02.2026; planowana łatka pozostaje zapowiedzią, obecna wersja nieustalona |
| `7c66353e` | `TaxbellPayrollHRReference` | Nowe okresy stażu, planowane zaświadczenia i odrębność świadectwa pracy | 21.10.2025; brak dopisanych późniejszych formularzy i harmonogramów |
| `a939510d` | `TaxbellPayrollHRReference` | Karta UC127: odpowiedzialni, cel, projektowane obowiązki, raporty, ocena i sankcje | Pierwsza publikacja 25.11.2025; historia wersji 2.0 z 25.05.2026; pusty status nie dowodzi uchwalenia |
| `9c43b46e` | `TaxbellPayrollHRReference` | Archiwalna waloryzacja, kwoty, wskaźniki i daty odniesienia | 07.06.2023; wskaźniki 114,40% i 109,20% nie są wartościami 2026 |
| `4ce9f131` | `TaxbellPayrollHRReference` | Płatnik świadczenia, kanały i podpisy, przekazanie, załączniki, termin i przytoczone ustawy | 01.07.2026; zwykły e-mail do płatnika nie oznacza dopuszczalności w każdym kanale do ZUS |

Rozkład: Accounting/VAT **3**, Legal **2**, Payroll/HR **7**, Community **2**. Jedna propozycja na każdy stary pełny ID, bez partycjonowania książki na dodatkowe drafty.

### Dwa rekordy z prefiksami i książka

**WNIOSEK:** dla `d1c8371c` oraz `08cfe029` stosuję pełne kontekstowe streszczenie zweryfikowanego źródła. Nie zachowuję komentarza o przetwarzaniu przez model ani uciętej końcówki. Treść obejmuje także sekcje pominięte w dawnych rekordach; porównanie wad pozostaje w raporcie, poza payloadem źródłowym.

Dla `bf920a10` zachowuję autorstwo zbiorowe MDDP, redaktora Artura Borkowskiego, INFOR PL SA, wydanie, ISBN i page-addressable opis. Strony 5–6, 7–56, 57–85, 86–104, 105–117, 118–125 oraz 126–128 odpowiadają wstępowi i wszystkim rozdziałom; strony 129–130 zawierają wykaz autorów. Pakiet nie reprodukuje książki, nie udaje pełnej transkrypcji i nie obcina jej do pierwszych 50000 znaków.

Streszczenia INFOR i książki zawierają autorskie sformułowania. Nie użyłem cytowanych zdań tych źródeł. Zachowałem nazwiska, identyfikatory, bibliografię i linki. Pomocnicza kontrola najdłuższego identycznego fragmentu po usunięciu URL i normalizacji whitespace dała **43 znaki** dla artykułu JPK, **31** dla książki i **34** dla przeglądu prawa pracy. To kontrola długich dosłownych zapożyczeń, nie obliczenie sumy przypadkowo wspólnych słów. Teksty urzędowe i Community również mają postać streszczeń.

### Uzupełnienie ustalenia UC127

**POTWIERDZONE:** dowód `remaining-a939510d-official.txt`, linie 187–192, zawiera historię z wersją 2.0 i datą **25.05.2026 09:49**. Raport porównania pozostałych rekordów pozostawiał datę ostatniej zmiany jako NIEUSTALONE. Pakiet wykorzystuje bezpośredni dowód: `sourceUpdatedAt=2026-05-25T09:49`, z opisem, że jest to data wersji w historii. Nie przypisuje jej strefy UTC i nie twierdzi, że wyklucza późniejsze niewidoczne zmiany. Pole statusu realizacji nadal jest puste. Nie sprawdzono uchwalenia ani różnic między wersjami karty.

## Metadata i granice użycia

Każdy payload zapisuje:

- `supersedesDraftId`: dokładny stary ID, bez tworzenia nowego;
- `sourceRetrievedAt`, znaną datę publikacji i znaną datę aktualizacji; nieznanych dat aktualizacji nie dopisuję;
- `verificationScope=source_fidelity_only`, `representation=verified_summary`, `historical=true`;
- `originalSourceEvidence.path/sha256`, selektor dla dowodu zbiorczego oraz dodatkowe `reviewedEvidence`, gdy dotyczy;
- `unverifiedSections`: ograniczenia właściwe dla danego źródła;
- `discoveredVia=source_correction_review`.

`historical=true` oznacza datowany materiał lub migawkę, bez certyfikacji dzisiejszych obowiązków. Metadata nie zawiera `discoveredVia=source_list`. **To nie jest blokada automatyzacji:** istniejący submit może uruchomić automation również przy tej wartości. JSON nie jest bezpośrednim żądaniem MCP/HTTP: pole `namespace` wymaga przyszłego mapowania do kontraktu API, a MCP nie przyjmuje przedstawionej proweniencji jako metadata. Nie wywołano submit ani innych ścieżek zapisu.

**NIEUSTALONE:** bajty historycznych źródeł z dnia promocji, aktualna moc prawna, późniejsze losy projektów i poprawek, zawartość nieodczytanych załączników, wizualna poprawność wszystkich glifów PDF, nowe ID następników oraz przyszłe projekcje. Ograniczenia zakresu streszczenia nie są twierdzeniem, że dane podrozdziały książki lub wyjątki CIT są niedostępne.

## Granica korekty i dokładne blokery

Powiązania do inwentarza i kontraktu:

- [Mapa pochodnych rekordów](Promoted_Derived_Record_Map_2026-10-13.md), [dokładne ID w JSON](Promoted_Derived_Record_Map_2026-10-13.json).
- [Granica grafu po odczycie live](Promoted_Live_Graph_Boundary_2026-10-13.md), [dokładne ID, ownership i fingerprinty](Promoted_Live_Graph_Boundary_2026-10-13.json).
- [Dostępne ścieżki zapisu i ich ograniczenia](Promoted_Correction_Write_Path_2026-10-13.md).

**POTWIERDZONE w raportach wejściowych; bez nowego odczytu grafu tutaj:** obecna projekcja ma 11 własnych dokumentów i 19 własnych chunków. Raport live dodaje 3 historyczne własne dokumenty oraz 7 historycznych własnych chunków. Górna granica własnego inwentarza wynosi **40 obiektów**. Do zachowania w zakresie współdzielonym należą **3 dokumenty kanoniczne + 19 innych bieżących chunków + 11 historycznych zewnętrznych chunków = 33 obiekty**. Agregaty i pozostały korpus także nie stają się własnością tych draftów. Dla `6b5ac5ed`, `dcfc95c2` i `93f75109` poprawa własnych chunków nie poprawia automatycznie kanonicznego summary/description.

Dokładne blokery dalszej operacji:

1. **Brak endpointu aktualizacji treści z archiwizacją pod tym samym ID** (`no_same_id_archival_update_endpoint`). Reopen archiwizuje promoted, ale pozostawia raw; force-promote odtwarza raw i nie przyjmuje nowej treści. Nie ma wspieranego etapu revise/update-content w CLI/HTTP/MCP.
2. **Jawny signoff operatora przed usuwaniem** (`explicit_signoff_required_before_deletion`). Potrzebna jest zgoda na dokładne pełne ID i zakres operacji. Inwentarz 40 obiektów nie jest zatwierdzoną listą usunięcia. Podmiana treści i UPSERT nie stanowią takiej zgody.
3. **Brak per-submit hold** (`no_per_submit_automation_hold`). `silent:true` wycisza stdout, nie zatrzymuje automatyzacji. Marker korekty nie daje gwarancji wstrzymania już uruchomionych ani przyszłych zadań.
4. **Brak atomowej sukcesji i uzgodnienia grafu** (`supersession_and_graph_reconciliation_not_atomic`). Marker poprzednika nie jest egzekwowaną relacją lifecycle. Force/UPSERT nie usuwa pominiętych historycznych lub końcowych ID. Przyszła operacja wymaga mapy old→new oraz osobnego, zatwierdzonego uzgodnienia i readbacku.

Nie wyznaczam nowych ID pochodnych: żaden następca nie istnieje, a exporter nie został uruchomiony. Zakres dotyczy przeglądu payloadów, nie wycofania czternastu źródeł ani usunięcia całej współdzielonej zależności.

## Walidacja

**POTWIERDZONE, lokalna kontrola proposal-only:**

- `npm run check`: PASS, składnia, bez wywołań testów live.
- Walidator pakietu: dokładnie 14 unikalnych pełnych ID, jeden payload na ID; zgodność literalnych URL i namespace z oboma wejściami oraz mapą pochodnych.
- Każdy `content` jest niepusty, ma 800–3500 znaków UTF-16 i mniej niż 50000, sekcje oraz domknięte zdanie. Tytuły i tagi mieszczą się w opisanych limitach. Brak NUL, obciętych końcówek, shellu źródłowego, odmów modelu i opakowania discovery.
- Metadata: poprawna sukcesja, scope/representation, daty pobrania, historyczność, marker review; hashe każdego wskazanego pliku dowodowego zgodne z bajtami.
- `loadPromotedKnowledge(namespace)` i `findRawDraftById(fullId)`: **28/28 hashów pełnego content UTF-8 bez zmian** względem odczytu przed zapisem raportów; raw=promoted dla 14 ID. To hashe treści, nie deklaracja grafowego `bodyHash`.
- Hash rejestru bez zmian: `c59950a0a52a8c5f6ccfc04c041b4e40ac50f3b30e2f8e631680974cf5059e67`.
- Walidacja mapy modułów i kontrola whitespace raportów: PASS.

Pierwsza pomocnicza próba importu loaderów miała błędną nazwę `getDraft` i zakończyła się błędem przed wykonaniem odczytów. Następne kontrole użyły istniejących eksportów `loadPromotedKnowledge` oraz `findRawDraftById` i przeszły. Nie zmieniano kodu, aby rozwiązać ten błąd polecenia.

Nie wykonywano submission, status/candidate updates, grafowych zapisów, eksportów, buildów, restartów, testów integracyjnych ani commitów. Istniejące zmiany użytkownika pozostały zachowane. Następny krok: przegląd redakcyjny 14 propozycji; wdrożenie wymaga odrębnego upoważnienia i rozwiązania wskazanych blokerów.

### Handoff

```yaml
task_id: Promoted_Correction_Pack_2026-10-13
agent: OpenCode
host: local linux workspace host
repository: /docker/openspg
base_branch: main
base_commit: 79e376d241322b2debbffb900a68bcf67ae78004
result_commit: uncommitted
changed_files:
  - docs/reference/Promoted_Correction_Pack_2026-10-13.md
  - docs/reference/Promoted_Correction_Pack_2026-10-13.json
skills_used: [codex-delegation, stop-slop, verification-before-completion]
commands_run:
  - git status --short; branch and SHA reads
  - npm run check
  - read-only Node loader/hash/identity/evidence/content validators
  - sha256sum of cited evidence
  - Python non-URL verbatim-run check
  - python3 scripts/validate-module-map.py
  - git diff --check for the two report paths
validation:
  passed: [14 exact proposals, input/map identity, payload limits, source evidence hashes, 28 unchanged loader content hashes, registry hash, syntax, module map, report whitespace]
  failed: []
  not_run: [submission, status mutation, graph writes, export, build, runtime tests, legal validity certification]
confirmed_findings: [14 source-based summaries, UC127 visible version date, original drafts unchanged]
inferences: [proposals require review and a separate controlled correction path]
hypotheses: []
risks: [temporary evidence availability, automatic submission triggers, stale historical graph objects, shared-source scope]
approval_required: [separate authorization for execution, explicit exact-ID signoff before deletion]
recommended_next_action: Review the 14 payloads and resolve write-path blockers before any submission or reconciliation.
```
