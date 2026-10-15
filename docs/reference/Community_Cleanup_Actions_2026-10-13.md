# Community — uporządkowanie szkiców i szerszy audyt

## Wykonane decyzje operatora

Operator zatwierdził odrzucenie dwóch potwierdzonych wadliwych kopii wątku
77145 oraz odzyskanie źródła 77295 i audyt szerszego zakresu.

Obie decyzje wykonano 2026-10-13 około 09:14 UTC przez wspierany skrypt
`scripts/manage_knowledge_inbox.mjs reject`, jako użytkownik `mcpbot`,
z aktorem `opencode` i indywidualnym uzasadnieniem.

| Szkic | Przyczyna | Końcowy status |
|---|---|---|
| `draft_2026-08-02_7b5dd1ca_problemy-z-odbiorem-faktur-z-ksef-spo-ecznosc-erp` | Relacje FK i referencje chunk zamiast treści wątku | `rejected` |
| `draft_2026-08-02_a3442aa7_problemy-z-odbiorem-faktur-z-ksef-spo-ecznosc-erp` | Odmowa modelu zamiast treści wątku | `rejected` |

Skrypt zapisuje registry i audyt; nie edytowano ręcznie raw JSON/Markdown.
Końcowy odczyt przez `listInboxDrafts()` potwierdził oba statusy i reviewNote.
Sprawdzenie zapisywalności registry dla `mcpbot` zakończyło się exit 0.

## Odzyskane źródło Betterfly 77295

W czystej sesji Chromium odczytano publiczne pytanie i wszystkie pięć
komentarzy, w tym trzy odpowiedzi zagnieżdżone. Użyto normalnych kontrolek
witryny: ustawienia prywatności, odrzucenie opcjonalnych cookies i rozwinięcie
odpowiedzi. Nie logowano się, nie publikowano i nie głosowano.

- URL: https://www.spolecznosc.comarch.pl/question/comarch-betterfly-efaktury-automatyczna-wysylka-fs-do-ksef-77295
- Pełny odczyt: 2026-10-13T09:25:42.876Z.
- Tekst: `/tmp/opencode/community-77295-expanded-v2-thread-full.txt`.
- Dowody DOM, screenshot i provenance: prefiks
  `/tmp/opencode/community-77295-expanded-v2-`.
- Raport: `Community_77295_Browser_Recovery_2026-10-13.md`.

Historyczna wypowiedź z 21.01.2026 zapowiada parametr „Tylko odbiór dokumentów”.
Nie potwierdza to aktualnego zachowania produktu ani realizacji zapowiedzi.
Stary title-only szkic `draft_2026-08-02_e107b7d2_comarch-betterfly-efaktury-automatyczna-wysy-ka-fs-do-ksef`
pozostaje `pending`: nie zastępowano go ręcznie ani nie promowano.

## Wyniki audytu

Raport: `Source_Contamination_Audit_2026-10-13.md` oraz companion JSON.
Przesiew objął 448 raw draftów wszystkich statusów i 303 lokalne promowane
rekordy. Promowane kopie pokrywają się z raw ID, więc 751 reprezentacji nie
oznacza 751 niezależnych dokumentów.

Potwierdzono 29 ID z wadą integralności źródła, w tym 14 z obecną promowaną
kopią. Kategorie obejmują obce treści modelu, komentarze procesowe, spekulacyjne
streszczenia oraz sam tytuł/powłokę. Potwierdzenie wady nie oznacza, że wszystkie
pozostałe zdania dokumentu są fałszywe. Siedem dodatkowych ID pozostaje
niepewnych. Osobno zidentyfikowano 67 pustych promowanych ciał OWA jako lukę
kompletności, nie dowód tego samego zanieczyszczenia.

Audyt wykonano przed dwoma odrzuceniami. Jego snapshot liczył 13 pending,
14 promoted, 1 rejected i 1 withdrawn wśród potwierdzonych ID; po decyzjach
te same 29 ID obejmuje 11 pending, 14 promoted, 3 rejected i 1 withdrawn.
Nie nadpisano historycznej migawki audytu.

Promowane przypadki do osobnej korekty:

- Community: 2;
- Accounting VAT: 3;
- Legal: 2;
- Payroll HR: 7.

Koordynator dodatkowo odczytał trzy najsilniejsze promowane dowody:
`de720ffd` (katalog schematu pod URL artykułu JPK), `bf920a10` (jawne powołanie
na wewnętrzną wiedzę modelu), `d1c8371c` (preface o własnej analizie bez referencji).
Nie wycofywano tych rekordów i nie badano ich ekspozycji w live graph.

## Końcowy stan i dalszy zakres

Odczyt po działaniach: 448 raw draftów, 111 pending, 303 lokalne promowane
rekordy. Jedynymi zmianami statusu są dwa zatwierdzone odrzucenia 77145.
Brak promocji, wycofań, buildów, zmian polityk i usług w tym zadaniu.

Następna naprawa powinna objąć indywidualne porównanie oryginalnych źródeł
14 wadliwych promowanych materiałów i ustalenie ich pochodnych eksportów/
chunków. Odzyskane źródło 77295 pozwala przygotować poprawny historyczny
szkic wspieraną ścieżką, lecz nie dokonano jeszcze tej ingestii.
