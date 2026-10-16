# OWA — zwięzła prezentacja odpowiedzi

Data: 2026-10-15. Baza kodu: `38e314b720004e6454af0f3532bc0d50ac0928d6`.
Status: zatwierdzony przez użytkownika odpowiedzią „tak”; bez rozpoczętej implementacji.

## Cel

Skrócić widoczne odpowiedzi SemanticKB o OWA bez utraty faktów, warunków, niepewności i przypisania do źródeł. Punktem odniesienia są pełne odpowiedzi ostatniego zaakceptowanego testu live, który uzyskał **12 PASS / 0 PARTIAL / 0 MISS**.

Obecna poprawna treść jest otoczona powtórzeniem pytania, informacjami routingu, pobocznymi podglądami, wieloma wierszami pominięć i powtarzaną techniczną proweniencją. Część odpowiedzi ma kilkadziesiąt pominięć. To problem prezentacji, nie powód do kolejnej zmiany wyszukiwania.

## Rozważone podejścia

1. **Rekomendowane: deterministyczna projekcja Markdown i pełne dane strukturalne.** Zachowuje całe wybrane fragmenty, usuwa otaczający szum, wymaga małej zmiany renderera i addytywnego uzupełnienia MCP.
2. **Wyłącznie agregacja pominięć.** Najmniejsza zmiana, ale pozostawia poboczne podglądy, powtórzenie pytania i nadmierną proweniencję w widoku użytkownika.
3. **Nowe generatywne streszczenie.** Może dać najkrótszy tekst, ale wprowadza zależność od modelu i ryzyko utraty warunków lub dodania twierdzeń. Poza zakresem.

## Zakres i architektura

Nowy czysty formatter obsługuje odpowiedzi z istniejącym `owaCoverage`. Korzysta wyłącznie z gotowych `extracts`, `sources`, `answerNotes`, `owaCoverage`, `evidenceAssessment`, `omissions` i metadanych backendu. Nie odczytuje plików, nie wykonuje wyszukiwania i nie zmienia obiektu odpowiedzi.

`renderAnswerMarkdown()` deleguje do formattera dla tej gałęzi. Odpowiedzi bez `owaCoverage` zachowują dotychczasowy renderer i jego kontrakt. Zakres profilu, routing, ranking, wybór i budżet treści, rozpoznawanie właścicieli oraz ocena wystarczalności pozostają takie jak przed formatowaniem.

Odpowiedź domenowa MCP zachowuje dotychczasowe pola i addytywnie udostępnia publiczne `extracts` i `omissions` dla OWA. Nie serializuje prywatnych kandydatów, `owa.row`, map, kontekstu dopasowań ani innych nieenumerowalnych danych wewnętrznych.

## Układ Markdown

### 1. Odpowiedź i istotne ograniczenia

- Zaczyna się od właściwej treści lub konkretnej informacji o braku dowodu/niejednoznaczności, bez ponownego wypisywania pytania i tras routingu.
- Korzysta z już wybranych pełnych fragmentów źródłowych. Nie parafrazuje warunków, nie skraca zdań i nie wycina wierszy z tabel; nie buduje nowego streszczenia faktów.
- Każdy fragment pozostaje przypisany do stabilnego oznaczenia `[S1]` albo `[S2]` i dotychczasowego właściciela źródła. Kolejność faktów i zakres źródeł pozostają zgodne z aktualnymi extractami.
- Istotne `answerNotes`, jawne UNKNOWN/CONFLICT, brakujące pola/aspekty, ostrzeżenie o uszkodzonym CSV i brak pokrycia pozostają widoczne. Można usunąć tylko identyczne powtórzenie tego samego komunikatu o tym samym zakresie.
- Dla braku dowodów lub niejednoznaczności komunikat jest właściwą odpowiedzią; nie dodaje się zastępczych fragmentów innych procesów.
- Jedno krótkie zdanie zachowuje granicę: lokalne źródła nie są świeżą weryfikacją ERP/MSSQL ani wykonaniem grafu. Wartości confidence nie przedstawia się jako prawdopodobieństwa poprawności; techniczne objaśnienie punktacji pozostaje w JSON.

### 2. Źródła

- Jedna lista, najwyżej **dwa wpisy**, zgodnie z obecnym limitem źródeł.
- Wpis zawiera oznaczenie, tytuł, namespace oraz ścieżkę/ID rekordu i fizyczny locator użytych fragmentów. Powtórzone identyczne locatory w obrębie wpisu pokazuje się raz.
- Nie łączy źródeł ani wersji tylko dlatego, że tekst lub tytuł są podobne. Zachowuje dotychczasowe klucze tożsamości.
- Lokalne cytowanie nie dostaje sztucznego URL. Pełne hashe, ścieżki właścicielskie, wszystkie metadane rekordów i podstawy dat pozostają w `sources` JSON.
- Jeśli poprawna odpowiedź zawiera rzeczywisty URL lub jawną źródłową datę, nadal są widoczne. Nie usuwa się dat będących treścią odpowiedzi. Braku dat nie zastępuje się datą promocji/testu; kilka technicznych nieznanych dat można podsumować jednym zdaniem.
- Poboczne podglądy `evidence` i sekcja „Polecane artefakty” nie są wypisywane obok pełnych fragmentów OWA. Pozostają dostępne w istniejących polach strukturalnych, jeśli dotychczas były udostępniane. Wyjątek stanowi techniczny podgląd będący jedynym widocznym dowodem dla żądanego faktu lub ograniczenia: trzeba zachować go z locatorem. Jeśli formatter nie potrafi bezpiecznie rozstrzygnąć tej zależności na istniejących metadanych, zachowuje podgląd zamiast usuwać go dla oszczędności miejsca. Nie wolno uzyskać statusu pokrycia na podstawie tekstu, który zniknął z widoku.

