# OpenSPG — rekomendacje triage kolejek, 13.10.2026

## Wniosek

**Najpierw zalecany jest przegląd jakości i pochodzenia treści, następnie weryfikacja źródeł prawnych oraz porównanie duplikatów.** Sam backlog i zerowa liczba nowych draftów nie dowodzą awarii automatyzacji.

Oceniono metadane **95/95 kandydatów Legal ze statusem `CANDIDATE_ONLY` i 113/113 draftów `pending`**. Przeczytano rzeczywistą lokalną treść **10 priorytetowych draftów**. Ustalono **19 grup powtórzonych URL, obejmujących 40 rekordów**, oraz 7 dodatkowych grup powiązanych identyfikatorem dokumentu. Każdy z 208 rekordów ma osobną rekomendację i uzasadnienie w [companion JSON](ERP_KB_Queue_Recommendations_2026-10-13.json).

**Wszystkie rekomendacje są wstępne.** Odczyt lokalnego draftu potwierdza, co zapisano w draftcie; nie potwierdza zgodności z oryginałem ani aktualnej ważności prawa. W tej sesji nie zweryfikowano zewnętrznie żadnego aktu, interpretacji, PDF ani strony produktowej. Nie wydano decyzji o akceptacji, odrzuceniu ani promocji.

## Zakres i dowody

- Discovery: wspierany **GET `http://10.10.254.42:3410/panel/api/discovery`**. Filtr: `kbNamespace=TaxbellLegalReference` i `status=CANDIDATE_ONLY`. Wynik: 95 rekordów, zgodny z `report.byKb.pending`.
- Inbox: bezpośredni import **`listInboxDrafts()` z `scripts/lib/promoted_knowledge.mjs`**, filtr `status=pending`. Wynik: 113. Ta funkcja zwraca metadane, nie `content`; treść przeczytano osobno narzędziem `read` pod `rawJsonPath`.
- Dla 5 JSON z długą linią `content` odczytano również odpowiadające pliki `.md`, aby przeczytać całą zapisaną treść mimo limitu długości linii narzędzia.
- Nie użyto `manage_knowledge_inbox.mjs list`. Dane API analizowano bez polegania na uciętym stdout dużej odpowiedzi.
- Na zakończenie porównano zbiory ID raportu z ponownym GET discovery i ponownym `listInboxDrafts()`: **95 i 113 unikalnych ID, brak brakujących i nadmiarowych ID, poprawne namespace**.
- Pełny przegląd innych namespace discovery nie był zakresem zadania. Ich liczebność poniżej jest odczytem zbiorczego raportu API, nie dowodem per-ID triage.

### Rozróżnienie poziomów dowodu

1. **Metadane**: tytuł, URL, namespace, status, data i rozmiar materiału w discovery. To podstawa wstępnej selekcji; sugestia pustej treści, projektu czy niewłaściwego routingu wymaga dalszych dowodów.
2. **Lokalna treść**: ręcznie przeczytany `content` 10 draftów. Poniższe defekty są potwierdzone w zapisanych materiałach, niezależnie od odziedziczonej oceny AI.
3. **Fakty zweryfikowane w źródle pierwotnym**: nie uzyskano w tej sesji. Oznaczenie `official`, domena urzędowa i wysoki `confidence` nie zastępują tego poziomu.

## Monitoring i brak nowych draftów

Koordynator potwierdził stan przez GET `/panel/api/automation`, `/panel/api/automation/alerts` i `/panel/api/automation/autopilot`: `enabled=true`, `paused=false`, `publicationApproved=true`, `shadowOnly=true`, `allowedNamespaces=[ComarchCommunityNews]`, LLM `PASS`; brak aktywnych i nowych jobów automatyzacji od `2026-10-12T12:39Z`, brak alertów i freeze. Zachowano throttle `spolecznosc.comarch.pl` z boost `0.02`. Końcowy ponowny GET automation potwierdził ten sam stan. Jest to kontrola bieżąca, nie ciągły monitoring ani potwierdzenie udanej publikacji.

GET discovery potwierdził następujące ostatnie przebiegi:

