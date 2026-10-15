# Treść odpowiedzi, cytowania i routing wydań

## Cel i zatwierdzony kierunek

Użytkownik zaakceptował działania: powtórzenie 16 pytań live oraz ograniczoną
naprawę prezentacji treści, pełnych URL/dat źródeł i przekazania intencji
release bez rozszerzania zakresu KB. Wariant jest deterministyczny,
ekstrakcyjny: żadnego nowego LLM i generowania faktów nieobecnych w źródłach.

Podstawa diagnozy: `Answer_Presentation_Routing_Diagnosis_2026-10-13.md`.
Baseline live: `Live_Post_Correction_16Q_2026-10-14.md` i JSON.
Wynik przed naprawą: 0 PASS / 13 PARTIAL / 3 MISS; 16/16 wywołań live
bez błędów TLS, 15/16 pytań odnajduje poprawione źródła.

## Alternatywy i wybór

Wybrano naprawę pól źródłowych i ekstrakcyjnego renderowania. Samo zwiększenie
okna 280 znaków nie naprawia wyboru metadanych ani brakującego routingu.
Generatywna synteza przez nowy LLM powiększa zakres i nie jest wymagana do
usunięcia potwierdzonych usterek. Obie te alternatywy pozostają poza zakresem.

## Granice kodu

Cztery runtime moduły:

1. `scripts/lib/knowledge_retrieval.mjs` — nagłówki CSV i dobór pól treści.
2. `scripts/erp_knowledge_answer.mjs` — fragmenty, źródła, daty i rendering.
3. `scripts/lib/erp_knowledge_mcp_core.mjs` — wewnętrzne przekazanie intencji
   `optima_release.search` do funkcji odpowiedzi.
4. `scripts/erp_knowledge_assistant.mjs` — użycie tej intencji po filtracji KB.

Testy zmienianych granic powstają w `scripts/test_*.mjs` zgodnie z istniejącym
układem. Nie refaktoruje się niezwiązanych modułów, eksporterów ani usług.

## Treść i fragmenty

Parser zwraca nagłówki/kolumny addytywnie, zachowując istniejące rekordy,
obsługę multiline CSV, physical line/endLine i fail-closed na błędnym CSV.

Dla chunków głównym polem treści jest `content`; dla dokumentów `summary`,
jeśli jest merytoryczne; dla Business Semantics pełna `description`.
Techniczne encje bez takiego pola zachowują dotychczasową możliwość
wyszukiwania właściwych nazw/definicji. Polityka doboru pola nie może wyciąć
treści technicznej ani uznać URL, ID lub ścieżki za odpowiedź.

Tytuł i identyfikatory mogą wpływać na wybór trafienia, ale nie na kotwiczenie
fragmentu odpowiedzi. Pozycje dopasowań i rdzeni słów są ustalane względem
ciała źródła; przy braku dokładnego dopasowania w wybranym, dodatnio ocenionym
wierszu domyślnym fragmentem jest ciało, nie początek połączonych metadanych.
Zachowuje się artifact hashes, URI i locatory; dochodzą jawne informacje
o wybranym polu treści i pozycjach w tym polu.

Rendering pokazuje przypisane do źródeł fragmenty treści, wybierane według
pytania, w granicach całych zdań/akapitów lub sekcji. Możliwe jest dobranie
powiązanych chunków tego samego źródła tylko wewnątrz już dozwolonej KB.
Tożsamość źródła uwzględnia owning path oraz wersję/daty proweniencji;
sam współdzielony `sourceDocumentRefId` lub URL nie uprawnia do połączenia
różnych migawek i przypisania im dat jednego poprawionego szkicu.
Domyślne limity: 2 główne źródła, do 3 sekcji na źródło i łącznie 4000 znaków
merytorycznej treści. Cytowania są poza tym budżetem.

Nie wolno odciąć zastrzeżenia „nie potwierdzono” i pozostawić samej sugestii
jako potwierdzonej naprawy. Jeżeli warunek lub sekcja nie mieszczą się,
odpowiedź jawnie wskazuje ograniczenie pokrycia; nie deklaruje, że wyjaśniła
wszystkie aspekty. Warstwa nie dopisuje prawa, skuteczności rozwiązania ani
dat wejścia w życie. Zachowuje istniejące ostrzeżenia, provenance, znaczenie
confidence i status niezweryfikowania twierdzeń.

## Pełne źródła i daty

Każde wybrane trafienie przekazuje strukturalnie co najmniej: record ID,
tytuł, pełny literalny `sourceUrl`, owning source path i powiązany dokument.
Rendering cytuje pełny URL bez ellipsis, niezależnie od limitu fragmentu.
`knowledge://legacy/...` pozostaje lokalizatorem artefaktu, nie zamiennikiem
URL oryginału. Dla wielu źródeł każdy fragment ma jednoznaczną atrybucję.

