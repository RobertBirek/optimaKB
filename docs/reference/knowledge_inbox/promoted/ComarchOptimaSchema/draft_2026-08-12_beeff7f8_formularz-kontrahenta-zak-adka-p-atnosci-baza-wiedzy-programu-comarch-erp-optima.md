# Formularz kontrahenta – zakładka Płatności – Baza Wiedzy programu Comarch ERP Optima
- draftId: `draft_2026-08-12_beeff7f8_formularz-kontrahenta-zak-adka-p-atnosci-baza-wiedzy-programu-comarch-erp-optima`
- kbNamespace: `ComarchOptimaSchema`
- status: `promoted`
- promotedAt: `2026-09-01T10:15:44.275Z`
- sourceUrl: https://pomoc.comarch.pl/optima/pl/2025_5/dokumentacja/formularz-kontrahenta-zakladka-platnosci/
- tags: `exa`, `auto-draft`, `recency_question`
- reviewNote: Approved and exported from dashboard
## Content
External source discovered via Exa query: Pełny preflight encji rachunku bankowego w Comarch ERP Optima: COM/SDK/SQL schema, bez porad podatkowych.

Encja kandydacka: BankAccount, COM prawdopodobnie CDN.Rachunki, SQL prawdopodobnie CDN.BnkRachunki. Proszę rozdzielić fakty potwierdzone od hipotez.

Potrzebuję:
- dokładny ProgID, interfejsy COM i metody AddNew, Save, FilterById, Update, Delete/Usun;
- pola wymagane przy utworzeniu, pola zapisywalne/read-only (numer rachunku, nazwa, bank, waluta, IBAN, domyślny, opis);
- klucz PK i nazwy właściwej tabeli CDN.*, foreign keys do banku/waluty/formy płatności/kontrahenta;
- semantyka usuwania (fizyczne, soft-delete, ograniczenia zależności), aktualizacji i ustawiania domyślności;
- zachowanie GUI: gdzie tworzyć/edytować/usuwać, komunikaty oraz ograniczenia biznesowe;
- filtr/enumeracja po numerycznym ID.

Nie sugeruj bezpośrednich zapisów SQL.
Title: Formularz kontrahenta – zakładka Płatności – Baza Wiedzy programu Comarch ERP Optima
URL: https://pomoc.comarch.pl/optima/pl/2025_5/dokumentacja/formularz-kontrahenta-zakladka-platnosci/
Tier: official
Published: 2017-07-04T00:00:00.000Z
Summary:
Here is a concise, fact/fiction–separated answer based on the provided content and typical Comarch ERP Optima behavior. I note where facts are confirmed by the supplied text and where items are hypothesized.
Fakty potwierdzone w dostarczonych materiałach
- Enca: BankAccount (kandydacka) odpowiada ogólnej koncepcji kont bankowych kontrahentów.
- Widoczne pola kolumn w liście rachunków kontrahenta: Opis, Bank, Numer rachunku, Waluta, Domyślny, Data ostatniego sprawdzenia, W wykazie (Tak/Nie), Numer rachunku (pełny NRB/IBAN częściowy), Numer konta/NRB/IBAN wsparcie, IBAN (dla polskich rachunków), Nazwa banku (autom. po zatwierdzeniu akronimu), Waluta (podpowiadana i możliwość zmiany), Informacja o tym, czy rachunek widnieje w Wykazie podatników VAT MF.
- Domyślny rachunek: tylko jeden rachunek kontrahenta w danej walucie może być domyślny; zaznaczenie Domyślny na innym rachunku w tej sam...

Operator notes:
Automatyczny draft utworzony z odpowiedzi fallback KB-first. Sprawdź przed promocją.
This draft came from external search and requires review before promotion into a KB.