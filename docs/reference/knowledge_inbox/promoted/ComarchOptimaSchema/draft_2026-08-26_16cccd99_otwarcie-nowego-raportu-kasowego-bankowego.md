# Otwarcie nowego raportu kasowego/bankowego
- draftId: `draft_2026-08-26_16cccd99_otwarcie-nowego-raportu-kasowego-bankowego`
- kbNamespace: `ComarchOptimaSchema`
- status: `promoted`
- promotedAt: `2026-09-01T07:07:29.473Z`
- sourceUrl: https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/otwarcie-nowego-raportu-kasowegobankowego/
- tags: `exa`, `auto-draft`, `recency_question`
- reviewNote: Approved and exported from dashboard
## Content
External source discovered via Exa query: Dla Comarch ERP Optima 2026.5.1 x64 wykonaj szeroki audyt encji raportu kasowego/bankowego, roboczo nazywanej CashBankReport, bez ograniczania domen wiedzy. COM/SDK/SQL schema, without tax advice.

Obejmij:
1) znaczenie biznesowe raportu kasowego/bankowego i jego granice względem rejestru kasowego/bankowego (BankAccount), zapisu kasowego/bankowego (Payment) i Settlement;
2) pełną, dokładną ścieżkę GUI oraz wszystkie istotne akcje: utworzenie/otwarcie, zamknięcie, ponowne otwarcie, edycja, usunięcie, blokady i komunikaty;
3) COM/SDK: ProgID, interfejs, kolekcję, AddNew, wartości domyślne, pola wymagane, lookup/enumerację po ID, numerze i rejestrze, wszystkie istotne właściwości zapisywalne/odczytywalne, podkolekcje, Update/Delete/dezaktywację/zamknięcie/Save/Session.Save;
4) SQL: tabele główne i zależne, pełne klucze główne, unikalne indeksy, FK, triggery, join paths, kolumny statusu otwarcia/zamknięcia, daty, numeracji, waluty, sald i relacji do zapisów oraz rejestru;
5) warunki blokujące update/delete/zamknięcie/ponowne otwarcie, w tym istniejące zapisy, księgowanie, rozliczenia, okresy i formy płatności;
6) pola GUI-only, COM-only i SQL-only oraz rekomendowany minimalny kontrakt CRUD/MVP dla REST i MCP.

Oddziel odpowiedź dokładnie na sekcje POTWIERDZONE, WNIOSEK i HIPOTEZA. Przy każdym twierdzeniu podaj źródło albo wskaż, czego brakuje do potwierdzenia. Nie udzielaj porad podatkowych.
Title: Otwarcie nowego raportu kasowego/bankowego
URL: https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/otwarcie-nowego-raportu-kasowegobankowego/
Tier: official
Published: 2025-01-29T00:00:00.000Z
Summary:
POTWIERDZONE
- Cel i zakres raportu kasowego/bankowego w Comarch ERP Optima 2026.5.1 x64 (CashBankReport) obejmuje otwieranie, prowadzenie i powiązanie z dokumentami z Biblioteki oraz możliwość dodawania załączników. Źródło: artykuł pomocy o otwieraniu nowego raportu kasowego/bankowego, pola Formularza raportu (Rejestr, Numer, Numer obcy, Data otwarcia, Status, Data zamknięcia) i operacje załączników (Dokumenty zakładane na raport; “Dodaj nowy” / “Dodaj istniejący”). Brak pełnej definicji modelu danych, nie dostarczono pełnego zestawu API COM/SDK ani schematu SQL w tej publikacji. Wniosek: potwierdzono ogólne działanie GUI i powiązania z dokumentami; brak potwierdzenia pełnej specyfikacji API/DB w podanym źródle.
- Znaczenie biznesowe: raport kasowy/bankowy służy do prowadzenia formalnego zapisu operacji kasowych i bankowych w określonym rejestrze (Rejestr) z możliwością powiązania z ...

Operator notes:
Automatyczny draft utworzony z odpowiedzi fallback KB-first. Sprawdź przed promocją.
This draft came from external search and requires review before promotion into a KB.