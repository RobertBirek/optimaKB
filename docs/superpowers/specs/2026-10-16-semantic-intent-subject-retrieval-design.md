# SemanticKB — intencja, zakres i przedmiot pytania

Data zadania: 2026-10-16. Baza: `a0f29559512ac88af68ac3df4cc4a81e70b30c54`.
Status: zatwierdzony przez użytkownika poleceniem „ok, działaj”; implementacja nierozpoczęta.

## Cel i punkt odniesienia

Poprawić odpowiedzi na naturalne pytania o istniejące encje, pola, relacje i procesy, bez wymagania od użytkownika słowa OWA, JOIN lub technicznej nazwy tabeli. Zachować odpowiedzi biznesowe Business Semantics tam, gdzie to one dostarczają właściwego wyjaśnienia.

Dowody wejściowe:

- zaakceptowane 12Q: **12 PASS / 0 PARTIAL / 0 MISS**;
- nowy holdout 20Q: **4 PASS / 5 PARTIAL / 11 MISS**, 20/20 poprawnych technicznie wywołań;
- 12 odpowiedzi holdoutu korzystało wyłącznie z Business Semantics, bez pełnego PASS;
- także przy trasie OWA występują braki przedmiotu/faktu/kwalifikacji H02/H04/H08/H13;
- H10 zawiera żądane relacje, ale diagnostyka mówi o brakującym pokryciu.

Zamrożone wejścia pozostają niezmienione:

- `OWA_SemanticKB_12Q_2026-10-15.json`, SHA-256 `4124f75b330142b6894637380e90589c78dec24362af721eedc45f57276221d2`;
- `OWA_SemanticKB_Holdout20Q_2026-10-16.json`, SHA-256 `3ae42d67cba40608c84ce4f5ffad77ed5f7553fe1979a586e0b108904a79f936`;
- pełne wyniki i źródła w `backups/manual-repairs/owa-holdout20-20261016/` oraz istniejących archiwach 12Q.

## Potwierdzone granice problemu

1. Domenowy handler przekazuje wewnętrzną intencję wyłącznie dla `optima_release.search`; cztery narzędzia SemanticKB trafiają do wspólnej ścieżki bez rozróżnienia zamiaru. Źródło: `scripts/lib/erp_knowledge_mcp_core.mjs:583-584`.
2. `answerQuestion()` ustala trasę przed rozpoznaniem OWA i wyborem dowodów; katalog encji nie chroni doboru zakresu przed ogólnymi słowami semantycznymi. Źródło: `scripts/erp_knowledge_answer.mjs:770-778`.
3. Kontekst ma jedną globalną listę facetów, a assessor buduje wymagania właściciel × facet × pole. Nie rozróżnia przedmiotu głównego od końca relacji tylko wspomnianego pomocniczo. Źródło: `scripts/lib/owa_query_context.mjs:67-95`, `scripts/lib/owa_evidence.mjs:480-486`.
4. Słowo „ograniczenia” wprost uruchamia facet workflow, również gdy pytanie dotyczy wyłącznie wiarygodności FK. To reprodukowalna reguła kontekstu, nie brak danych. Źródło: `scripts/lib/owa_query_context.mjs:76`.

Szczegóły doboru jednostek i rozpoznawania naturalnych nazw wymagają testów RED podczas implementacji; powyższe obserwacje nie oznaczają, że każda porażka ma jedną identyczną przyczynę.

## Rozważone podejścia

1. **Rekomendowane: intencja serwerowa + katalog metadanych + wymagania pytania.** Rozdziela dostęp, odnalezienie przedmiotu i wybór źródeł; wykorzystuje istniejący korpus i umożliwia testy z nowymi syntetycznymi nazwami.
2. **Zawsze wybierać OWA w profilu SemanticKB.** Proste, ale wypiera poprawne definicje/reguły biznesowe i nie rozwiązuje braków konkretnych faktów.
3. **Ręczne wagi/synonimy pod aktualne pytania albo nowy generatywny router.** Pierwsze grozi dopasowaniem do benchmarku, drugie rozszerza zależności i utrudnia deterministyczną ocenę. Poza wybranym zakresem.

## Projekt

### 1. Intencja pochodzi z metody, dostęp z profilu

Handler nadaje prywatną intencję wynikającą z faktycznie wywołanej metody:

- `erp_entity.get` — encja i żądane jej cechy;
- `erp_relation.list` — żądane końce i własności relacji;
- `erp_process.explain` — proces, kierunek, warunki i skutek;
- `erp_concept.search` — znaczenie, porównanie lub doprecyzowanie pojęcia.