| Start UTC | Rodzaj | Wynik | Rezultaty / nowi kandydaci / drafty |
|---|---|---|---|
| 12.10 16:01:24.866 | autodraft | `ok=true`, błędy `[]` | 0 kandydatów, 0 draftów |
| 12.10 22:02:59.615 | autodraft | `ok=true`, błędy `[]` | 0 kandydatów, 0 draftów |
| 13.10 02:50:19.773 | daily | `ok=true`, `dryRun=true` | 45 rezultatów, 1 nowy kandydat, 0 draftów; 13 duplikatów korpusu, 44 pominięcia |
| 13.10 04:00:51.885 | autodraft | `ok=true`, błędy `[]` | 0 kandydatów, 0 draftów |

Odczyt discovery pokazuje własne ustawienia profili i `semiAutoAllowedNamespaces`; **nie są one tą samą listą co `automation.allowedNamespaces`**. Profil Legal ma `mode=DIRECT_DRAFT`, choć 95 jego rekordów pozostaje `CANDIDATE_ONLY`. Nie należy na tej podstawie wyciągać wniosku, że rekordy są zatwierdzone, że powinny zostać automatycznie opublikowane ani że znaleziono przyczynę braku jobów.

Rekomendacja diagnostyczna: przy kolejnym odczycie prześledzić konkretny rekord Community od discovery do kwalifikacji automation i jego powodów pominięcia. `shadowOnly=true` oraz ograniczony zakres są istotnym kontekstem; **dokładny mechanizm zerowego wyniku pozostaje nieustalony**. Drafty z 13.10 około 02:25 pochodzą z inbox/source-list scan, a zerowy wynik przebiegu discovery nie oznacza braku wszelkiej aktywności ingestii.

## Dokładne liczebności namespace

| Namespace | Discovery pending wg GET | Kandydaci objęci per-ID triage | Inbox pending objęty triage | Przeczytane raw drafty |
|---|---:|---:|---:|---:|
| `ComarchOptimaSchema` | 17 | 0 | 0 | 0 |
| `ComarchOptimaAdditionalFunctions` | 28 | 0 | 1 | 1 |
| `ComarchOptimaSprint` | 27 | 0 | 1 | 0 |
| `ComarchOptimaReference` | 26 | 0 | 1 | 0 |
| `ComarchOptimaPartnerTechnical` | 9 | 0 | 0 | 0 |
| `ComarchBetterflyReference` | 17 | 0 | 4 | 1 |
| `ComarchCommunityNews` | 18 | 0 | 3 | 1 |
| `TaxbellLegalReference` | 95 | 95 | 61 | 3 |
| `TaxbellPayrollHRReference` | 26 | 0 | 4 | 1 |
| `TaxbellAccountingVATReference` | 22 | 0 | 38 | 3 |
| **Razem** | **285** | **95** | **113** | **10** |

Pozostałe namespace obsługiwane przez moduł inbox (`OWAOntology`, `InsERTGTSchema`, `ComarchUniversalKnowledge`) mają **0 pending** w odczytanym zbiorze. GET discovery raportuje 10 skonfigurowanych/objętych profili; zera inbox nie oznaczają kontroli runtime innych KB.

### Rozkład głównych rekomendacji w 208 rekordach

| Rekomendacja | Liczba |
|---|---:|
| Ręczna weryfikacja pełnego źródła | 97 |
| Porównanie duplikatów | 35 |
| Nawigacja / wybór dokumentu szczegółowego | 20 |
| Monitoring projektu, konsultacji lub zapowiedzi | 17 |
| Uzupełnienie materiału | 16 |
| Kontekst historyczny / sprawdzenie okresu | 14 |
| Rozważenie routingu HR | 5 |
| Rozważenie routingu VAT | 1 |
| Wstrzymanie dalszej oceny do wyjaśnienia pochodzenia | 2 |
| Wstrzymanie planowanej publikacji w Optima z powodu ERP XL | 1 |

To rozłączne **główne etykiety triage**, nie decyzje statusowe. Powody przy ID często obejmują kilka problemów, np. duplikat i nawigację albo akt historyczny i niepełną ekstrakcję. Liczba 35 rekordów z główną etykietą duplikatu nie jest tożsama z 40 członkami grup URL.

## Priorytetowa dziesiątka — rzeczywista treść draftów

Kolejność jest priorytetem ręcznego przeglądu według ryzyka zanieczyszczenia wiedzy i znaczenia tematu, **nie kolejnością promocji**. Każdy z poniższych ID ma wpis `contentReviews` w JSON.

### 1. ERP XL w namespace Optima — ryzyko międzyproduktowe

