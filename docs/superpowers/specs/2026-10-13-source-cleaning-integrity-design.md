# Integralność czyszczenia treści discovery

## Cel i zatwierdzony wariant

Zapobiec dopisywaniu wiedzy z KB podczas czyszczenia materiałów ingestii
oraz tworzeniu szkiców discovery bez merytorycznej treści źródłowej.
Operator zatwierdził wariant deterministyczny: usuwanie boilerplate bez LLM.

Podstawa: `docs/reference/Community_77145_Root_Cause_2026-10-13.md`.

## Granice zmiany

- Moduł czyszczenia: `scripts/lib/content_cleaner.mjs`.
- Granica tworzenia szkiców: `scripts/lib/dashboard_discovery.mjs`,
  `createDraftFromDiscoveryCandidate()` przed `submitKnowledgeDraft()`.
- Testy: `scripts/test_content_cleaning_pipeline.mjs` oraz
  `scripts/test_discovery_draft_cleaning.mjs`.
- Bez modyfikacji istniejących szkiców, decyzji operatora, źródeł, polityk
  publikacji, domen, progów i trybu shadow.
- Bez zmian reviewera merytorycznego LLM: ocena szkicu i czyszczenie źródła
  to odrębne zadania.

## Czyszczenie deterministyczne

`cleanContent()` zachowuje asynchroniczny kontrakt zwracający tekst.
Nie wywołuje OpenSPG, nie korzysta z aplikacji KB ani współdzielonej sesji.
Wynik pochodzi wyłącznie z normalizacji i usuwania boilerplate wejścia.
Opcja `aiCleaner` nie może dopisać treści, również w profilowym czyszczeniu.
Wywołania i istniejące profile zachowują swoje dotychczasowe reguły usuwania
nawigacji i formatowania, ale nie wykonują generatywnego przepisania tekstu.
Nieużywane elementy klienta LLM usuwa się tylko z modułu cleanera.

Test, który obecnie oczekuje dopisania „Sekcja merytoryczna.” przez
`aiCleaner`, zostaje zastąpiony sprawdzeniem, że ta treść nie trafia do wyniku
i funkcja generatywna nie jest wywoływana.

## Walidacja źródła przed utworzeniem szkicu

Walidacja dotyczy oczyszczonego ciała źródła, zanim zostaną dodane nagłówek
discovery, URL, confidence i stopka. Sama obecność tego opakowania nie jest
dowodem treści merytorycznej.

Blokowane przypadki:

1. Puste ciało po czyszczeniu.
2. Sam tytuł, również z sufiksem nazwy witryny, powtórzony tytuł oraz
   elementy powłoki `loader` i Markdown logo bez pozostałej treści.
3. Jawna odmowa ekstrakcji/oczyszczania, opis braku surowego tekstu lub
   spekulacyjne streszczenie na podstawie tytułu, odpowiadające zbadanym
   materiałom 77145.

Walidator zwraca stabilny kod przyczyny: `EMPTY_SOURCE_BODY`,
`SOURCE_SHELL_ONLY` lub `SOURCE_CONTENT_UNAVAILABLE`.
`createDraftFromDiscoveryCandidate()` kończy się błędem z tym kodem przed
zapisem szkicu, zmianą statusu kandydata i uruchomieniem automatyzacji.
Kandydat pozostaje w dotychczasowym stanie do dalszego przeglądu.

Wykrywanie powłoki porównuje treść z tytułem i usuwa wyłącznie rozpoznane
elementy powłoki podczas oceny. Nie należy usuwać tytułu ani słowa „loader”
z poprawnego dokumentu lub blokować każdego tekstu zawierającego cytat
o błędzie dostępu. Brak reguły minimalnej długości: krótki, poprawny tekst
merytoryczny nadal może zostać zapisany.

## Kryteria akceptacji i regresje

- Próba podania cleanerowi odpowiedzi FK/chunk-reference spoza wejścia
  nie zmienia tekstu źródła ani nie wywołuje cleanera LLM.
- Odmowa modelu i spekulacyjny opis 77145 nie tworzą szkicu.
- Tytuł/logo/loader 77295 nie tworzą szkicu.
- Dla każdego zablokowanego wejścia liczba zapisanych szkiców i jobów
  automatyzacji wynosi zero, a status kandydata jest niezmieniony.
- Poprawny tekst po usunięciu reklamy i newslettera tworzy szkic z zachowaną
  treścią merytoryczną, bez dopisanych faktów.
- Krótka poprawna instrukcja oraz dokument cytujący komunikat o błędzie
  przechodzą walidację, jeśli zawierają rzeczywistą treść merytoryczną.
- Testy działają w izolowanych katalogach tymczasowych i nie wywołują
  produkcyjnego OpenSPG, ingestii ani buildera.
- Walidacja projektu zaczyna się od `npm run check`; po implementacji
  uruchamiane są dwa wskazane testy oraz testy discovery obejmujące zmienioną
  granicę tworzenia szkiców, po sprawdzeniu ich efektów ubocznych.

## Ograniczenia i wdrożenie

Walidacja eliminuje potwierdzone powłoki i odmowy, ale nie dowodzi zgodności
każdego streszczenia ze stroną WWW ani aktualności prawa. Nie naprawia
historycznych wadliwych szkiców i nie odzyskuje treści strony JS.
Odświeżenie hashy po cleanup oraz serializacja konkurencyjnych zgłoszeń
pozostają oddzielnymi naprawami.

Zmiany kodu przygotowuje się w izolowanym checkoutcie zgodnie z
`scripts/AGENTS.md`. Sam zapis kodu nie jest dowodem wdrożenia:
kontrolowane przeniesienie do checkoutu usług i ewentualny reload/restart
wymagają ustalenia entrypointów i odrębnego potwierdzenia stanu runtime.
Nie wykonuje się commitu, publikacji Git ani restartu usług w ramach
przygotowania specyfikacji.
