# Comarch Betterfly KSeF — Q&A artifacts CSV (23 rekordy)
- draftId: `draft_2026-06-02_d48cc20e_comarch-betterfly-ksef-q-a-artifacts-csv-23-rekordy`
- kbNamespace: `ComarchBetterflyReference`
- status: `promoted`
- promotedAt: `2026-06-05T12:00:26.239Z`
- sourceUrl: https://pomoc.comarchbetterfly.pl/kategorie/ksef-2/
- tags: `KSeF`, `Betterfly`, `CSV`, `artifacts`, `Q&A`, `konfiguracja`, `uwierzytelnianie`, `wysyłka`, `odbiór`, `tryb awaryjny`, `uprawnienia`, `eFaktury`, `eFaktury Plus`
- reviewNote: Approved and exported from dashboard
## Content
## Betterfly KSeF — Q&A Artifacts (CSV)

Format: artifact_id | artifact_title | category | subcategory | question_pl | answer_summary_pl | source_url | last_updated | confidence

---

### Konfiguracja

**BFKSEF_001** — Konfiguracja KSeF — kroki
- Pytanie: Jak skonfigurować integrację z KSeF w Comarch Betterfly?
- Odpowiedź: Przejdź do Ustawień → KSeF → wybierz środowisko → wybierz metodę uwierzytelniania → zapisz → dodaj certyfikaty
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-skonfigurowac-integracje-z-krajowym-systemem-e-faktur-ksef/
- Data: 2026-04-09 | Pewność: 1.0

**BFKSEF_002** — Środowisko KSeF — Demo vs Produkcyjne
- Pytanie: Jakie środowisko KSeF wybrać w Betterfly?
- Odpowiedź: Demo — do testów bez skutków prawnych; Produkcyjne — faktury wchodzą do obiegu prawnego. Data pierwszego uruchomienia w trybie produkcyjnym jest zapamiętywana.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jakie-srodowisko-ksef-wybrac/
- Data: 2026-04-09 | Pewność: 1.0

---

### Uwierzytelnianie

**BFKSEF_003** — Uwierzytelnianie — Token
- Pytanie: Jak skonfigurować uwierzytelnianie tokenem w KSeF Betterfly?
- Odpowiedź: Token generowany w Aplikacji Podatnika KSeF; wkleić w ustawieniach. Dostępne do końca 2026 r.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-skonfigurowac-uwierzytelnianie-z-krajowym-systemem-e-faktur-ksef-za-pomoca-tokenu/
- Data: 2026-04-09 | Pewność: 1.0

**BFKSEF_004** — Uwierzytelnianie — Certyfikat MF
- Pytanie: Jak skonfigurować uwierzytelnianie certyfikatem MF w KSeF Betterfly?
- Odpowiedź: Certyfikat generowany w Aplikacji Podatnika KSeF; ważny 7 dni — wymaga odświeżenia. Zalecana metoda po 2026.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-skonfigurowac-uwierzytelnianie-z-krajowym-systemem-e-faktur-ksef-za-pomoca-certyfikatu-ministerstwa-finansow/
- Data: 2026-04-09 | Pewność: 1.0

**BFKSEF_005** — Certyfikat Offline — awaryjny
- Pytanie: Do czego służy Certyfikat KSeF Offline w Betterfly?
- Odpowiedź: Wymagany do wydruku faktur w trybach awaryjnych (Offline / Offline24 / Awaria KSeF). Program prosi o hasło przy generowaniu wydruku.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-skonfigurowac-integracje-z-krajowym-systemem-e-faktur-ksef/
- Data: 2026-04-09 | Pewność: 1.0

**BFKSEF_023** — Odświeżanie certyfikatu MF
- Pytanie: Jak odświeżyć certyfikat MF w KSeF Betterfly?
- Odpowiedź: Certyfikat ważny 7 dni. Po wygaśnięciu należy wygenerować nowy w Aplikacji Podatnika KSeF i wgrać do Betterfly.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/odnowienie-dostepu-do-certyfikatu-w-ksef/
- Data: 2026-04-09 | Pewność: 1.0

---

### Parametry

