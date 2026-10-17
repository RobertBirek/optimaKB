# SemanticKB / OWA — holdout 20 nowych pytań, 2026-10-16

## Wynik: 4 PASS / 5 PARTIAL / 11 MISS

Wszystkie **20/20 wywołań narzędzi zakończyło się poprawnie**. Problemem nie jest transport, lecz użyteczność odpowiedzi na nowe pytania. Wynik nie potwierdza gotowości do szerokiej obsługi naturalnego języka, mimo wcześniejszego **12/12 PASS** na utrwalonym zestawie.

To nowy, trudniejszy zestaw, **nie regresja dowiedziona na tych samych pytaniach**. Nie zmieniano kodu ani źródeł podczas testu i nie dopasowywano pytań po zobaczeniu wyników.

## Metoda

- Przed pierwszym ocenianym wywołaniem zapisano wszystkie pytania, oczekiwane fakty i kryteria w `OWA_SemanticKB_Holdout20Q_2026-10-16.json`.
- SHA-256 zamrożonego pliku: **`3ae42d67cba40608c84ce4f5ffad77ed5f7553fe1979a586e0b108904a79f936`**.
- Kod: commit `a0f29559512ac88af68ac3df4cc4a81e70b30c54`.
- Narzędzia: rzeczywiste podłączone `erp_concept.search`, `erp_entity.get`, `erp_relation.list`, `erp_process.explain`; `as_of=2026-10-16`, `limit=5`, korelacja `owa-holdout20-20261016-HNN`.
- Przebieg: **07:37:18.167–07:41:38.211 UTC**, minimum/maksimum czasu wszystkich 20 stanów narzędzi. Jedno oceniane wywołanie na pytanie, bez ponowień.
- Przed wywołaniami odczytano dziesięć materiałów o cenach, jednostkach, płatnościach, rozrachunkach, kompensacie, trzech korektach, MM i RKUR. Ich ścieżki są w zamrożonym pliku, a hashe w archiwum.
- To **holdout dobrany na podstawie źródeł**, nie losowa próbka ani niezależna certyfikacja prawdziwości dokumentacji. Ocena jest ręczną oceną asystenta, bez zewnętrznego audytora.
- PASS wymaga odpowiedzi na istotne części pytania z przypisywalnymi źródłami; PARTIAL oznacza użyteczny fragment z istotną luką. Ogólne ostrzeżenie o niepewności nie zastępuje konkretnej odpowiedzi UNKNOWN. Sam brak zmyślonego enum nie wystarcza.
- Oceniono pełną widoczną odpowiedź. Powtórzenie pytania, punktacja wyszukiwania, flagi pokrycia i sama obecność informacji w niewidocznym JSON nie dają punktów.

Wszystkie odpowiedzi deklarują lokalne artefakty, bez wykonania grafu. Nie jest to świeża kontrola MSSQL, ERP, capabilities API ani aktualnego prawa. Parametr `as_of` nie dowodzi filtrowania historycznego.

## Wyniki szczegółowe

