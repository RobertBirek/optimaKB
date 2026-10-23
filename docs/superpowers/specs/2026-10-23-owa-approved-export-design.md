# OWA: eksport wyłącznie zatwierdzonych wersji

## Zatwierdzony kontrakt

Operator zatwierdził w rozmowie izolowane poprawki i testy eksportera, bez wdrożenia/builda. Następnie zaakceptował odmowę całego eksportu przy nierozstrzygniętych wersjach oraz pozostawienie relacji biznesowej w opisie i pustych aliasów dla nowej syntezy. Ten dokument utrwala zaakceptowany krótki projekt; nie jest zgodą na późniejszy import lub zmianę korpusu.

Cel: usunąć możliwość wyboru wycofanej/nierozpatrzonej treści przez ranking raw oraz niekompletne sourceRoots, zachowując kontrakt pięciu CSV i istniejące ograniczenia wiedzy.

## Podejścia

1. Ranking wszystkich raw po długości/dacie: odrzucony, ponieważ nie respektuje decyzji redakcyjnych.
2. Tylko promowane snapshots, zgodne z rejestrem; wszystkie konflikty blokują zapis: wariant wybrany przez operatora.
3. Częściowy eksport po pominięciu konfliktów: odrzucony; brakujące encje nie mogą wyglądać jak kompletny eksport.

## Wybór źródeł

- Źródłem treści jest `content` aktywnego snapshotu `OWAOntology`, nie raw JSON ani Markdown. Nie ma fallbacku do innej wersji lub pliku raw.
- Snapshot i pojedynczy wpis rejestru muszą mieć zgodny ID, namespace, status `promoted` i ścieżki snapshotów. Aktywny wpis bez snapshotu lub niespójny snapshot blokuje eksport. Raw służy wyłącznie do mapowania po ID i walidacji pochodzenia; jego treść nie zastępuje snapshotu.
- Normalizacja grup tytułów, właściciele `makeId('OWA_ENTITY', title)` oraz równoważność pełnych `splitDraftContent(content, 1800)` odpowiadają bramce OWA. Różne segmenty oznaczają `ambiguous_versions`; nie wybieramy najnowszej/najdłuższej wersji. Niejednoznaczne tożsamości także blokują zapis.
- Dla równoważnych rewizji wybieramy deterministycznie najmniejszy leksykalnie ID (propozycja techniczna implementatora); wszystkie równoważne ID zachowujemy w proweniencji. Brak aktywnych wersji, pusty content lub nieprawidłowe ID także oznaczają odmowę, nie pusty eksport.
- Raw źródło każdego wybranego ID musi jednoznacznie należeć do tego samego namespace i inboxa pod zadanym ROOT; ścieżki spoza ROOT/inboxa są błędem. Nie zmieniamy wspólnych helperów promocji ani polityki bramki.

## Zapis i metadane

- Weryfikujemy cały zbiór wejściowy i przygotowujemy wiersze przed pierwszym utworzeniem/zmianą katalogu eksportu. Błąd kwalifikacji, parsowania lub konflikt kończy CLI kodem różnym od zera, z maszynowo czytelnym zestawem problemów, bez zmiany istniejących CSV, README i manifestów.
- Ten etap nie obiecuje transakcji pięcioplikowej podczas awarii dysku/procesu w trakcie poprawnego zapisu. Nie dodajemy zmian do wspólnego writera.
- Pięć CSV, ich kolumny, generowanie ID, parser sekcji oraz chunkowanie pozostają zgodne z istniejącym formatem.
- `chunk.sourcePath` zachowuje względną ścieżkę raw Markdown jako metadane pochodzenia; treść pochodzi ze snapshotu. Nie odczytujemy raw Markdown jako źródła tekstu.
- `sourceType` opisuje promowane snapshots. `sourceRoots` jest posortowaną unikalną listą katalogów raw źródeł rzeczywiście wybranych rewizji. Manifest dodatkowo zapisuje wybrany draft ID, równoważne zatwierdzone ID, ścieżki snapshotu/raw oraz SHA256 treści dla każdej encji.
- Relacja korekty z wieloma fakturami zostaje w opisie/chunkach. Nie przywracamy starego N:M, JOIN, VAT/rozrachunków ani `create_sales_correction`. Brakujące aliasy/status/pewność nie są uzupełniane z wycofanych wersji; nie zmieniamy tego braku w stwierdzenie ich niepoprawności lub nieistnienia funkcjonalności.

## Granice i dowody

- Kod/dokumenty wyłącznie w istniejącym izolowanym worktree. Fixture i próby wyłącznie w nowych katalogach pod `/tmp/opencode/`. Bez zmian `/docker/openspg` exports/downloads/rejestru/kodu produkcyjnego, usług, schematu lub grafu; bez builda, pushowania i scalania.
- Testy offline: wycofany dłuższy raw nie wygrywa, zmienione raw nie zastępuje snapshotu, zgodność rejestru i ścieżek, równoważne rewizje, konflikty/tożsamość, pełna proweniencja, brak zapisu przy odmowie.
- Poprawny pełny eksport sprawdzamy na syntetycznym jednoznacznym korpusie. Rzeczywista zamrożona kopia z poprzedniej próby ma nadal PS/FPF/WZ: oczekujemy odmowy całego eksportu i zachowania zastanych plików. Nie zmieniamy kopii, żeby pozornie rozstrzygnąć wersje.
- Nie deklarujemy PASS pełnego korpusu, aktualnego grafu ani jakości odpowiedzi modelu. UPSERT oraz interpretacja pustych wartości przez builder pozostają poza zakresem.

## Stan przygotowania

Odczyt zamrożonej kopii: 133 snapshots, 135 raw, bez rozbieżności wpisów aktywnych i mapowania ścieżek. Poprzedni próbny eksport i niezależny przegląd: `/tmp/opencode/owa-trial-export-20261023-AdmdVv/`. To dowód diagnostyczny, nie wykonanie poniższego planu.
