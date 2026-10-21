# Zamknięcie prywatnego PoC explicit record evidence

## Decyzja końcowa

Prywatny PoC został ukończony w worktree `/tmp/opencode/openspg-explicit-evidence-poc-20261021`, branch `poc/semantic-explicit-evidence-20261021`, baza `dfb1c8ec40f0639f291e216481277ee3cc7a791d`. Zmiany pozostają niecommitowane. Zachowano worktree i artefakty; nie wykonano publikacji narzędzi, wdrożenia ani operacji usług.

Implementację objęło sześć niezależnych bramek spec/quality oraz końcowy przegląd całej zmiany. Wszystkie problemy Important/Critical zgłoszone podczas realizacji zostały zamknięte. Końcowy przegląd zatwierdził zakończenie **prywatnego PoC** z jedną nieblokującą uwagą M1.

Ta notatka domyka historyczny status „independent review pending” w zapieczętowanych raportach wykonawcy. Ich oryginalne bajty i hashe pozostają niezmienione.

## Dowody przeglądów i kontroli

- Task 6: reviewer `ses_ea0752206ffeCTTzIkdexkjLOD`, spec Approved / quality Approved with one Minor.
- Cała zmiana: reviewer `ses_ea0703af0ffe8fhxbfW5CP4pHU`, ready for PRIVATE PoC completion; zero Critical, zero Important, jedna Minor.
- Pełny pakiet przeglądu: `.superpowers/sdd/final-branch-after-21a6db0a-e3a7-4c7d-8bf9-1e8efcf3bb23.diff.md`, SHA256 `87ac90a8cabb30b45edab37b400f325913ebd4c1accd616a4d56faf899a0b39b`.
- Pełny zakończony przebieg: **412/412 raw**, **29/29 legacy**, bez failures/cancellations/skips. Nie dodawać do nich powtórzonych podzbiorów.
- Kontrola koordynatora po przeglądach: `npm run check`, `python3 scripts/validate-module-map.py`, `git diff --check` — poprawne. `.superpowers/sdd/controller-completion-seal.log` potwierdza zgodność aktualnych źródeł z wykonanym przebiegiem, kodu, norm, pięciu plików danych, raportów i logów. Jest to świeża kontrola integralności; nie ponowne wykonanie 412 testów.

## Wynik mechaniczny

Zaimplementowano `erp_subject.discover` oraz `erp_evidence.get` w prywatnym profilu OWA-only. Zweryfikowano autoryzację przed odczytem, ścisłe schematy, pełne rekordy, obowiązkowy kontekst E, 2 workery / 8 oczekujących zadań oraz tożsamość kodu i danych w obu slotach.

| Scenariusz | Wywołania | Rekordy / właściciele / UTF16 pól | Wynik weryfikatora |
|---|---:|---:|---|
| konto bankowe kontra księgowe | 2 | 8 / 2 / 13175 | valid, contract_only |
| operator → data dla kontrahenta | 3 | 4 / 1 / 2600 | valid, contract_only |
| konto bankowe → BRa_IBAN | 3 | 4 / 1 / 6579 | valid, contract_only |

Indeks obejmuje 366 rekordów, 5243 postings i 1347 diagnostyk. Pięć plików danych zajmuje 3792764 bajty, kod runtime 657369 bajtów; oba mieszczą się w oddzielnych limitach. Snapshot: `4767385d4ff213f519527daf0f173b7bcaf7b399b3b4daa0c3ef4941e7db1d69`.

Artefakty wykonania: `.superpowers/sdd/task6-test-b7fd5b4f-0dd4-4c1f-85fc-6ca4d7748715/`. Szczegółowy raport pomiarów: [Semantic_Explicit_Evidence_PoC_2026-10-21.md](Semantic_Explicit_Evidence_PoC_2026-10-21.md), SHA256 `f49fa02ef1bf853d61e1f6dc02475db7fafa8ef9ac7d5d11d471ca0f43074814`, oraz odpowiedni JSON, SHA256 `38bac0032da17ffbf0f0c3ae21c89ea200813414d903621795e857647f1f0876`.

## Pozostała uwaga M1

`scripts/run_semantic_raw_poc.mjs:279,286–288`: ukończony raport `BLOCKED` może zakończyć CLI kodem 0. Do automatyzacji trzeba sprawdzać status JSON, dopóki nie zostanie dodany niezerowy kod dla wyniku innego niż DONE i test tej granicy. Przegląd uznał to za nieblokujące dla zachowanego przebiegu DONE; uwaga pozostaje jawnie otwarta, bez deklaracji jej naprawienia.

## Granice wniosków

Nie uruchamiano modelu-klienta ani świeżego holdoutu. Trzy scenariusze są deterministycznymi testami mechaniki wyboru i dostarczania źródeł, nie oceną naturalnojęzykowych odpowiedzi. `returned_all` nie oznacza kompletności semantycznej ani aktualności SQL. Stare A8 nadal ma status **FAIL/BLOCKED 1.25**, a znane20 — **1 PASS / 12 PARTIAL / 7 MISS**.

Raport zachowuje historię nieudanych komend, w tym przypadkowy niecytowany wzorzec wyboru testów z etapu Task5, który uruchomił autodiscovery i zakończył się błędem wersji Node/Playwright; możliwe dotknięcie katalogu startowego `/tmp/erp-kb-playwright` nie jest ukrywane. Nie zaliczono tej komendy do GREEN ani do dowodu braku historycznych efektów ubocznych. Zerowe naruszenia osłon dotyczą prawidłowych, jawnie opisanych przebiegów raw PoC.