ID: `draft_2026-08-02_19461ae6_xl014-konfiguracja-wydrukow-kodow-kreskowych-baza-wiedzy-comarch-erp-xl-2023`.

Treść wyraźnie mówi o **ERP XL**, plikach XPT i tabeli `cdn.TwrKarty`; URL zawiera `/xl/2023/`. Krótki dowód: „Wydruki kodów kreskowych w programie ERP XL”. To potwierdzona niezgodność z `ComarchOptimaAdditionalFunctions`, a nie tylko podejrzenie na podstawie tytułu.

**Rekomendacja:** wstępnie wstrzymać planowane użycie w Optima; rozpatrzyć odrębny zakres ERP XL. Podobieństwo słów XML/XPT nie dowodzi zgodności produktów. Nie wskazano istniejącego namespace XL jako celu.

### 2. Wątek Community 77145 — niezgodność pochodzenia

ID: `draft_2026-08-02_7b5dd1ca_problemy-z-odbiorem-faktur-z-ksef-spo-ecznosc-erp`.

Zamiast dyskusji o odbiorze faktur zapisano **relacje tabel, nazwy FK i znaczniki `<reference id="chunk:...">`**, np. „Relacje między tabelami”. Nie ma opisu pytania, odpowiedzi ani rozwiązania problemu. To istotne szczególnie w jedynym namespace dopuszczonym według monitoringu automation.

**Rekomendacja:** wyjaśnić pochodzenie ekstrakcji i porównać drugą kopię `draft_2026-08-02_a3442aa7_problemy-z-odbiorem-faktur-z-ksef-spo-ecznosc-erp`. Treści tej drugiej kopii nie przeczytano; nie można przypisać jej identycznego defektu. Nie przenosić tabel do Schema bez potwierdzenia ich źródła.

### 3. CIT — zapis błędu dostępu zamiast informacji podatkowej

ID: `draft_2026-09-11_6329565a_serwis-o-podatkach-informacje-podstawowe-cit-klasyczny`.

Treść opisuje **Incapsula / request unsuccessful**, deklaruje brak możliwości streszczenia danych i sugeruje ponowne szukanie informacji. URL prowadzi do strony głównej MF. To nie jest materiał o CIT mimo tytułu.

**Rekomendacja:** wstępnie wstrzymać ocenę publikacyjną i odnaleźć właściwe źródło. Nie kopiować sugestii generowanych przy błędzie do wiedzy podatkowej.

### 4. DU 2026/846 — niepełny akt Ordynacji

ID: `draft_2026-08-13_00971b26_ustawa-z-dnia-29-maja-2026-r-o-zmianie-ustawy-ordynacja-podatkowa-oraz-niektoryc`.

Zapisano nagłówek Dziennika Ustaw i początek zmian, ale tekst urywa się w **art. 18c**, na „lub mate”. Nie ma przepisów przejściowych ani końcowych. Lokalny fragment nie daje podstaw do potwierdzenia wejścia w życie lub stanu na 13.10.2026.

**Rekomendacja:** uzupełnić pełny akt w dalszej ręcznej analizie; porównać z `candidate_32b1c5c0-fad` i `candidate_53075c4f-d1a`.

### 5. Projekt VAT UC147 — metadane rejestru, nie przepisy

ID: `draft_2026-07-27_0b0c4353_projekt-ustawy-o-zmianie-ustawy-o-podatku-od-towarow-i-us-ug-oraz-niektorych-inn`.

Treść zawiera historię publikacji, tytuły wersji i **urwany JSON rejestru z numerem UC147**. Nie zawiera merytorycznych przepisów projektu. Oficjalna domena i `confidence=0.95` nie usuwają tej luki.

**Rekomendacja:** monitoring projektu i ustalenie dalszej ścieżki legislacyjnej. Brak podstaw do traktowania draftu jako ogłoszonej lub obowiązującej ustawy.

### 6. Broszura JPK_V7(3) — tylko spis treści

ID: `draft_2026-08-21_7f8d34b0_broszura-jpk-vat-z-deklaracja-od-1-lutego-2026`.

Przeczytany zapis obejmuje tytuł, „Warszawa, styczeń 2026 roku” i spis treści z numerami stron. Urywa się przy „Pozycje szczegółowe deklara”. **Nie zawiera opisów pól ani instrukcji wypełnienia**.