**BFKSEF_006** — Parametr — zakres współpracy
- Pytanie: Jak ustawić zakres współpracy z KSeF w Betterfly?
- Odpowiedź: Dwa tryby: "Wysyłka i odbiór dokumentów" (pełna integracja) lub "Tylko odbiór dokumentów" (tylko faktury zakupowe od dostawców).
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jakie-parametry-do-wysylania-dokumentow-do-ksef-mozna-ustawic-w-comarch-beterfly/
- Data: 2026-04-01 | Pewność: 1.0

**BFKSEF_007** — Parametr — data rozpoczęcia wysyłki
- Pytanie: Co to jest data rozpoczęcia wysyłki do KSeF w Betterfly?
- Odpowiedź: Określa moment od którego zatwierdzone dokumenty są przekazywane do KSeF. Dokumenty z datą wcześniejszą zatwierdzane wyłącznie lokalnie.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jakie-parametry-do-wysylania-dokumentow-do-ksef-mozna-ustawic-w-comarch-beterfly/
- Data: 2026-04-01 | Pewność: 1.0

**BFKSEF_008** — Parametr — automatyczne pobieranie faktur
- Pytanie: Jak włączyć automatyczne pobieranie faktur z KSeF w Betterfly?
- Odpowiedź: Parametr w ustawieniach KSeF. Po włączeniu system sprawdza nowe faktury kosztowe przy każdym logowaniu.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jakie-parametry-do-wysylania-dokumentow-do-ksef-mozna-ustawic-w-comarch-beterfly/
- Data: 2026-04-01 | Pewność: 1.0

**BFKSEF_009** — Parametr — wysyłanie B2C
- Pytanie: Czy Betterfly wysyła faktury dla osób fizycznych do KSeF?
- Odpowiedź: Dobrowolne. Parametr zaznaczony: B2C wysyłane jak zwykłe e-faktury. Odznaczony: status "KSeF: nie podlega" — nie wysyłane.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jakie-parametry-do-wysylania-dokumentow-do-ksef-mozna-ustawic-w-comarch-beterfly/
- Data: 2026-04-01 | Pewność: 1.0

**BFKSEF_010** — Parametr — dane kontaktowe firmy
- Pytanie: Czy Betterfly wysyła dane kontaktowe firmy do KSeF?
- Odpowiedź: Opcjonalnie. Zaznaczony: email i telefon z ustawień firmy w polach Email i Telefon sekcji Podmiot1 XML. Odznaczony: bez danych kontaktowych.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jakie-parametry-do-wysylania-dokumentow-do-ksef-mozna-ustawic-w-comarch-beterfly/
- Data: 2026-04-01 | Pewność: 1.0

**BFKSEF_011** — Parametr — metoda kasowa
- Pytanie: Jak oznaczyć metodę kasową na fakturze do KSeF w Betterfly?
- Odpowiedź: Parametr w ustawieniach KSeF. Zaznaczony: pole P_16 automatycznie zaznaczone na każdym nowym dokumencie.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jakie-parametry-do-wysylania-dokumentow-do-ksef-mozna-ustawic-w-comarch-beterfly/
- Data: 2026-04-01 | Pewność: 1.0

---

### Wysyłka

**BFKSEF_012** — Wysyłka faktur — typy dokumentów
- Pytanie: Jakie typy dokumentów można wysyłać do KSeF z Betterfly?
- Odpowiedź: Faktury sprzedaży, faktury zaliczkowe i finalne, faktury VAT Marża, korekty.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wyslac-fakture-do-krajowego-systemu-e-faktur-ksef/
- Data: 2026-04-24 | Pewność: 1.0

**BFKSEF_013** — Wysyłka faktur — przepływ
- Pytanie: Jak przebiega wysyłka faktury do KSeF w Betterfly?
- Odpowiedź: Zatwierdzenie → wysyłka do KSeF → odbiór UPO → rejestr VAT sprzedaży → zaksięgowanie. Brak UPO blokuje księgowanie.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wyslac-fakture-do-krajowego-systemu-e-faktur-ksef/
- Data: 2026-04-24 | Pewność: 1.0

**BFKSEF_014** — Wysyłka faktur — statusy KSeF
- Pytanie: Jakie są statusy dokumentu w KSeF w Betterfly?
- Odpowiedź: Trwa przetwarzanie (przyjęto), Pobieranie UPO (weryfikacja), Błąd przetwarzania (odrzucenie — szczegóły w Centrum powiadomień).
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wyslac-fakture-do-krajowego-systemu-e-faktur-ksef/
- Data: 2026-04-24 | Pewność: 1.0

