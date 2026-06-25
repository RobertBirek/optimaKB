# OPT032 – Handlowy dokument identyfikacyjny
- draftId: `draft_2026-06-18_1bf43cdf_opt032-handlowy-dokument-identyfikacyjny`
- kbNamespace: `ComarchOptimaReference`
- status: `promoted`
- promotedAt: `2026-06-18T10:31:55.641Z`
- sourceUrl: https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/opt032-handlowy-dokument-identyfikacyjny/
- tags: `handlowy dokument identyfikacyjny`, `HDI`, `faktura sprzedaży`, `wydruk`, `Comarch ERP Optima`, `towar`, `dokumentacja`
- reviewNote: Bulk approved 2 drafts from dashboard
## Content
OPT032 – Handlowy dokument identyfikacyjny – Baza Wiedzy programu Comarch ERP Optima

Data aktualizacji: 20-11-2019

Spis treści

### Wstęp

### Handlowy dokument identyfikacyjny – dane o towarze

### Handlowy dokument identyfikacyjny – wydruk

### Handlowy dokument identyfikacyjny – podłączenie wydruku do Comarch ERP Optima

#### Pliki do pobrania

## Wstęp

29 czerwca 2003 weszło w życie Rozporządzenie Ministra Rolnictwa i Rozwoju Wsi (Dz. U. nr 106, poz. 1000), w którym podany został wzór handlowego dokumentu identyfikacyjnego (HDI) obowiązujący w obrocie niektórymi artykułami spożywczymi pochodzenia zwierzęcego. Na podstawie tego rozporządzenia mięso rozebrane oraz jego przetwory, podobnie jak inne produkty wymienione w rozporządzeniu, zaopatrywane będą w handlowy dokument identyfikacyjny wystawiany przez firmę wprowadzającą na rynek środki spożywcze pochodzenia zwierzęcego.

W Comarch ERP Optima dokument HDI można wydrukować z poziomu formularza faktury. W tym celu należy do wydruków użytkownika podłączyć wydruk załączony do tego biuletynu.

Uwaga

Wydruk dokumentu HDI odbywa się przy pomocy Generatora Raportów.

## Handlowy dokument identyfikacyjny – dane o towarze

Aby na dokumencie HDI wydrukowane zostały informacje dotyczące towarów pobranych na Fakturę Sprzedaży, należy najpierw uzupełnić dane na karcie towaru.

Niezbędne parametry to:

- nazwa towaru
- opis towaru (obligatoryjny)
- jednostka miary (powinna być to jednostka wagowa np. kg)
- jednostka pomocnicza (jednostka opakowania zbiorczego)
- ilość jednostek podstawowych w opakowaniu zbiorczym

Dane pobierane bezpośrednio z Faktury Sprzedaży:

- nazwa i adres wysyłającego (dane adresowe z Pieczątki Firmy)
- numer faktury, do której drukowany jest dokument HDI
- data wysyłki (data wystawienia faktury)
- ilość towaru

Uwaga

Na dokument HDI nie są przenoszone pozycje, które na karcie towaru mają zdefiniowany typ usługa.

## Handlowy dokument identyfikacyjny – wydruk

Po wybraniu opcji wydruku HDI pojawia się dodatkowe okno, w którym należy wprowadzić dane, które wymagane są na dokumencie HDI, a nie ma ich na Fakturze Sprzedaży:

- numer dokumentu HDI
- weterynaryjny numer identyfikacyjny zakładu
- rynek, na który zakład został zakwalifikowany do prowadzenia sprzedaży. Po wyborze opcji inne państwa pojawia się dodatkowe pole, gdzie należy wprowadzić rynki sprzedaży innych państw
- pochodzenie surowca
- miejsce pozyskania, przetworzenia lub składowania
- miejsce przeznaczenia
- rodzaj transportu i jego numer identyfikacyjny
- komentarz – dane dotyczące procesu technologicznego, norm jakościowych i produkcyjnych oraz stosowanych przez producenta systemów kontroli jakości

Wprowadzone dane są zapamiętywane i podpowiadają się podczas wykonywania kolejnego wydruku HDI.

## Handlowy dokument identyfikacyjny – podłączenie wydruku do Comarch ERP Optima

W załączniku znajduje się przykładowy wydruk dokumentu HDI. Wydruk należy podpiąć na formularzu Faktury Sprzedaży (patrz Rysunek 1, poniżej).

W konfiguracji wydruków Formularz Faktury Sprzedaży, zakładka [Ogólne] importujemy definicję z pliku HDI.xml.

Rysunek 1. Import wydruku HDI.

## Pliki do pobrania