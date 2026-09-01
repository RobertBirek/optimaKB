# Jakie informacje znajdują się na formularzu faktury sprzedaży? – Baza Wiedzy aplikacji Comarch ERP Optima w przeglądarce
- draftId: `draft_2026-08-27_24ed4947_jakie-informacje-znajduja-sie-na-formularzu-faktury-sprzedazy-baza-wiedzy-aplika`
- kbNamespace: `ComarchOptimaSchema`
- status: `promoted`
- promotedAt: `2026-09-01T07:02:25.285Z`
- sourceUrl: https://pomoc.comarch.pl/optima-online/pl/index.php/dokumentacja/jak-wystawic-fakture-sprzedazy/
- tags: `exa`, `auto-draft`, `recency_question`
- reviewNote: Approved and exported from dashboard
## Content
External source discovered via Exa query: Invoice / faktura sprzedaży FS w Comarch ERP Optima 2026.5.1 x64. Runtime COM create przez CDN.DokumentyHaMag.AddNew(null) odrzuca właściwość DDfID komunikatem, że System.__ComObject nie zawiera definicji DDfID. Potrzebuję potwierdzonego sposobu ustawienia definicji dokumentu FS (ID 1), typu 302, rodzaju 302000 i bufora przy AddNew: dokładna właściwość lub właściwość zagnieżdżona, ewentualnie poprawny argument AddNew. Uwzględnij lookup definicji po ID/symbolu, wymagane pola, Save/Verify, oraz mapowanie CDN.TraNag.TrN_DDfId. COM/SDK/SQL schema, without tax advice. Odpowiedź rozdziel na POTWIERDZONE, WNIOSEK i HIPOTEZA; bez ograniczania domains.
Title: Jakie informacje znajdują się na formularzu faktury sprzedaży? – Baza Wiedzy aplikacji Comarch ERP Optima w przeglądarce
URL: https://pomoc.comarch.pl/optima-online/pl/index.php/dokumentacja/jak-wystawic-fakture-sprzedazy/
Tier: official
Published: 2025-08-01T00:00:00.000Z
Summary:
POTWIERDZONE
- Formularz Faktury Sprzedaży w Comarch ERP Optima Online (opis w Bazie Wiedzy) zawiera zakładki: Dane podstawowe, Dane księgowe / JPK, Atrybuty, Dokumenty, KSeF.
- W sekcji Dane transakcyjne znajdują się pola Data wystawienia/Data sprzedaży (domyślnie bieżąca data, możliwość edycji; zmiana daty wymaga potwierdzenia warunków handlowych po edycji dokumentu z pozycjami) oraz sekcja Pozycje (lista pozycji z kolumnami: Lp., Kod, Nazwa, Ilość, Jednostka, Rabat, Cena netto/brutto, Wartość).
- Zakładka Dokumenty zawiera Dokumenty powiązane (wydanie zewnętrzne itp.), Bibliotekę dokumentów oraz Zadania i kontakty CRM (widoczność zależy od modułów).
- Zakładka KSeF gromadzi informacje o wysyłce do Krajowego Systemu e-Faktur (statusy, numer KSeF, UPO, parametry trybu wysyłki).
- Na dole formularza znajduje się pasek podsumowań Netto/Brutto/Zapłacono/Pozostaje i przyciski Zapisz, Zap...

Operator notes:
Automatyczny draft utworzony z odpowiedzi fallback KB-first. Sprawdź przed promocją.
This draft came from external search and requires review before promotion into a KB.