Intencja jest wskazówką strukturalną, nie twierdzeniem o treści. Nie dopisuje automatycznie wszystkich możliwych facetów ani nie ignoruje pytania. Nie jest nowym publicznym argumentem i nie może być nadpisana tekstem użytkownika lub dodatkowymi polami JSON. Zachować odrębną intencję release i istniejące zamknięte schematy wejścia.

W każdym etapie najpierw filtrować namespace zgodnie z profilem. Pusty zakres pozostaje pusty, wykluczona OWA nie uruchamia jej skanera ani katalogu. Nie rozszerzać dostępu innych profili. Legacy `answer_question` i narzędzia niesemantyczne zachowują dotychczasowy kontrakt, poza ogólnymi poprawkami selekcji pokrytymi regresjami.

### 2. Rozpoznanie zakresu na podstawie katalogu

W żądaniu SemanticKB przeszukiwać metadane w **obu dozwolonych KB**, gdy obie są dostępne. Nie pozwolić, aby ogólna punktacja „co oznacza”, „wartości” lub „ograniczenia” wykluczyła dopasowany byt OWA.

Katalog jest lokalny dla żądania, tworzony z już dozwolonych, wersjonowanych artefaktów CSV. Zawiera deklarowane ID, nazwy, aliasy, tabele, właścicieli pól i końce relacji/procesów wraz ze źródłem, hashem oraz locatorem. Nie indeksuje plików dowolnie wskazanych w treści ani danych ERP.

Kolejność dowodów tożsamości: dokładny deklarowany identyfikator, kwalifikowana tabela/kolumna z potwierdzonym właścicielem, pełna nazwa/alias, ostrożne dopasowanie odmiany lub frazy do nazwy. Obsłużyć wyrażenia naturalne przez ogólne role/zależności i ograniczone wzorce językowe, bez map odpowiedzi dla testowanych pytań. Dłuższa nazwa encji nie może zostać rozbita na nowy zestaw niezamówionych przedmiotów.

Gdy nazwa pola pojawia się tylko w uporządkowanej sekcji istniejącego dokumentu encji, można utworzyć **deklarację pola ze źródła**, zachowując jej dosłowny tekst, status i locator. To nie jest nowy zweryfikowany schemat. W przypadku niejednoznacznego właściciela zachować alternatywy lub poprosić o doprecyzowanie.

Przy braku jednoznacznego dopasowania nadal można użyć Business Semantics do definicji lub jawnie ograniczonej odpowiedzi. Nie przypisywać przypadkowego dokumentu na podstawie pojedynczego wspólnego słowa. Nie tworzyć wymyślonych równoważności ID przez usuwanie prefiksów.

### 3. Główny przedmiot i żądane wymagania

Przed wyborem fragmentów utworzyć jawne, prywatne wymagania wynikające z pytania:

- przedmiot główny, o który pytano o PK, mapowanie, słownik lub opis;
- inne **jawnie żądane** przedmioty porównania;
- końce żądanej relacji lub ścieżki;
- pomocnicze wspomnienia, które same w sobie nie wymagają własnej kompletnej mapy pól.

Wymaganie łączy faktyczny przedmiot, żądany facet/pole lub relację i pochodzenie rozpoznania. Asesor nie tworzy globalnego iloczynu wszystkich facetów dla wszystkich wspomnianych encji.

Przykładowo ogólny wzorzec „encja X: jej klucz i relacja do Y” wymaga identyfikatora X oraz relacji X–Y; nie wymaga klucza Y. Wzorzec „porównaj X i Y” zachowuje obie części. Przykłady nie są listą reguł dla nazw Cena/Płatność/Kompensata; testy mają działać również na nowych syntetycznych nazwach i parafrazach.

„Ograniczenia źródła”, „wiarygodność klucza” i „do potwierdzenia” nie są same w sobie żądaniem procesu. Facet workflow wymaga intencji/pytania o przebieg, ścieżkę, skutek lub kroki. Żądanie słownika pola nie uprawnia do zgadywania enum na podstawie typu SQL.

### 4. Wybór całych dowodów pod wymagania

Najpierw rezerwować miejsce dla żądanych faktów przedmiotu głównego i obu stron jawnego porównania. Potem dołączać istotne warunki, statusy i źródła pomocnicze. Poboczne reguły innej encji nie mogą wypierać żądanego PK.

Dobór i ocena pokrycia używają tego samego zestawu wymagań. Dla relacji rozróżniać fakty o kierunku, kardynalności, JOIN, formalnym FK, logicznym powiązaniu i ograniczeniu weryfikacji. Zachować cały istotny warunek i granicę dowodu; brak deklaracji formalnego FK nie staje się dowodem istnienia FK.

Korekty i ścieżki rozpoznawać z deklarowanych symboli/aliasów/referencji oraz treści źródła, bez ręcznego dopisywania pojedynczego PZKOR jako naprawy jednego testu. Przechowywać kolejność i powtórzenia kodów; nie sklejać odcinków przez nieznany krok. Nie utożsamiać procesu tworzenia dokumentu z relacją korekty do oryginału w przeciwnym kierunku.

