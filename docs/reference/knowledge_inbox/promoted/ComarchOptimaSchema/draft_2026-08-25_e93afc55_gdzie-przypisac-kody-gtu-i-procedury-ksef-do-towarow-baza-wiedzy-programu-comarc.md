# Gdzie przypisać kody GTU i procedury KSeF do towarów? – Baza Wiedzy programu Comarch ERP Optima
- draftId: `draft_2026-08-25_e93afc55_gdzie-przypisac-kody-gtu-i-procedury-ksef-do-towarow-baza-wiedzy-programu-comarc`
- kbNamespace: `ComarchOptimaSchema`
- status: `promoted`
- promotedAt: `2026-09-01T08:08:09.000Z`
- sourceUrl: https://pomoc.comarch.pl/optima/pl/2026_5/dokumentacja/gdzie-przypisac-kody-gtu-i-procedury-ksef-do-towarow/
- tags: `exa`, `auto-draft`, `recency_question`
- reviewNote: Approved and exported from dashboard
## Content
External source discovered via Exa query: Comarch ERP Optima 2026.5.1 x64 — encja Manufacturer / Producent towaru, przygotowanie pełnego podstawowego CRUD dla API i MCP. Proszę o kompletny preflight techniczny: znaczenie biznesowe i dokładna pełna ścieżka w GUI; dokładny ProgID, interfejs COM/SDK, kolekcja i ścieżka tworzenia obiektu; zachowanie AddNew, wartości domyślne i pola wymagane; odczyt oraz wyszukiwanie/enumerację po ID i kodzie; wszystkie istotne właściwości czytelne i zapisywalne, obiekty zagnieżdżone i kolekcje podrzędne; semantykę Update, Delete, ewentualnej dezaktywacji, Verify/commit/Session.Save; tabele SQL CDN, klucze główne, unikalności, FK, triggery i wiarygodne join paths; zależności biznesowe blokujące aktualizację lub usunięcie; pola lub zachowania dostępne tylko w GUI. Zakres: COM/SDK/SQL schema, without tax advice. Proszę rozdzielić odpowiedź na POTWIERDZONE FAKTY, WNIOSKI i HIPOTEZY oraz wskazać źródłowe fragmenty/dokumenty dla faktów.
Title: Gdzie przypisać kody GTU i procedury KSeF do towarów? – Baza Wiedzy programu Comarch ERP Optima
URL: https://pomoc.comarch.pl/optima/pl/2026_5/dokumentacja/gdzie-przypisac-kody-gtu-i-procedury-ksef-do-towarow/
Tier: official
Published: 2026-02-07T00:00:00.000Z
Summary:
POTWIERDZONE FAKTY
- Artykuł dotyczy przypisywania kodów GTU i procedur KSeF (KSeF) do towarów w Comarch ERP Optima 2026.5.
- Dwa tryby przypisania:
- Indywidualnie: karta pojedynczego towaru → Dodatkowe → KSeF → wybór GTU i procedury.
- Seryjnie: Lista zasobów/Cennik → zaznacz towary → operacje seryjne → Zmiana parametrów karty → Ustaw domyślny kod JPK_V7 → wybór kodu/procedury.
- Dane przenoszone do dokumentu: na zakładkę Atrybuty/JPK całego dokumentu oraz na zakładkę KSeF w konkretnej pozycji; zmiana w zakładce KSeF nie synchronizuje z Atrybuty/JPK po zapisie, ale dane do KSeF są przesyłane poprawnie.
- Artykuł źródłowy pochodzi z Bazy Wiedzy Comarch ERP Optima (kategoria KSeF), aktualizacja 02/07/2026.
WNIOSKI
- Artykuł nie omawia pełnego CRUD dla encji Manufacturer/Producent; skupia się na przypisywaniu GTU i procedur KSeF do towarów oraz wpływie tych ustawień na dokumenty.
- Bra...

Operator notes:
Automatyczny draft utworzony z odpowiedzi fallback KB-first. Sprawdź przed promocją.
This draft came from external search and requires review before promotion into a KB.