**Rekomendacja:** pełna ekstrakcja i analiza odpowiednich rozdziałów w następnym etapie. PDF angielski pod innym URL nie jest automatycznie duplikatem polskiej wersji.

### 7. Znaczniki JPK/KSeF v1.1 — streszczenie zamiast PDF

ID: `draft_2026-09-19_e949f974_jpk-vat-z-deklaracja-stosowanie-znacznikow-v1-1`.

Treść to **angielski `Summary` urwany przy „markers re...”**. `sourceTier=operator_draft` w metadata, mimo linku do urzędowego PDF. Streszczenie podaje wrażliwe reguły korekt, terminów i oznaczeń, których nie sprawdzono w oryginale.

**Rekomendacja:** uzupełnić źródłowy PDF i ręcznie sprawdzić reguły znaczników, wyjątki i wersję. Nie wykorzystywać streszczenia jako dowodu prawnego.

### 8. Październikowy draft zaproszenia na czerwcowe konsultacje

ID: `draft_2026-10-13_eaac4f2f_zapraszamy-na-konsultacje-dotyczace-zmian-w-ksef-ksef-krajowy-system-e-faktur`.

Zapis mówi „**9 czerwca, godz. 10:00**”, o projektowanych zmianach API i zapraszaniu do uwag. Koniec streszczenia jest urwany. Nie potwierdzono roku spotkania ani poprawności ogólnych twierdzeń o obowiązku KSeF zapisanych w streszczeniu.

**Rekomendacja:** oznaczyć w analizie jako konsultacje i sprawdzić datę oryginału oraz wyniki prac. Porównać z `draft_2026-10-08_aab0bb00_serwis-o-podatkach-zapraszamy-na-konsultacje-dotyczace-zmian-w-ksef-03062026`. Data utworzenia draftu nie jest datą zmiany prawa.

### 9. Betterfly — konkretna, ale urwana instrukcja awarii

ID: `draft_2026-09-07_b3d35a78_jak-wystawic-fakture-podczas-niedostepnosci-i-awarii-ksef`.

Zapis obejmuje wybór Offline/Offline24/Awaria, ręczne inicjowanie wysyłki i kody QR. Urwany koniec „Potw” uniemożliwia ocenę kompletności wydruku. Zapis deklaruje aktualizację 24.04.2026; nie potwierdzono jej na stronie producenta.

**Rekomendacja:** uzupełnić instrukcję i porównać z dokumentami trybów oraz wysyłki Betterfly. Nie traktować instrukcji produktu jako samodzielnego dowodu obowiązków ustawowych.

### 10. Minimalne wynagrodzenie — najlepszy kandydat do kontroli pierwotnego aktu

ID: `draft_2026-07-27_02408dee_rozporzadzenie-rady-ministrow-z-dnia-11-wrzesnia-2025-r-w-sprawie-wysokosci-mini`.

Lokalny zapis obejmuje DU 2025/1242, §1–3, kwoty **4806 zł i 31,40 zł** oraz termin 1.01.2026. To treść draftu, **nie ustalenie aktualnego prawa w tej sesji**. Zapis wygląda na krótki, kompletny tekst aktu, ale jego zgodność i późniejsze zmiany wymagają kontroli.

**Rekomendacja:** zweryfikować w źródle pierwotnym, wraz z datami i późniejszymi zmianami; wysoki priorytet praktyczny dla płac.

### Dokładne rawJsonPath przeczytanej dziesiątki

Ścieżki względem `/docker/openspg`; kolejność zgodna z listą powyżej:

1. `downloads/knowledge_inbox/2026-08-02/draft_2026-08-02_19461ae6_xl014-konfiguracja-wydrukow-kodow-kreskowych-baza-wiedzy-comarch-erp-xl-2023.json`
2. `downloads/knowledge_inbox/2026-08-02/draft_2026-08-02_7b5dd1ca_problemy-z-odbiorem-faktur-z-ksef-spo-ecznosc-erp.json`
3. `downloads/knowledge_inbox/2026-09-11/draft_2026-09-11_6329565a_serwis-o-podatkach-informacje-podstawowe-cit-klasyczny.json`
4. `downloads/knowledge_inbox/2026-08-13/draft_2026-08-13_00971b26_ustawa-z-dnia-29-maja-2026-r-o-zmianie-ustawy-ordynacja-podatkowa-oraz-niektoryc.json`
5. `downloads/knowledge_inbox/2026-07-27/draft_2026-07-27_0b0c4353_projekt-ustawy-o-zmianie-ustawy-o-podatku-od-towarow-i-us-ug-oraz-niektorych-inn.json`
6. `downloads/knowledge_inbox/2026-08-21/draft_2026-08-21_7f8d34b0_broszura-jpk-vat-z-deklaracja-od-1-lutego-2026.json`
7. `downloads/knowledge_inbox/2026-09-19/draft_2026-09-19_e949f974_jpk-vat-z-deklaracja-stosowanie-znacznikow-v1-1.json`
8. `downloads/knowledge_inbox/2026-10-13/draft_2026-10-13_eaac4f2f_zapraszamy-na-konsultacje-dotyczace-zmian-w-ksef-ksef-krajowy-system-e-faktur.json`
9. `downloads/knowledge_inbox/2026-09-07/draft_2026-09-07_b3d35a78_jak-wystawic-fakture-podczas-niedostepnosci-i-awarii-ksef.json`
10. `downloads/knowledge_inbox/2026-07-27/draft_2026-07-27_02408dee_rozporzadzenie-rady-ministrow-z-dnia-11-wrzesnia-2025-r-w-sprawie-wysokosci-mini.json`

Dodatkowe odczyty `.md`: pozycje 2, 4, 5, 6 i 9; te same ścieżki z rozszerzeniem `.md`.

## Kandydaci Legal do następnej ręcznej analizy

Wybrane rekordy poza dziesiątką draftów, wskazane na podstawie **metadanych**:

| ID | Dlaczego i co sprawdzić |
|---|---|
| `candidate_72874749-44c` | Oficjalny URL DU 2026/1270, nowelizacja VAT/ewidencji podatników: pełne przepisy i wejście w życie. |
| `candidate_32b1c5c0-fad` | DU 2026/846: pełny akt potrzebny do uzupełnienia urwanego draftu; porównanie mirrorów. |
| `candidate_5168f0b5-9f1` | DU 2026/825: urzędowy dokument zamiast szczątkowego OpenLEX `candidate_7ab69867-08e`. |
| `candidate_6888f3ef-aca` | DU 2026/1037 o wniosku o interpretację ogólną: wzór, daty i relacja do draftu ORD-OG. |
| `candidate_2f991358-9ae` | DU 2026/1045 o wniosku o interpretację indywidualną: wzór i daty stosowania. |
| `candidate_d0f02b01-338` | Podręcznik KSeF cz. II, URL 06082026: porównać z wersją 20260209 w inbox; rozważyć VAT. |
| `candidate_af471cbe-84d` | Wysoki priorytet ryzyka: projekt budżetu i pakiet zmian 2027; brak dowodu ogłoszonej ustawy, tylko monitoring projektu. |
| `candidate_bbc674d1-24f`, `candidate_9ca8862e-c4b` | Dwa URL DU 2026/1245 Kodeks pracy: porównać mirrory, rozważyć HR, sprawdzić późniejsze zmiany. |

Ponadto `candidate_aee16ca5-dcf`, `candidate_ffe9f4e8-6f0` i `candidate_728ef51d-964` dotyczą Kodeksu pracy/ZFŚS/stażu i wstępnie pasują do HR. To tematyczna rekomendacja, nie wykonany rerouting. Akty mogą nadal mieć uzasadnione powiązanie z Legal.

## Duplikaty URL

Metoda: w badanych 208 rekordach usunięto `www.` z hosta i końcowy `/` ścieżki poza root. **Zachowano query, wielkość liter ścieżki i istotne segmenty.** Normalizacja jest heurystyką triage; nie dowodzi równoważności serwerów ani identyczności treści. Strony paginowane lub FAQ z filtrem nie są scalane tylko dlatego, że mają wspólną ścieżkę.

W tabeli użyto unikalnych skrótów ID (fragment hash dla draftu lub pełny candidate ID). **Pełne ID i URL każdego członka są w `duplicateGroups` JSON.** Wszystkie 19 grup zaleca się porównać według pełnej treści, wersji, języka, daty i kompletności; nie wybrano automatycznie reprezentantów.