Zachować **2 źródła / 3 jednostki na źródło / 4000 znaków extractów**. Można wybrać kompletny wiersz tabeli z nagłówkiem, jeżeli zachowa wszystkie powiązane kwalifikacje; nie przecinać warunków ani zdań. Jeżeli całości nie da się pokazać, wskazać konkretny brak bez sugerowania nieistnienia informacji.

### 5. Pokrycie i niewiedza

Pokrycie wynika tylko z tekstu faktycznie widocznego w Markdown. Pełne lokalne extracty, nieukryte pomocnicze dowody, właściciel/wiersz/pole i status źródła mają być uzgodnione z wymaganiami. Naprawa H10 nie może polegać na samym ustawieniu flagi ani globalnym poluzowaniu przypisania relacji.

Niepotwierdzony PK lub enum należy nazwać konkretnie i zacytować odpowiedni zakres. Brak pokrycia top-k nie oznacza, że pełny dokument nie ma takiej informacji. Gdy źródło twierdzi w jednym miejscu „automatyczne”, a w innym pozostawia to UNKNOWN, pokazać obie deklaracje i brak rozstrzygnięcia. Nie weryfikować ich pozornie przez oznaczenie CONFIRMED.

Dokładna brakująca tożsamość i mieszane znane/nieznane ID zachowują obecną barierę przed zastępowaniem innym bytem oraz przed zewnętrznym fallbackiem omijającym lokalną niewiedzę. Zachować dotychczasową politykę fallbacku dla pozostałych zapytań; wynik zewnętrzny nie jest źródłem lokalnego mapowania. Renderer nadal zachowuje pełne zewnętrzne fragmenty, URL, daty i kwalifikacje.

### 6. Granice modułów i kompatybilność

Przewidywany working set: handler MCP, koordynacja odpowiedzi, czyste rozpoznanie intencji/przedmiotu, katalog metadanych oraz selekcja/pokrycie OWA. Małe nowe moduły powinny oddzielić katalog i wymagania od istniejącego dużego `owa_evidence.mjs`; bez refaktoru niezwiązanego z celem.

Nie dodawać publicznych parametrów, modelu/routera LLM, zależności ani nowej konfiguracji. Nie zmieniać rozpoznawania namespace, provenance owner/version, granic dat ani treści źródeł. Nie zmieniać formattera, aby ukryć niewygodne fakty lub diagnostykę.

Zachować lokalny backend/no-graph, znaczenie confidence, dotychczasowe pola oraz zwięzły format i addytywne extracty/pominięcia. Wewnętrzny plan wymagań może być dostępny jako ograniczona diagnostyka, ale nie może ujawniać prywatnych wierszy, odrzuconych dokumentów ani treści wykluczonych KB.

## Kryteria akceptacji

1. **Dotychczasowe 12Q: 12 PASS / 0 PARTIAL / 0 MISS**, te same zapytania, narzędzia, daty, limity i kryteria.
2. **Nowe 20Q jest teraz regresją. Celem zamknięcia jest 20 PASS / 0 PARTIAL / 0 MISS** na tym samym pliku pytań i kryteriach; nie przenosić trudnych pytań poza punktację. Każdy nierozwiązany przypadek pozostaje jawną luką, a nie zaliczeniem za lepszy routing.
3. Oceny ręczne dotyczą pełnych widocznych odpowiedzi; mechaniczne testy faktów, statusy i hashe nie zastępują tej oceny. Zmiana źródłowego doboru może zmienić dawne odpowiedzi, ale nie może utracić wymaganych faktów/warunków ani kwalifikacji.
4. Testy syntetyczne i parafrazy obejmują nowe nazwy spoza 32 pytań; główny przedmiot versus cel relacji, dwa porównywane byty, nieznane pole/słownik, złożone nazwy, negacje i konflikty, formalny FK versus związek logiczny oraz nieznane kroki i odwrócony kierunek procesu.
5. Pusty/wykluczony scope nie odczytuje katalogu; alias/ID nie rozszerza dostępu. Obcy owner/wersja/kolumna nie może wypełniać wymagań innego przedmiotu. Zachować testy provenance, budżetu, pełnego renderowania, kontroli fallbacku i niezmienionych profili niesemantycznych/release.
6. Przed zmianą kodu zamrozić manifest wejść i aktualne 32 odpowiedzi w izolacji. Przed wdrożeniem przeprowadzić niezależny przegląd pełnej zmiany. Po wdrożeniu ponownie wywołać rzeczywiste podłączone narzędzia i zachować kompletne odpowiedzi oraz manifesty źródeł, żądań i hashy.
7. **Nowy holdout 10Q** przygotować i zapisać po zamrożeniu kandydata, ale przed jego pierwszym ocenianym wywołaniem. Nowe pytania i źródłowe kryteria mają obejmować inne encje/parafrazy; nie udostępniać ich wykonawcom do strojenia kandydata. Po wynikach nie poprawiać kodu i nie powtarzać pytań w tej samej ocenie. Raportować pełny wynik, także niekorzystny; nie traktować go jako części treningowych 32 regresji ani dowodu ogólnej statystycznej dokładności.

