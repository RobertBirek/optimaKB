# Poprawa jakości odpowiedzi OWA — projekt

Data: 2026-10-15. Baza kodu: `2a4ef8a13bfa50997a78c59b39632ef050496643`.
Status: zatwierdzony przez użytkownika 2026-10-15; implementacja jeszcze nierozpoczęta.

## Cel i dowody wejściowe

Przywrócić użyteczność odpowiedzi SemanticKB o istniejących encjach, relacjach i procesach OWA. Benchmark `docs/reference/OWA_SemanticKB_12Q_2026-10-15.json` jest zamrożonym baseline: 0 PASS, 4 PARTIAL, 8 MISS. Jego pytania, oczekiwane fakty i kryteria oceny pozostają niezmienione.

Potwierdzono trzy granice problemu: routing potrafi wykluczyć OWA; pełne extracty wymagają URL nieobecnego w lokalnych CSV OWA; ranking i ogólne ostrzeżenie o niepewności nie realizują kontraktu odpowiedzi o konkretnej encji lub braku wiedzy.

Docelowa odpowiedź ma podać żądane informacje wraz z lokalnym źródłem albo jasno określić zakres brakującej wiedzy. Dopasowanie słów nie zmienia statusu twierdzenia na potwierdzony.

## Rozważone podejścia

1. **Rekomendowane: ograniczona poprawka istniejącego asystenta.** Jawny kontekst OWA, tożsamość encji, sekcje/wiersze relacji i lokalne pochodzenie wspierają obecny retrieval. Brak zależności od modelu i możliwość izolowanych testów.
2. **Samo zwiększenie wag routingu.** Najmniejszy diff, ale nie rozwiązuje braku pełnych extractów, obcych relacji w rankingu ani braku właściwej odpowiedzi negatywnej. Niewystarczające.
3. **Nowy generator LLM lub backend grafowy.** Większy zakres i nowe zależności operacyjne; nie jest potrzebny do udostępnienia faktów już obecnych w CSV. Poza tym zadaniem.

## Projekt przepływu

### 1. Kontekst pytania i routing

- Rozpoznać jawne wskazanie ontologii OWA jako intencję nadrzędną wobec ogólnych formuł typu „czym jest”, gdy OWAOntology należy do dozwolonego zakresu.
- Rozpoznawać samodzielne `OWA`, nazwę `OWAOntology` oraz kwalifikowane identyfikatory encji. Nie dopasowywać przypadkowych podciągów zwykłych słów.
- Pozostawić Business Semantics jako dozwolone wsparcie. Nie dodawać namespace wykluczonych przez profil, w tym przy pustym zakresie.
- Zachować zachowanie pytań bez jawnego kontekstu OWA oraz odrębnej intencji release.

### 2. Tożsamość i ranking dowodów

- Tożsamość encji wyprowadzać z obecnych pól eksportu: canonicalName, ontologyId, nazwy, aliasów, ID i referencji encji w relacjach/chunkach. Nie tworzyć mapy odpowiedzi dla numerów pytań benchmarku.
- Oddzielić identyfikację właściciela dokumentu od ogólnej punktacji leksykalnej. Dokładne ID oraz dopasowane nazwy/aliasy mają wyższy priorytet niż wspólne słowa „relacja”, „dokument” czy „źródło”.
- Uwzględniać polskie odmiany wymagane przez realny korpus, bez globalnego dopasowywania dowolnych krótkich rdzeni. Dodatkowe testy parafraz sprawdzą, czy mechanizm nie działa wyłącznie na zapisanych 12 pytaniach.
- Dla relacji rangować wymagane końce i typ relacji, a nie dowolny wiersz zawierający JOIN lub kardynalność. Nie zmieniać FK w relację logiczną ani odwrotnie.
- Dla procesów zachować kierunek kodów dokumentów i cały skutek magazynowy. PZ→FZ oraz WZ→FS nie są zamienne.
- Dla wybranej encji dobierać sekcje odpowiadające żądanym aspektom: identyfikatory, pola, reguły, relacje i otwarte problemy. Relacja między chunkami wymaga zgodnego właściciela źródła; współdzielony temat lub URL nie wystarcza.

### 3. Pełne fragmenty lokalnych źródeł

- Wprowadzić jawne rozróżnienie pochodzenia zewnętrznego URL i pochodzenia lokalnego. URL nie jest wymagany dla lokalnego rekordu o ustalonej tożsamości i locatorze.
- Lokalna cytacja zawiera namespace, względną ścieżkę artefaktu, ID rekordu, zakres fizycznych linii i hash użytych bajtów. Gdy eksport zawiera bezpieczną ścieżkę właściciela, również ją pokazuje. Brak URL pozostaje brakiem URL, nie sztucznym adresem WWW.
- Encja bez sourcePath nadal może być przypisana do konkretnego rekordu CSV i jego linii. Jej relacji z innym dokumentem nie wolno zgadywać.
- W pierwszej kolejności korzystać z danych już odczytanych z dozwolonych artefaktów. Ewentualny resolver lokalnych metadanych musi mieć jawną listę dopuszczalnych katalogów, kontrolę containment/symlinków, limit rozmiaru oraz kontrolę tożsamości. Nie odczytywać arbitralnej ścieżki z treści.
- Zachować istniejącą ochronę wersji i pochodzenia źródeł WWW; nie rozluźniać jej, aby obsłużyć OWA.
- Zachować domyślne limity: dwa źródła, trzy sekcje na źródło, 4000 znaków treści. Można traktować pojedynczy pełny wiersz tabeli z nagłówkiem jako jednostkę; nie ucinać go w połowie. Deduplikacja dotyczy tylko tej samej tożsamości źródła/wersji.
- Gdy wymagany fragment nie mieści się w budżecie, pominąć go w całości i jawnie wskazać brak pokrycia. Nie ujawniać obok skróconego preview pozbawionego kwalifikacji.
- Nie używać skróconego summary do zastępowania pełnego żądanego mapowania, jeśli pełna treść istnieje w tym samym rozpoznanym rekordzie/źródle.

