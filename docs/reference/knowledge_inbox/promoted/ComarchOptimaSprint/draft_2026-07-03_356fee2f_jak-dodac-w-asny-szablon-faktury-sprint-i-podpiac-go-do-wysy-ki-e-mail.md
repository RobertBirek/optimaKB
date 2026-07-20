# Jak dodać własny szablon faktury sPrint i podpiąć go do wysyłki e-mail
- draftId: `draft_2026-07-03_356fee2f_jak-dodac-w-asny-szablon-faktury-sprint-i-podpiac-go-do-wysy-ki-e-mail`
- kbNamespace: `ComarchOptimaSprint`
- status: `promoted`
- promotedAt: `2026-07-03T06:41:43.215Z`
- sourceUrl: https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/jak-dodawac-edytowac-wydruki-sprint/
- tags: `sprint`, `email`, `wydruki`, `faktura`, `wysylka`
- reviewNote: Dobra treść - instrukcja krok po kroku dla sPrint. Promuję.
## Content
## Pytanie
Jak dodać własny szablon faktury sPrint do szablonu maila (wysyłki e-mail) w Comarch ERP Optima?

## Odpowiedź

Proces składa się z dwóch etapów: (1) utworzenie własnego wzorca wydruku w edytorze Comarch sPrint, (2) podpięcie tego wzorca jako załącznika przy wysyłce dokumentu mailem.

### 1. Dodanie własnego wzorca wydruku w sPrint

1. Na liście dokumentów (np. faktur sprzedaży) lub na formularzu dokumentu rozwiń **Wydruk danych** / **Podgląd wydruku** i wybierz **Konfiguracja wydruków…** (skrót **Ctrl+F2**).
2. Dodaj własny **zestaw wydruków** (ikona plusa na gałęzi procedury/kontekstu), a następnie w tym zestawie dodaj nowy **wydruk** (ikona plusa na gałęzi zestawu).
3. Na formularzu wydruku, zakładka **[Ogólne]** – ustaw typ **sPrint** (pozostałe typy to Crystal, GenRap, XML; UWAGA: Crystal Reports i GenRap tracą wsparcie od 1 kwietnia 2026 r. i będą zastępowane odpowiednikami sPrint).
4. Przejdź na zakładkę **[Definicja]** i kliknij ikonę lupy w prawym dolnym rogu – otworzy się edytor **Comarch sPrint**.
5. W edytorze skonfiguruj źródło danych przez **Konfigurator danych szablonu** (wybór tabel/pól, istniejąca procedura lub własne zapytanie SQL) albo pomiń konfigurator (ikona krzyżyka) i zaprojektuj wydruk od pustego szablonu.
6. Po zakończeniu edycji kliknij **„Wyślij do Comarch ERP”** – szablon zostanie zapisany i podłączony pod wskazany zestaw wydruków (widoczny odtąd jako „wydruk użytkownika”).

Dodatkowe opcje: eksport/import definicji wydruku do pliku **.SP** (zakładka [Definicja], ikony Eksportuj/Importuj definicję), oraz klonowanie istniejącego wydruku (Ctrl+Insert lub Ctrl++ na liście w Konfiguracji wydruków).

### 2. Podpięcie wzorca do wysyłki e-mail

Nowo utworzony wzorzec pojawia się automatycznie na liście „wydruki użytkownika” we wszystkich miejscach, gdzie wybiera się wzorzec wydruku do załącznika:

- **Wysyłka ręczna pojedynczego dokumentu**: w oknie wysyłki e-mail wybierz własny wzorzec z listy **Wzorzec wydruku**, a szablon treści wiadomości z listy **Szablon e-mail** (zdefiniowanych dla danego typu formularza, np. faktury sprzedaży).
- **Automat wysyłki faktur** (System/Konfiguracja/Program/CRM/Automat wysyłki faktur): w sekcji **Załączniki do wiadomości** wskaż własny wzorzec osobno dla faktur w PLN („Wydruk faktury w walucie PLN”) i w walucie obcej („Wydruk faktury w walucie obcej”) – lista zawiera standardowe wydruki, wydruki użytkownika oraz opcję „nie wysyłaj załącznika”. W polu **Szablon e-mail** wybierz szablon treści (domyślnie „Faktura dla klienta”).

Wymagana wcześniej konfiguracja: konto e-mail (Konfiguracja Programu/CRM/Konta e-mail) oraz – dla wersji stacjonarnej – usługa Comarch ERP Optima Serwis Operacji Automatycznych.

## Uwagi
- Modyfikacja standardowych (systemowych) wzorców nie jest możliwa bezpośrednio – nowy wydruk można dodać tylko do zestawu utworzonego przez użytkownika (lub sklonować wydruk standardowy).
- Więcej o samym edytorze sPrint: https://pomoc.comarch.pl/sprint/ (w tym filmy instruktażowe).
- W razie problemów z konfiguracją wydruków sPrint: kontakt przez System Obsługi Zgłoszeń Asysty Technicznej (https://www.asysta.comarch.pl/).