Zwięzłość i długości raportować osobno. Dawne **38,91%** dotyczyło zmiany formattera przy niezmienionych dowodach; teraz celowo zmienia się wybór dowodów, więc nie wolno obiecywać identycznych długości ani wyliczać skrócenia wyłącznie z różnicy treści. Formatter i limity pozostają zachowane.

## Wykonanie i wdrożenie

Zmiany w izolowanym checkoutcie zgodnie z `scripts/AGENTS.md`. Nie modyfikować korpusu, raw/promoted, registry, CSV, schematu, grafu, eksportera ani bieżących danych ERP w celu poprawy wyniku. Znane sprzeczności READ/WRITE w historycznym materiale pozostają źródłową luką, nie cichą korektą danych.

Wdrożenie po testach i przeglądzie: durable backup/hash/absence/readability, kontrolowany transfer dokładnie zatwierdzonych plików, sekwencyjne przeładowanie **centralnego `erp-kb-mcp.service` i dedykowanego `erp-semantic-mcp.service`**, health/TLS, odczyty publiczne i ponowne 32 pytania. Zachować pozostałe usługi, proxy, polityki i timery. Zwykła telemetria wywołań jest dopuszczalna. Nie wykonywać commitu ani push bez nowego polecenia dla tej implementacji.

## Przegląd własny

Sprawdzono zakres i spójność: intencja nie nadaje dostępu; katalog nie tworzy nowych faktów; wymagania są przypisane do przedmiotów; wybór i pokrycie mają wspólne wejście; brak UNKNOWN nie jest zgadywany z braku top-k; kryteria regresji i nowego holdoutu są rozdzielone. Projekt nie zawiera list odpowiedzi ani poprawek danych pod benchmark. Użytkownik zatwierdził specyfikację; następnym krokiem jest plan implementacji.

## Zatwierdzone rozszerzenie — blokada auto-draftu w metodach odczytowych MCP

Po zamrożeniu kandydata preflight ujawnił `EXA_AUTO_DRAFT=1` i aktywnego providera API w obu usługach. Wspólna ścieżka odpowiedzi mogła utworzyć szkic po fallbacku mimo odczytowego kontraktu narzędzia. Zatrzymano się przed transferem, restartami i ocenianymi wywołaniami. Użytkownik zatwierdził małe uzupełnienie kodu oraz ponowny przegląd/zamrożenie przed testem live.

- Wszystkie metody odpowiedzi MCP oznaczone jako odczytowe wymuszają prywatne `allowAutoDraft=false` w swoim wewnętrznym wywołaniu silnika. Zgoda na inne narzędzia zapisu nie zmienia odczytowego charakteru tej metody.
- `EXA_AUTO_DRAFT` oraz konfiguracja providerów/polityk pozostają niezmienione. Wyszukiwanie zewnętrzne, jego pełna treść/URL/daty i zwykła telemetria nadal działają.
- Silnik respektuje jawny prywatny zakaz przy próbie utworzenia szkicu. Bez takiego zakazu wywołania spoza odczytowego MCP zachowują dotychczasowy skonfigurowany automat; jawne narzędzia tworzenia szkiców zachowują istniejące uprawnienia i walidacje.
- Nie dodawać publicznego parametru ani ścieżki eskalacji. Argument użytkownika, profil/read-only lub `context.writeAllowed=true` nie pozwala obejść kontraktu odczytowej metody.
- Testować rzeczywisty handler przy włączonym auto-drafcie i skutecznym mock-providerze, zarówno przy mieszanych, jak i wyłącznie zewnętrznych dowodach; dowieść braku wywołania/wpisu inbox/registry oraz zachowania zewnętrznej odpowiedzi. Dodać kontrolę dodatnią istniejącego autoryzowanego zapisu w izolowanym fixture.
- Zmiana jest wyłącznie granicą zapisu, bez strojenia rozpoznawania, źródeł i odpowiedzi. Po niezależnym przeglądzie ponownie zamrozić wersję i związać ją osobnym pokwitowaniem z **niezmienionym i nadal niewykorzystanym** bankiem 10Q. Zachować wcześniejszą wersję/seal; nie przepisywać pytań, oczekiwań ani daty ich zapieczętowania.