### 4. Odpowiedź, niejednoznaczność i brak wiedzy

- Zestawienie żądanych faktów ma wynikać z dostępnych pól/sekcji i wskazywać ich źródła. Implementacja może zwracać zwięzłe zestawienie i pełne dowody, bez generatywnego dopowiadania braków.
- Pytanie o ogólny „stan dokumentu”, które nie ustala typu ani osi stanu, wymaga wyjaśnienia wieloznaczności lub pytania doprecyzowującego. Nie utożsamiać statusu księgowania, płatności i etapu obiegu.
- Jawny UNKNOWN lub „do potwierdzenia” w źródle pozostaje nieznaną informacją. Zwracać konkretny zakres braku, np. brak kompletnego potwierdzonego enum, a nie sam ogólny disclaimer.
- Brak dowodu dla dokładnie wskazanego identyfikatora procesu/encji ma skutkować „nie znaleziono w przeszukanych lokalnych źródłach”. Nie oznacza to dowodu nieistnienia w całym ERP. Nie zastępować odpowiedzi innym procesem.
- Nie stwierdzać braku mapy pól tylko dlatego, że top-k nie zwróciło odpowiedniego fragmentu. Takie stwierdzenie wymaga sprawdzenia kompletnego rozpoznanego źródła albo jawnego ograniczenia wniosku.
- Ocena wystarczalności musi uwzględniać treść rzeczywiście pokazaną użytkownikowi, także extracty, a nie tylko stare ograniczone snippets.
- Zachować `retrieval.backend=local_artifacts`, `graphUsed=false`, znaczenie confidence i istniejące pola domenowego MCP. Ewentualne nowe pola mają być addytywne i spójne z Markdown.

## Granice zmiany

Implementować w izolowanym checkoutcie zgodnie z `scripts/AGENTS.md`. Prawdopodobny working set: `erp_knowledge_assistant.mjs`, `erp_knowledge_answer.mjs`, `lib/knowledge_retrieval.mjs` oraz mały osobny moduł kontekstu OWA, jeśli pozwoli uniknąć dalszego rozbudowywania dużego pliku odpowiedzi. Integracja MCP tylko w zakresie koniecznym do zachowania spójnego kontraktu odpowiedzi.

To poprawka warstwy asystenta. Nie wymaga modyfikacji odzyskanych snapshotów, registry, raw, CSV, schematu grafu ani eksportu/builda. Historyczna dokumentacja API pozostaje historycznym źródłem, nie potwierdzeniem obecnych capabilities Optimy.

## Walidacja i kryteria ukończenia

1. Zacząć od `npm run check`; przed każdym testem sprawdzić skutki i katalogi zapisu.
2. Reprodukcje RED dla utraty jawnego OWA, błędnego rankingu konkretnych encji/relacji, blokowania lokalnych źródeł i braku jawnej odpowiedzi UNKNOWN/ambiguous/missing.
3. Izolowane regresje: pusty/wykluczony scope; brak URL; obce owner/version; traversal i symlink; niepełny CSV; warunkowe fragmenty przy budżecie; zgodność Markdown/JSON. Sieć, drafty i learning wyłączone.
4. Zachować istniejące regresje body fields, source citations, extracts, release intent, retrieval i blended routes. Nie zmieniać ich oczekiwań w celu ukrycia regresji.
5. Dodać parafrazy i negatywne przypadki niepochodzące wprost z benchmarku. Nie hardkodować pytań, fikcyjnego ID Q12, enumów ani oczekiwanych odpowiedzi.
6. Celem akceptacji jest **12 PASS / 0 PARTIAL / 0 MISS** według niezmienionych kryteriów; samo zwiększenie liczby trafień nie jest sukcesem. Jeśli pozostanie luka, raportować ją i nie ogłaszać całości jako zakończonej.
7. Po izolowanej weryfikacji i kontrolowanej integracji powtórzyć 12 pytań przez działające SemanticKB. Zapisać pełne widoczne odpowiedzi i manifest z hashami w trwałym katalogu dowodowym oraz osobny raport porównawczy. Pierwotny benchmark zachować jako baseline.
8. Wdrożenie przeprowadzić według istniejącego runbooka właściwej usługi SemanticKB, po sprawdzeniu rzeczywistego entrypointu. Sam udany test lokalny nie dowodzi wdrożenia. Nie zmieniać polityk automatyzacji ani przeładowywać pozostałych usług bez potrzeby.

## Przegląd własny projektu

Sprawdzono spójność zakresu, brak placeholderów, izolację namespace i tożsamości źródeł, ograniczenia cytowania oraz rozdzielenie lokalnej regresji od testu wdrożonego MCP. Użytkownik zatwierdził projekt odpowiedzią „tak”; szczegóły algorytmu i kolejność plików należą do planu.