| Grupa / znormalizowany URL | Członkowie |
|---|---|
| `ksef.podatki.gov.pl/konsultacje` | `candidate_d3dde7f5-317`, draft `2fe49f20` |
| `podatki.gov.pl/interpretacje-podatkowe/objasnienia-podatkowe` | `candidate_b5698d70-1a6`, drafty `f59d624a`, `d01febb7` |
| `podatki.gov.pl/interpretacje-podatkowe` | `candidate_3844fb1c-c7e`, drafty `76114c93`, `29cf6c86` |
| `archiwum.kis.gov.pl/.../interpretacje-indywidualne-i-ogolne` | `candidate_065d36f0-457`, draft `5628e4f7` |
| `podatki.gov.pl/` | `candidate_1c09c1ae-333`, draft `6329565a`; wspólny URL nie oznacza wspólnego materiału CIT |
| `podatki.gov.pl/.../jpk_vat-z-deklaracja/pliki-do-pobrania` | drafty `6d2f0a74`, `7e1c4f08` |
| `podatki.gov.pl/interpretacje-podatkowe/interpretacje-ogolne` | drafty `f2cd33e3`, `b37da064` |
| `podatki.gov.pl/.../informacja-dotyczaca-rozliczenia-podatku-dochodowego-od-osob-prawnych` | drafty `f204a7e2`, `a6cc9926` |
| `podatki.gov.pl/.../rozliczenie-dochodow-opodatkowanych-skala-podatkowa` | drafty `b2cfe41b`, `c48f08c5` |
| `spolecznosc.comarch.pl/question/problemy-z-odbiorem-faktur-z-ksef-77145` | drafty `7b5dd1ca`, `a3442aa7`; tylko pierwszą kopię przeczytano |
| `podatki.gov.pl/media/eqrn3dey/broszura-jpk_vat-z-deklaracj%C4%85-od-1-lutego-2026-r-en.pdf` | drafty `30cf98d7`, `14f733bf`; angielski URL |
| `podatki.gov.pl/podatki-firmowe/pit/informacje-podstawowe` | drafty `f0c3b89a`, `3f561705` |
| `podatki.gov.pl/.../jpk_vat` | drafty `7afd64d0`, `36e555a1` |
| `podatki.gov.pl/interpretacje-podatkowe/najwazniejsze-informacje-o-wniosku` | drafty `6e4f4d38`, `6a616253` |
| `podatki.gov.pl/aktualnosci/rozliczenie-pit-za-2025-rok-od-15-lutego-do-30-kwietnia` | drafty `c745fced`, `db717ab7` |
| `podatki.gov.pl/interpretacje-podatkowe/instrukcje-wypelniania-wnioskow` | drafty `b45053d8`, `60c46c54` |
| `podatki.gov.pl/interpretacje-podatkowe/kreator-wniosku-ord-in` | drafty `8d194ee4`, `35a62b74` |
| `podatki.gov.pl/twoj-e-pit-rozlicz-roczny-pit-online` | drafty `3c17e731`, `1e7f889c` |
| `podatki.gov.pl/.../jpk_vat/aplikacje-do-pobrania` | drafty `37a77c90`, `34506be2` |

### Powiązane dokumenty pod różnymi URL

7 grup w `relatedDocumentGroups` JSON: **DU 2026/846, 825, 1245, 779, 592**, interpretacja **0111-KDIB2-1.4010.387.2026.2.AG**, publikacja INFORLEX **FOB0000000000007641888**. To sygnały tożsamości dokumentu z metadanych, nie zweryfikowane duplikaty treści.

Oddzielnie należy porównać tematycznie: podręczniki KSeF cz. II z datami 20260209/06082026, komunikaty II etapu na dwóch portalach, zaproszenia na konsultacje KSeF oraz komentarze o interpretacjach JST. Podobny temat ani tytuł nie uprawnia do deduplikacji; mogą to być wersje, różne etapy lub odmienne dokumenty.

## Projekty, akty ogłoszone i aktualna ważność