### 3. Pominięcia

- Jedno krótkie podsumowanie liczby pominiętych jednostek, z agregacją według powodów, np. limit sekcji, źródeł i budżetu.
- „Jednostki” nie są nazywane dokumentami ani niezależnymi źródłami, jeśli dane tego nie potwierdzają.
- Nie wypisuje pełnej listy powtarzających się hashy. Szczegółowe elementy pozostają w `omissions` JSON.
- Końcowe `missingFacets`/`uncoveredFacets` i wymagania właściciel–pole–aspekt pozostają w komunikacie pokrycia. Agregacja pominięć nie może sugerować kompletności, jeśli aktualna ocena mówi o brakach.

## Niezmienniki danych i kompatybilność

Przed i po renderowaniu obiekt odpowiedzi musi być identyczny. W porównaniu starej i nowej ścieżki handlera te same pytania i źródła muszą dawać identyczne dotychczasowe pola `evidence`, `sources`, `retrieval`, `evidenceAssessment`, `owaCoverage`, `answerNotes`, `knowledge_status`, `validity`, `warnings` i `correlation_id`, z uwzględnieniem normalnych różnic czasu obserwacji. Zmienia się tekst `answer`; `extracts` i `omissions` są addytywne.

Wszystkie aktualnie wybrane `extract.text` pozostają w Markdown w całości. Nie trzeba usuwać duplikatów treści między różnymi źródłami, aby osiągnąć cel; bezpieczeństwo cytowania ma pierwszeństwo przed dalszym skracaniem.

Zachować limity **2 źródła / 3 jednostki na źródło / 4000 znaków treści extractów**. Nie zmieniać statusów UNKNOWN ani progów, aby wynik wyglądał lepiej. Nie dodawać modelu, endpointu, publicznego trybu „compact” ani nowej konfiguracji.

## Testy i akceptacja

1. Izolowane testy czystego formattera: pełne warunkowe akapity i tabele, negacje, UNKNOWN/CONFLICT, brakujące pola, wiele pominięć, powtórzone locatory, różne wersje o podobnych tytułach, brak źródeł i niejednoznaczność.
2. Test niemutowania danych oraz rzeczywistego `handleJsonRpcRequest`: zgodność istniejących pól i addytywnych publicznych extractów/pominięć; brak wycieku prywatnych danych i namespace.
3. Dotychczasowe testy OWA, cytowania, extractów, routingu release i innych profili pozostają poprawne. Oczekiwania dotyczące starego układu Markdown mogą zostać jawnie zmienione wyłącznie dla nowej gałęzi OWA; nie osłabiać testów faktów, źródeł, pokrycia i ograniczeń.
4. Niezmienione 12 pytań, narzędzia, kryteria, `as_of=2026-10-15`, `limit=5`: wymagane **12 PASS / 0 PARTIAL / 0 MISS** po ręcznej ocenie pełnych odpowiedzi. Nie zaliczać na podstawie samego znalezienia słów lub istnienia danych w JSON.
5. Mierzyć długość całych widocznych odpowiedzi przed/po na tym samym zamrożonym korpusie: suma znaków dla 12 odpowiedzi ma spaść o **co najmniej 35%**, a żadna pojedyncza odpowiedź nie ma być dłuższa niż jej baseline. Osobno podać medianę, liczbę linii i maksymalną długość. Brak utraty treści ma pierwszeństwo; niespełniony cel długości raportować, nie obchodzić przez ucinanie dowodów.
6. Po lokalnych testach i przeglądzie przeprowadzić kontrolowane wdrożenie i powtórzyć test przez faktycznie podłączone publiczne narzędzia. Zachować pełne odpowiedzi, porównanie długości, hashe i manifest w trwałym katalogu dowodowym.

## Wykonanie i wdrożenie

Kod zmieniać w izolowanym checkoutcie, zgodnie z `scripts/AGENTS.md`. Właściwa ścieżka publicznego SemanticKB jest już potwierdzona: dynamiczny profil centralnego `erp-kb-mcp.service` na 3400; dedykowany `erp-semantic-mcp.service` na 3420 również importuje wspólne moduły.

Plan implementacji ma obejmować backup, sprawdzenie dokładnego diffu i hashy, kontrolowaną integrację, sekwencyjne przeładowanie **centralnego dispatchera i dedykowanego SemanticKB** oraz health/public readback. Nie zmieniać proxy ani pozostałych usług, korpusu, raw/promoted, registry, CSV, grafu, polityk i timerów. Zwykła telemetria wywołań jest dopuszczalna. Nie wykonywać commitu ani push bez nowego polecenia użytkownika dotyczącego tej zmiany.

## Przegląd własny

Projekt ma jeden cel i jedną gałąź renderowania. Sprawdzono: brak sprzeczności z limitami i kryteriami 12Q; zachowanie pełnych fragmentów i zastrzeżeń; rozdzielenie widoku Markdown od kompletnego publicznego JSON; brak nowej logiki wyszukiwania; znaną topologię wdrożenia. Użytkownik zatwierdził specyfikację; następnym krokiem jest plan implementacji.
