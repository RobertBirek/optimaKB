# Semantic Explicit Evidence v3: decyzja, 2026-10-21

**Status: projekt po niezależnym review Approved, 0 blocking; oczekuje na pisemną decyzję użytkownika.** Ten brief zastępuje [poprzedni brief](Semantic_Explicit_Evidence_PoC_Decision_2026-10-21.md) jako aktualny status decyzji. Historyczne pliki zachowujemy bez zmian.

## Kontrakt do akceptacji

Proponujemy dwa narzędzia: `erp_subject.discover` do odkrywania kandydatów metadanych i leksykalnych wzmianek oraz `erp_evidence.get` do pobierania wskazanych pełnych rekordów CSV. Serwer ma rolę **sourceOnly / source_records_only**. Istniejący model-klient MCP interpretuje treść, UNKNOWN i kwalifikacje oraz pisze odpowiedź; KB nie dodaje kolejnego modelu. Integralność rekordu i ownership nie poświadczają SQL, mapowania ani kompletności znaczenia. **Nie zaimplementowano tych narzędzi ani PoC.**

Proponowany nowy budżet: **8 unikalnych rekordów / 16000 jednostek UTF16 pełnego kanonicznego JSON `fields` / 2 właścicieli**, z obowiązkowym pełnym rekordem E każdego właściciela, liczonym raz. Na odpowiedź: do 2 discovery i 1 get, jeden snapshot, get tylko dla refów ujawnionych przez discovery (wyjątek ujawnienia: automatyczny E). OWA E/F/C-only i niezmienny bazowy ABI pozostają wiążące, podobnie 8 MiB danych i odrębne 2 MiB kodu. Legacy **2 źródła / 3 jednostki / 4000** oraz **A8 FAIL/BLOCKED 1.25** pozostają bez zmian.

## Podstawowa korekta discovery

W v3 przeszukujemy **całe E.description i F.description**, także gdy opis przekracza 240 UTF16 i pomijamy go w wyświetlanym hincie. To uzupełnia brak wyszukiwania po języku opisowym. Surowe nazwy F zachowują backticki jako **sourceSpelling i tożsamość metadanych**; nie uznajemy ich przez to za deklaracje poprawnych kolumn SQL. Normalizacja dopasowania nie zmienia zwracanej nazwy. Reguły AND, rankingu i oddzielnego lexera wzmianek pozostają takie jak w bazie.

Sprawdzenie plikowe: **109 nazw F, w tym 41 z backtickami; 65/67 opisów E >240 UTF16**. Dla metadanych `operator` daje **4 dopasowania / 2 właścicieli**, a `data` w zakresie kontrahenta **2 dopasowania**. To wyłącznie **FILE-ONLY** arytmetyka oryginalnych CSV, nie wykonany ranking, workflow, wynik narzędzia ani ocena jakości modelu. Ekspozycja wymaganych refów w pełnym rankingu nadal wymaga przyszłego sprawdzenia.

## Dostępne pełne payloady: arytmetyka, nie wynik PoC

| Wybór, z pełnym E | Rekordy / UTF16 / właściciele |
|---|---:|
| Trzy pola F kontrahenta + E | **4 / 2600 / 1** |
| Kontekst konta bankowego i księgowego | **8 / 13175 / 2** |
| Wybrany kontekst kontrahenta bez K3/K4 | **8 / 9231 / 1** |
| Kontekst konta bankowego | **4 / 6579 / 1** |
| Szerszy kontrahent z K3/K4 | **10 / 13436 / 1: przekracza limit 8** |

Obliczenia obejmują całe rekordy. Nie dowodzą pełnego mapowania SQL, zamknięcia kwalifikacji ani kompletności odpowiedzi; nie pozwalają obchodzić limitu kolejnymi partiami.

## Dokumenty i decyzja pisemna

Pełny kontrakt: [baza v2](../superpowers/specs/2026-10-21-semantic-evidence-contract-design.md), SHA256 `eb3dca5e6864133c8982005b79c3269d3de5c7193a5b1a847cd830541505d380`, wraz z [poprawką v3](../superpowers/specs/2026-10-21-semantic-evidence-contract-design-v3.md), SHA256 `52d5a93c2a9ba4ab8ee331e653a02eeed3f787e6e2f3f2fe79034d5e00312b13`. Finalne review: [v2](../superpowers/specs/2026-10-21-semantic-evidence-contract-review-final.md) i [v3](../superpowers/specs/2026-10-21-semantic-evidence-contract-review-v3.md). Historyczne „pending” w zamrożonych plikach pozostaje zapisem ich etapu.

**Proszę o pisemny wybór: „Akceptuję kontrakt v2 + poprawkę v3, rolę sourceOnly i nowy budżet 8 / 16000 UTF16 / 2 właścicieli z obowiązkowym pełnym E jako podstawę planowania prywatnego PoC” albo „Odrzucam / wymagam zmiany: …”.** Akceptacja stanowi podstawę planu; nie zakładamy udzielonej zgody na implementację.