- Projekt UC147, projekty Ordynacji `candidate_76f5c639-3cb` i `candidate_5c6dd096-47e`, budżet 2027 oraz konsultacje KSeF/SMPD: zalecany **monitoring etapu**, z identyfikatorem projektu i datą wersji. Przyjęcie przez rząd, konsultacje lub uchwalenie przez Sejm nie są dowodem ogłoszenia ani wejścia w życie.
- Komentarze o pięcioletniej ważności interpretacji, zwłaszcza `candidate_96efe6f3-662`, `candidate_aeb1cb47-4b7`, `candidate_1a07a2a6-784`, `candidate_5fe0103e-ee0`: nie przenosić nagłówków do twierdzeń o aktualnym prawie bez aktu i przepisów przejściowych.
- URL Dziennika Ustaw/ELI jest mocną wskazówką źródła pierwotnego. Aktualny status konkretnego przepisu wymaga pełnego aktu, terminów, wyjątków, przepisów przejściowych i późniejszych zmian. Sam początek aktu DU 2026/846 tego nie dostarcza.
- Interpretacje indywidualne wymagają sygnatury, oficjalnego tekstu i stanu faktycznego; nie są uniwersalną regułą dla każdego podatnika. Wyrok WSA wymaga sentencji, uzasadnienia i statusu prawomocności.
- Dokumenty z 2023–2025 oraz instrukcje rozliczenia 2024/2025 zaleca się oznaczyć okresem. Wiek dokumentu nie dowodzi nieważności; data draftu nie dowodzi aktualności.

## Materiały puste, szczątkowe i nawigacyjne

Wśród 95 Legal candidates **72 mają dokładnie 1500 znaków `content`**, co wskazuje prawdopodobny limit ekstrakcji, a nie kompletność dokumentu. **10 ma mniej niż 200 znaków**: `candidate_b73f7df2-611`, `candidate_b7a028db-66f`, `candidate_d85eb424-7db`, `candidate_0de4592d-566`, `candidate_ab18c8c6-57e`, `candidate_1cb43464-20b`, `candidate_3b92ed79-9f9`, `candidate_2471d429-93c`, `candidate_5881fc77-7bb`, `candidate_1c09c1ae-333`. Rozmiar jest sygnałem wymagającym sprawdzenia, nie dowodem pustej strony. Nie stwierdzono `contentLength=0` w tym zbiorze.

Indeksy interpretacji/objaśnień, kreator ORD-IN, strony główne MF/INFORLEX/Prawo.pl/KSeF, listy aktualności, aplikacji i plików: **zalecana selekcja konkretnego dokumentu**, zamiast potraktowania portalu lub listy jako materiału normatywnego. Rzeczywisty brak merytorycznej informacji potwierdzono w przeczytanym draftcie CIT/Incapsula; spis treści JPK jest użyteczny nawigacyjnie, lecz nie dostarcza reguł pól.

## Luki i zalecane następne kroki

1. **Pochodzenie i routing:** najpierw wyjaśnić ERP XL w Optima, zawartość Community 77145 i CIT/Incapsula. Potem przeczytać drugą kopię 77145 oraz pozostałe 2 Community drafty pod kątem jakości źródła; z tych dwóch jedna jest kopią, druga dotyczy Betterfly 77295.
2. **Duplikaty:** porównać pełne treści 19 grup URL i 7 grup dokumentów. Wybrać reprezentanta dopiero po ocenie wersji, języka, daty i kompletności; sprawdzić też opublikowany korpus, którego nie objęto tą deduplikacją.
3. **Źródła o wysokim wpływie:** pełne DU 2026/846, 825, 1270, 1037, 1045 oraz DU 2025/1242; pełna broszura JPK i PDF znaczników v1.1. Dla prawa sprawdzić terminy i późniejsze zmiany; dla instrukcji produktowych wersję i pełne kroki.
4. **Projekty:** ustalić UC147 i inne numery projektów, etap RCL/Sejm/Senat, publikację w DU oraz ewentualną końcową wersję objaśnień. Nie zastępować brakującego dowodu nagłówkiem prasowym.
5. **Pozostała treść:** 103 drafty mają wyłącznie triage metadanych. Ich merytoryczny przegląd jest konieczny przed późniejszymi decyzjami publikacyjnymi. Niniejszy raport nie jest oceną poprawności całych 113 materiałów.
6. **Zerowe przebiegi:** w dalszej diagnostyce read-only odczytać powody kwalifikacji/pominięcia konkretnych rekordów, rozróżniając discovery, source-list scan i automation. Nie zmieniać polityk tylko w celu zmniejszenia backlogu.

Jedynymi zapisami tej sesji są niniejszy raport i companion JSON, utworzone przez `apply_patch`. Nie wykonano promocji, odrzuceń, akceptacji, zmian query/allowlist/policy/shadow, cykli ani buildów; nie edytowano runtime, downloads ani exports i nie odczytywano sekretów. Nie wykonano commitu.