| ID | Temat nowego pytania | Ocena | Najważniejsza obserwacja |
|---|---|---|---|
| H01 | Warianty cen i ich unikalność, pytanie naturalne | MISS | KPI i zestawy promocyjne zamiast tożsamości wariantu ceny. |
| H02 | Cena: PK, powiązanie z towarem i CASCADE | PARTIAL | Relacja, CASCADE i częściowa weryfikacja są; brak PK ceny `TwC_TwCID`. |
| H03 | Jednostka pomocnicza: złożony PK i przelicznik | PASS | Pełny czteroelementowy klucz, `TwJ_JmZ`, `TwJ_PrzeliczM/L` i źródło. |
| H04 | Jednostka–towar: związek logiczny a formalny FK | PARTIAL | Jest relacja logiczna z materiału o towarze; brak kluczowego zastrzeżenia źródła jednostek o braku formalnego FK. |
| H05 | Płatność a rozrachunek | PARTIAL | Pomocne Payment–Settlement z O2C; brak pełnego odróżnienia należności/zobowiązania jako Rozrachunku. |
| H06 | Płatność: kierunki i ograniczenia kwot | PASS | Wszystkie trzy kierunki oraz właściwe ograniczenia kwot są widoczne. |
| H07 | Kwota początkowa, rozliczona i waluta systemowa | PARTIAL | Są `BZd_Kwota/KwotaRoz`; brakuje pary `KwotaSys/KwotaRozSys` i pełnego mapowania. |
| H08 | Niepotwierdzony PK rozrachunku | MISS | Brak konkretnego odczytania źródłowego UNKNOWN; jedynie „pole niepokazane” i obce fragmenty. |
| H09 | Kompensata bez przelewu | MISS | Brak wyjaśnienia potrącenia przeciwnych rozrachunków bez ruchu pieniędzy. |
| H10 | Nagłówek/elementy kompensaty i dekret | PASS | Pełna tabela z 1:N i 1:1 przez `KPN_DekID`; diagnostyka pokrycia mimo tego zgłasza braki. |
| H11 | Korekta sprzedaży: osobny dokument, plus/minus | PARTIAL | O2C potwierdza brak edycji oryginału; brak ilości/cen oraz in plus/in minus. |
| H12 | Różnica tworzenia korekty zakupu i sprzedaży | MISS | Ogólne materiały o fakturach i KSeF zamiast porównania i statusu testów WRITE. |
| H13 | PZ → PZKOR i przeciwny ruch zapasu | MISS | Pusta odpowiedź merytoryczna mimo dostępnej dokumentacji tej ścieżki. |
| H14 | Naturalny opis przesunięcia między magazynami | MISS | Brak skutku źródło/cel/suma i informacji o braku kontrahenta zewnętrznego. |
| H15 | MM a zwrot do dostawcy | MISS | Nie wyjaśnia żadnej z dwóch żądanych części porównania. |
| H16 | Sprzeczność automatycznego/ręcznego RKUR | MISS | Nie odnajduje źródła ani konkretnej sprzeczności; ogólny disclaimer nie wystarcza. |
| H17 | Nieznany enum `TwC_Typ` | MISS | Nie zmyśla liczb, lecz nie komunikuje źródłowego braku słownika. |
| H18 | Nieznany enum `TwJ_TypJm` | MISS | Fragmenty o innych typach i tabelach zamiast konkretnego UNKNOWN. |
| H19 | Niejednoznaczne „zamknij nierozliczony dokument” | MISS | Brak rzeczywistego doprecyzowania operacji/osi stanu; nie ogłoszono wykonania. |
| H20 | Fikcyjna kwalifikowana tożsamość procesu | PASS | Poprawna, konkretna odmowa zastąpienia innym procesem, bez twierdzenia o nieistnieniu w całym ERP. |

Dokładne zapytania, oczekiwania, uzasadnienia ocen i wybrane locatory są w plikach JSON. Pełne odpowiedzi są zachowane osobno, a nie odtworzone z tej tabeli.

## Co ujawnił test

### 1. Największa luka: zakres wyszukiwania przy naturalnym pytaniu

**12/20 odpowiedzi trafiło wyłącznie do Business Semantics** i nie uzyskało PASS: 0 PASS / 3 PARTIAL / 9 MISS. Osiem odpowiedzi korzystających z prezentacji OWA uzyskało 4 PASS / 2 PARTIAL / 2 MISS.

Sześć pytań zawierało jawne OWA lub kwalifikowaną tożsamość OWA: 2/2/2. Pozostałe czternaście: 2/3/9. To opis wyników na różnych tematach, **nie eksperyment dowodzący, że dodanie słowa OWA naprawi konkretną odpowiedź**. Nawet jawny kontekst nie zapewnił pełnego wyniku H02/H04/H08/H13.

### 2. Sam poprawny routing nie rozwiązuje wyboru faktów

