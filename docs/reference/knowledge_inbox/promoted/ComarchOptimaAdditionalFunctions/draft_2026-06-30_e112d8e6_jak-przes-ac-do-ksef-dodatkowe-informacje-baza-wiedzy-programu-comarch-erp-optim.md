# Jak przesłać do KSeF dodatkowe informacje? - Baza Wiedzy programu Comarch ERP Optima
- draftId: `draft_2026-06-30_e112d8e6_jak-przes-ac-do-ksef-dodatkowe-informacje-baza-wiedzy-programu-comarch-erp-optim`
- kbNamespace: `ComarchOptimaAdditionalFunctions`
- status: `promoted`
- promotedAt: `2026-06-30T12:54:41.405Z`
- sourceUrl: https://pomoc.comarch.pl/optima/pl/2026/page/7/?ht-kb-search=1&print=print-search
- tags: `discovery`, `official`, `funkcje dodatkowe`, `XML`, `XPT`, `przykłady`
- reviewNote: Bulk approved 4 drafts from dashboard
## Content
Automated source-discovery draft.

Query: Comarch ERP Optima funkcje dodatkowe XML XPT przykłady 2026
Source: https://pomoc.comarch.pl/optima/pl/2026/page/7/?ht-kb-search=1&print=print-search
Tier: official
Discovery confidence: 0.9

Tak. Do systemu KSeF można wysyłać dodatkowe informacje dotyczące zarówno całego dokumentu, jak i poszczególnych pozycji.
W programie istnieje możliwość przekazywania do KSeF dodatkowych informacji w węźle. Dzięki tej funkcji można ręcznie zdefiniować dowolne informacje, dla których nie przewidziano dedykowanych pól w standardowej strukturze faktury ustrukturyzowanej. Dane te wprowadza się jako parę: Klucz (nazwa pola) oraz Wartość (treść).
Przykład:
- Klucz: Numer_Projektu | Wartość: PL-2026-X1
- Klucz: Nr_Rejestracyjny | Wartość: WA12345
- Klucz: Miejsce_Dostawy | Wartość: Rampa_Nr_4
**Formularz faktury sprzedaży**
Aby dodać dodatkowe informacje, które będą odnosiły się do całej faktury, należy przejść do zakładki [KSeF], a następnie w podzakładce [Dodatkowe dane], w sekcji Informacje dodatkowe wybrać ikonę zielonego plusa. Następnie z rozwiniętej listy należy wybrać opcję Dodaj opis. W sekcji zostanie dodany wiersz dodatkowego opisu, który należy wypełnić uzupełniając klucz oraz wartość.
- Klucz – nazwa dodatkowej informacji dla odbiorcy dokumentu (np. Numer projektu, Kod sklepu, ID dostawcy).
- Wartość – konkretna treść tej informacji.
Dane na liście Dodatkowy opis na zakładce [KSeF] faktury odnoszą się do całego dokumentu.
*(Odpowiedź oparta na treści zawartej w pytaniu, nie na podanych referencjach, które pochodzą z dokumentacji technicznej baz danych i nie dotyczą opisywanego artykułu.)*

Review this draft before promotion.