Źródłowe daty dla promowanych rekordów odczytuje się z metadata JSON
właściwego właściciela chunku: `sourcePublicationDate`, `sourceUpdatedAt`,
`sourceRetrievedAt`. Współdzielony dokument kanoniczny nie zastępuje
metadanych owning promoted chunku. Data promocji, observedAt, data testu
lub ID nigdy nie stają się datą publikacji.

Resolver działa wyłącznie w realpath katalogu
`ROOT/docs/reference/knowledge_inbox/promoted/<dozwolony namespace>/`.
Waliduje namespace, ID właściciela, zgodność source URL i dozwolone ścieżki;
nie czyta arbitralnych plików CSV-path, `data`, sekretów lub obcych KB.
Odrzuca traversal i symlinki poza dozwolony realpath. Nie zapisuje źródeł.

Nieznana data pozostaje null z przyczyną, bez zgadywania. Zachowuje się
precyzję źródłową, np. grudzień 2025 bez wymyślania dnia oraz godzinę bez
strefy bez konwersji do domniemanego UTC. Zwykłe niepromowane daty CSV mają
jawnie nazwaną podstawę. Pola `publishedAt` Community ustawiane przez
eksporter na datę promocji nie mogą być cytowane jako źródłowe.

## Intencja release i izolacja

Dispatcher przekazuje wewnętrzną, serwerowo wybraną intencję dla
`optima_release.search`. Zachowuje pytanie, zakres namespace, publiczny
kontrakt narzędzia i ostrzeżenia domeny.

Intencja powoduje uwzględnienie istniejącej ścieżki Community wydań i
dozwolonego wsparcia oficjalnego po filtracji namespace. Nie daje dostępu
do Community, jeśli klient/profil je wyklucza. Pusty allowed set pozostaje
pusty. Nie dodaje się publicznego parametru omijającego uprawnienia.
Zwykłe docs/search zachowują dotychczasową semantykę.

## Regresje i ocena

- Q07: warunki 19%/9%, odrębność limitów i wyjątków oraz prawidłowe źródło
  CIT zamiast metadata dump.
- Q16: prawidłowe źródło Betterfly i informacja, że podziękowanie nie
  potwierdza przyczyny ani skutecznej naprawy, również przy stem-only match.
- Q10: narzędzie release dociera do właściwego Community źródła wydań,
  zachowuje daty styczniowe i nie potwierdza realizacji zapowiedzianej łatki.
- Kontrtest: pytanie o to samo wydanie w profilu bez Community nie uzyskuje
  dostępu do niedozwolonej KB.
- CSV z wcześniejszym dopasowaniem w ID/URL nie maskuje treści; zmiana
  kolejności kolumn nie zmienia semantyki fragmentu.
- Pełny długi URL jest zachowany, a data promocji nie udaje publikacji.
- Resolver odmawia obcych namespace/URL, traversal i symlink escape.
- Poprawna treść techniczna/Business Semantics i istniejące testy focus,
  retrieval, blended routes i profile MCP pozostają bez regresji.
- Nie zmienia się 16 pytań ani kryteriów wcześniejszego QA. Wynik po naprawie
  raportuje się względem niezmienionego baseline, bez backfillu faktów z
  niepokazanych rekordów. PIP w Q02 jest poprawnym pytaniem; kwalifikacja
  zakresu stron 57–59/60 pozostaje jawna, bez cichej zmiany gold.

Testy regresji mają izolowany ROOT, zamrożone źródła/metadata z dowodami
proweniencji, zero sieci, zablokowany fallback i zero produkcyjnych zapisów
draftów/learning. Najpierw `npm run check`, potem RED/GREEN i sprawdzone
co do skutków testy. Live QA wykonuje się dopiero po wdrożeniu właściwych
usług i z działającym TLS; nie przedstawia się testu lokalnego jako live.

## Wykonanie i wdrożenie

Kod przygotowuje się w izolowanym checkoutcie; istniejące zmiany main
cleanera, pipeline i raportów pozostają zachowane. Każdy etap podlega
recenzji. Brak zgody na commity/push, globalny rebuild, zmianę grafu,
polityk automatyzacji, shadowOnly, scope lub konfiguracji reverse proxy.

Integracja kodu i reload usług obsługujących zmienione moduły to oddzielny
etap wymagający potwierdzenia entrypointów, braku aktywnych operacji,
kontrolowanego przeniesienia i weryfikacji działania po reloadzie. Naprawa
nie wymaga re-eksportu ani ponownej ingerencji w poprawiony korpus.