- H02: pokazano PK towaru, ale nie żądany PK ceny. Powiązana encja i jej sekcje zajmują budżet.
- H04: nie trafia do najważniejszego zastrzeżenia o formalnym FK; pojawiają się niezamówione wymagania workflow.
- H08: nierozpoznana własność pola sprawia, że dostępne źródłowe UNKNOWN zostaje zastąpione ogólnym „nie pokazano pola”.
- H13: dokumentowana ścieżka korekty nie zostaje wykorzystana. To pozytywne pytanie z istniejącym źródłem, nie test poprawnej odmowy.

### 3. Pokrycie nie jest oceną prawdziwości ani kompletności

H10 ma kompletne żądane fakty w widocznej tabeli, dlatego otrzymało PASS, choć diagnostyka zgłasza brak relacji/kardynalności. H03 i H06 również pokazują, że stan flag nie zastępuje przeczytania odpowiedzi.

Odwrotnie, brak zmyślonych kodów w H17/H18 nie stanowi poprawnej odpowiedzi, jeśli nie podano źródłowego powodu niewiedzy. Zachowanie ostrożności działa lepiej dla dokładnej nieistniejącej tożsamości H20 niż dla znanego pola z nieznanym słownikiem.

### 4. Zauważona niespójność korpusu, poza punktacją pytania

W H06 wypisano `list_payments` jako READ w tabeli dokumentu, a w `workflow_pattern.csv` jako WRITE / WRITE_NOT_CALLED. H06 pytało o kierunki/kwoty i zawierało poprawne fakty w tym zakresie, więc nadal jest PASS. Ta niespójność wymaga osobnej weryfikacji materiału; nie wykonano żadnej operacji ERP ani kontroli aktualnego endpointu.

## Rekomendacja

**Nie rozszerzać jeszcze użycia jako ogólnego asystenta naturalnojęzykowego.** Najpierw ograniczona poprawka warstwy SemanticKB:

1. Uwzględniać intencję narzędzia oraz dostępne encje/pola/procesy przy wyborze zakresu; nie wymagać technicznych słów w każdym pytaniu.
2. Rozróżniać główny przedmiot pytania od powiązanej encji i chronić żądane fakty przed wypieraniem przez poboczne sekcje.
3. Zachować rozpoznawanie korekt i kierunku procesu oraz konkretne źródłowe UNKNOWN i konflikty.
4. Uzgodnić diagnostykę pokrycia z faktycznie widocznymi dowodami.

Te 20 pytań można teraz zachować jako zestaw regresji. Po ewentualnej poprawce potrzebny będzie **kolejny nowy holdout**, aby nie pomylić naprawy znanych pytań z uogólnianiem. Wyniki nie uzasadniają same w sobie ponownego eksportu/rebuildu ani dodania nowych funkcji.

## Trwałe dowody i zakres wykonania

- Pytania: `docs/reference/OWA_SemanticKB_Holdout20Q_2026-10-16.json` — zamrożony plik zachowany bez zmian.
- Oceny: `docs/reference/OWA_SemanticKB_Holdout20Q_Results_2026-10-16.json`.
- Archiwum: `backups/manual-repairs/owa-holdout20-20261016/` — **42 pliki danych + manifest, łącznie 43**: pełne H01–H20 Markdown i bezpieczne JSON stanów narzędzi, oryginalny plik pytań i hashe źródeł.
- Manifest SHA-256: **`99c4ebf89d0a69d5aa7d4e4df082afd991ee59a6bed79f9a5f653d117908c506`**.
- To kompletne rzeczywiste wyjścia podłączonych narzędzi z bieżącej sesji, nie ponowne wywołania HTTP, streszczenia ani surowe koperty HTTP. Żadnych danych uwierzytelniających nie kopiowano. Prywatne tryby i odczyt `mcpbot` potwierdzone.
- Hashe źródeł zapisano po ocenianych wywołaniach; nie są niezależnym poświadczeniem kodu i plików procesu backendu w każdej chwili testu.

Zapisano raporty i dowody. Nie zmieniano kodu, routingu, korpusu, registry, eksportów, grafu, polityk ani usług; nie wykonywano operacji ERP. Zwykła telemetria narzędzi jest dopuszczalna. **Bez commitu i push.**