**BFKSEF_015** — Wysyłka seryjna — limity
- Pytanie: Jakie są limity seryjnej wysyłki do KSeF w Betterfly?
- Odpowiedź: 30 faktur na minutę — limit narzucony przez Ministerstwo Finansów. Przekroczenie powoduje błędy.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wyslac-fakture-do-krajowego-systemu-e-faktur-ksef/
- Data: 2026-04-24 | Pewność: 1.0

**BFKSEF_016** — Anulowanie dokumentu po wysyłce
- Pytanie: Czy można anulować fakturę wysłaną do KSeF w Betterfly?
- Odpowiedź: Demo: tak nawet po wysłaniu. Produkcyjne: tylko przed wysłaniem do KSeF — po wysłaniu anulowanie niedostępne.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wyslac-fakture-do-krajowego-systemu-e-faktur-ksef/
- Data: 2026-04-24 | Pewność: 1.0

---

### Odbiór

**BFKSEF_017** — Odbiór faktur zakupowych
- Pytanie: Jak pobrać faktury zakupowe z KSeF w Betterfly?
- Odpowiedź: Automatycznie przy logowaniu (parametr włączony) lub ręcznie. eFaktury: lista Faktury kosztowe. eFaktury Plus: lista Faktury z KSeF.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jakie-parametry-do-wysylania-dokumentow-do-ksef-mozna-ustawic-w-comarch-beterfly/
- Data: 2026-04-01 | Pewność: 1.0

---

### Tryb awaryjny

**BFKSEF_018** — Tryb awaryjny — rodzaje
- Pytanie: Jakie są tryby awaryjne KSeF w Betterfly?
- Odpowiedź: Offline24 (wysyłka następny dzień roboczy), Offline (1 dzień roboczy od ustania niedostępności), Awaria KSeF (7 dni; awaria krytyczna — brak obowiązku).
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wystawic-fakture-podczas-niedostepnosci-i-awarii-ksef/
- Data: 2026-01-29 | Pewność: 1.0

**BFKSEF_019** — Tryb awaryjny — wydruk
- Pytanie: Jak wygląda wydruk faktury w trybie awaryjnym KSeF w Betterfly?
- Odpowiedź: Dwa kody QR: Offline i Certyfikat. Tytuł: Faktura VAT (B2C/zagranica) lub Potwierdzenie transakcji (B2B krajowy). Wymaga Certyfikatu Offline.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wystawic-fakture-podczas-niedostepnosci-i-awarii-ksef/
- Data: 2026-01-29 | Pewność: 1.0

**BFKSEF_020** — Tryb awaryjny — JPK
- Pytanie: Jak dokumenty z trybu awaryjnego trafiają do JPK w Betterfly?
- Odpowiedź: Trafiają bezpośrednio do rejestrów VAT z kodami JPK dedykowanymi trybom awaryjnym, co zapewnia poprawność JPK_V7 bez numeru KSeF.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wystawic-fakture-podczas-niedostepnosci-i-awarii-ksef/
- Data: 2026-01-29 | Pewność: 1.0

---

### Uprawnienia operatora

**BFKSEF_021** — Uprawnienia operatora — pakiet eFaktury
- Pytanie: Jak działają uprawnienia KSeF w pakiecie eFaktury Betterfly?
- Odpowiedź: Wysyłka zawsze automatyczna po zatwierdzeniu — brak zarządzania uprawnieniami per operator.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-nadac-uprawnienia-do-wysylania-faktur-do-ksef/
- Data: 2026-04-01 | Pewność: 1.0

**BFKSEF_022** — Uprawnienia operatora — pakiet eFaktury Plus
- Pytanie: Jak nadać uprawnienia do KSeF w pakiecie eFaktury Plus Betterfly?
- Odpowiedź: Ustawienia → Użytkownicy i Role → Role. Trzy poziomy: automatyczna wysyłka, wysyłka na żądanie, brak uprawnień.
- Źródło: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-nadac-uprawnienia-do-wysylania-faktur-do-ksef/
- Data: 2026-04-01 | Pewność: 1.0