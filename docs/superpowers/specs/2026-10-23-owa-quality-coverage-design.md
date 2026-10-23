# OWA: pełna treść i jawne konflikty wersji

## Uzgodniony cel i granice

Usunąć fałszywe alarmy braku chunków powodowane różnymi identyfikatorami równoważnych rewizji. Zachować FAIL dla brakujących danych, zmienionej treści i niejednoznacznego wyboru wersji. Przygotować poprawkę i testy wyłącznie w izolowanym checkoutcie; nie wdrażać jej. Zweryfikować źródła „Korekta zbiorcza FA” i przedstawić rekomendację, bez edycji korpusu.

Bez zmian produkcyjnych exports/downloads/runtime/sekretów/usług, bez SQL, operacji zapisu MCP, eksportu produkcyjnego, builda, --auto-fix, restartu, publikacji, push ani wznowienia automatu. Brak nowych zależności. Pozostałe namespace'y zachowują obecne zachowanie bramki.

## Potwierdzony stan i nowe ustalenie

Diagnoza 23.10: 134 promowane snapshots / 67 tytułów, 67 encji / 190 chunków w lokalnym stagingu. Obecna bramka wybiera najdłuższą promowaną rewizję, exporter wybiera raw, a dopiero później uwzględnia fallback markdown. Zgłaszane 63 braki to 62 zgodne treści z innymi ID i jeden konflikt wśród WYBRANYCH rewizji. Nie jest to kontrola wszystkich historycznych wersji.

Kontrola WSZYSTKICH promowanych rewizji wykazała cztery grupy z różnymi pełnymi treściami: Potwierdzenie Salda PS, Faktura Proforma FPF, Wydanie Zewnętrzne WZ i Korekta zbiorcza FA. Bez jawnego wycofania lub wskazania wersji nie wolno zakładać, że krótsza rewizja jest nieobowiązująca. Użytkownik zatwierdził plan z zachowaniem FAIL dla wszystkich czterech grup 23.10.2026. Różna treść oznacza tu niejednoznaczność wersji, nie automatycznie sprzeczność wszystkich twierdzeń biznesowych.

## Rozważone podejścia

1. Rebuild/re-export: odrzucone. Odtworzony eksport daje pięć CSV identycznych bajtowo; nie naprawia błędu oceny.
2. Akceptacja po tytule/ID encji lub wybór najdłuższej/najnowszej rewizji: odrzucone. Może zamaskować uszkodzoną treść lub konflikt.
3. Pełna zgodność treści i proweniencji; różne zatwierdzone treści jako jawna niejednoznaczność: rekomendowane. Wymaga w przyszłości decyzji o czterech grupach, ale nie tworzy pozornego PASS.

Użytkownik zaakceptował ogólny zakres pełnej zgodności i zachowania FAIL dla konfliktów, a następnie jawnie zatwierdził konserwatywną obsługę wszystkich czterech grup.

## Proponowany kontrakt techniczny

Nowy czysty helper scripts/lib/owa_promoted_coverage.mjs, wyłącznie dla OWA. Wejścia: promotedDrafts, rawDrafts (metadane ścieżek), chunkRows, root. Żadnego I/O wewnątrz helpera.

- Grupować promowane snapshots po takim samym kluczu tytułu jak obecnie. Nie wybierać wersji według długości lub daty.
- Równoważność: dokładnie te same pełne segmenty otrzymane przez istniejące splitDraftContent(content, 1800). To ta sama normalizacja co exporter, bez semantycznego podobieństwa, usuwania słów lub pomijania sekcji.
- Pusta treść lub nieprawidłowa tożsamość: FAIL, nie ignorować takiej rewizji.
- Więcej niż jedna różna pełna treść w grupie: ambiguous_versions / FAIL. Raportować wszystkie draftIds, bez automatycznej decyzji o prawdziwości treści.
- Wyznaczyć właściciela przez makeId('OWA_ENTITY', draft.title). Różne IDs w jednej grupie albo kolizja właściciela między różnymi grupami: ambiguous_identity / FAIL.
- Wybierać chunki wyłącznie przez dokładny sourceDocumentRefId; wzmianka ID/URL w cudzym content nie jest dowodem pokrycia.
- Wymagać dokładnie pełnego zestawu segmentów: liczba, sectionOrder 1..N bez luk i duplikatów, treść każdego segmentu. Fizyczna kolejność rekordów CSV nie ma znaczenia, decyduje sectionOrder. Nadmiarowe segmenty też są błędem.
- Wymagać jednej spójnej sourcePath dla wszystkich segmentów. Musi dokładnie odpowiadać rawMarkdownPath istniejącej raw rewizji o tym samym ID i namespace co jedna z równoważnych promowanych rewizji. Ścieżki relatywizować względem root; ścieżka spoza downloads/knowledge_inbox lub spoza root nie jest poprawną proweniencją. Nie odgadywać dat ani pochodzenia z tytułu.
- Brak raw metadanych/proweniencji: invalid_provenance / FAIL. Nie odczytywać markdown jako sposobu uzupełniania pustego zatwierdzonego snapshotu.

Wynik helpera: { promotedCount, groupCount, coveredCount, issues }. Każdy issue: { kind, title, draftIds, reason, entityId? }. kind: invalid_draft, ambiguous_versions, ambiguous_identity, missing_chunks, invalid_chunk_layout, content_mismatch, invalid_provenance. Jeden główny issue na grupę, w wymienionej kolejności sprawdzania; coveredCount liczy wyłącznie grupy bez issue.

Bramka dodaje pole promotedCoverage tylko do wyniku OWA. Zachowuje errors jako tablicę stringów i exit 2 przy dowolnym issue. Komunikaty zaczynają się od „OWA promoted coverage <kind>: <count>”; nie używają starego prefiksu automatycznego rebuilda. Nowe konflikty nie mogą uruchamiać auto-fix. Dotychczasowe CSV/manifest/job checks nadal działają.

## Dowody i kryteria odbioru

Testy syntetyczne i CLI: równoważne rewizje z innym ID i datą przechodzą; brak segmentu, zmiana treści, mylna proweniencja, uszkodzona kolejność, brak raw, kolizja tożsamości i niejednoznaczne wersje nie przechodzą. Testować brak automatycznego rebuilda przy nowych issue.

Odczyt obecnych stagingów z zapisami raportów tylko do /tmp/opencode: oczekiwane FAIL z czterema ambiguous_versions; nie narzucać zielonego wyniku. Dla pozostałych 63 grup oczekiwać pełnej zgodności, a nie wyłącznie obecności encji. Sprawdzić przy implementacji i ujawnić ewentualne dalsze problemy zamiast dopasowywać test do prognozy.

Weryfikacja źródeł Korekta zbiorcza FA ma oddzielać: co robi historyczny przykład COM, co opisuje dokumentacja wersji 2026.4.1 oraz czego nie potwierdzono w obecnym API/runtime. Rekomendacja nie zastępuje zatwierdzenia nowej wersji korpusu.
