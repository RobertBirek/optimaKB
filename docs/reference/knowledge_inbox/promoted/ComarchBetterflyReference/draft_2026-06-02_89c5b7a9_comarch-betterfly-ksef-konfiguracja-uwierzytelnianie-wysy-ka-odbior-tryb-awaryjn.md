# Comarch Betterfly — KSeF: konfiguracja, uwierzytelnianie, wysyłka, odbiór, tryb awaryjny, uprawnienia operatora
- draftId: `draft_2026-06-02_89c5b7a9_comarch-betterfly-ksef-konfiguracja-uwierzytelnianie-wysy-ka-odbior-tryb-awaryjn`
- kbNamespace: `ComarchBetterflyReference`
- status: `promoted`
- promotedAt: `2026-06-05T12:08:44.260Z`
- sourceUrl: https://pomoc.comarchbetterfly.pl/kategorie/ksef-2/
- tags: `KSeF`, `Betterfly`, `konfiguracja`, `uwierzytelnianie`, `wysyłka`, `odbiór`, `tryb awaryjny`, `uprawnienia`, `certyfikat`, `token`, `eFaktury`, `eFaktury Plus`
- reviewNote: Approved and exported from dashboard
## Content
# Comarch Betterfly — KSeF Knowledge Base Seed
<!-- kb_namespace: ComarchBetterflyReference -->
<!-- kb_project: 10 -->
<!-- kb_category: KSeF -->
<!-- source: pomoc.comarchbetterfly.pl -->
<!-- generated: 2026-06-02 -->
<!-- scope: konfiguracja, uwierzytelnianie, wysyłka, odbiór, tryb awaryjny, parametry, uprawnienia operatora -->

---

## 1. Konfiguracja integracji z KSeF

### Ścieżka w UI
`Ustawienia → KSeF`

### Kroki konfiguracji

1. Przejdź do **Ustawień → lista KSeF**.
2. Wybierz **środowisko** (Demo lub Produkcyjne).
3. Wybierz **sposób uwierzytelniania**.
4. Zapisz ustawienia.
5. Dodaj wymagane certyfikaty.

### Środowiska

| Środowisko | Zastosowanie |
|---|---|
| Demo | Testy — bez skutków prawnych |
| Produkcyjne | Faktury wchodzą do obiegu prawnego |

> **Uwaga:** W bazie zapamiętywana jest data pierwszego uruchomienia w trybie produkcyjnym. Dokumenty wystawione przed datą aktywacji nie będą przesyłane do KSeF.

---

## 2. Uwierzytelnianie

### Metody

| Metoda | Opis | Ważność | Dostępność |
|---|---|---|---|
| **Certyfikat MF** | Generowany w Aplikacji Podatnika KSeF | 7 dni (wymaga odświeżenia) | Do odwołania |
| **Token** | Generowany w Aplikacji Podatnika KSeF | Zależna od konfiguracji | Do końca 2026 r. |

> **Uwaga:** Token jako metoda uwierzytelniania będzie dostępny tylko do końca 2026 roku. Zaleca się migrację na Certyfikat MF.

> **Uwaga bezpieczeństwa:** Przy wielu użytkownikach — każdy powinien mieć osobne konto i własne certyfikaty. Pliki certyfikatów i hasła należy traktować jak dane do bankowości elektronicznej.

### Certyfikaty do dodania po zapisaniu

| Wybrana metoda uwierzytelniania | Wymagane certyfikaty |
|---|---|
| Token | Certyfikat KSeF offline (awaryjny) |
| Certyfikat MF | Certyfikat uwierzytelniający + Certyfikat KSeF offline |

---

## 3. Parametry konfiguracyjne KSeF

### 3.1 Zakres współpracy z KSeF

| Opcja | Zastosowanie |
|---|---|
| **Wysyłka i odbiór dokumentów** | Pełna integracja — firmy wysyłające faktury sprzedaży i odbierające kosztowe od 1 lutego 2026 r. |
| **Tylko odbiór dokumentów** | Dla firm bez obowiązku wysyłki własnych faktur, ale zobowiązanych do pobierania faktur zakupowych |

### 3.2 Data rozpoczęcia wysyłki do KSeF

- Określa moment, od którego zatwierdzone dokumenty są automatycznie przekazywane do KSeF.
- Przy pierwszej konfiguracji lub zmianie środowiska program podpowiada datę bieżącą (można zmienić).
- **Dokumenty z datą wystawienia wcześniejszą** niż data graniczna → zatwierdzane wyłącznie lokalnie.
- **Dokumenty z datą wystawienia równą lub późniejszą** → procesowane wg uprawnień operatora:
  - operator z auto-wysyłką: przekazanie do KSeF natychmiast po zatwierdzeniu
  - operator bez auto-wysyłki: dokument lokalny, wysyłka ręczna na żądanie

### 3.3 Automatyczne pobieranie faktur z KSeF

- Po włączeniu: system automatycznie sprawdza przy logowaniu, czy w MF pojawiły się nowe faktury kosztowe na NIP firmy.
- **Pakiet eFaktury:** faktury kosztowe trafiają na listę *Faktury kosztowe* — wymagają weryfikacji przed wysyłką do biura rachunkowego.
- **Pakiet eFaktury Plus:** faktury wyświetlane w *Faktury z KSeF*, opcje dalszego procesowania:
  - Przeniesienie do Rejestru VAT
  - Przeniesienie do faktury zakupu
  - Archiwizacja (usuwa z listy bieżących, nie z bazy danych)

### 3.4 Wysyłanie dokumentów dla osób fizycznych (B2C)

- Domyślnie: przesyłanie B2C do KSeF jest **dobrowolne**.
- **Parametr zaznaczony:** faktury B2C traktowane jak standardowe e-faktury i wysyłane do KSeF.
- **Parametr odznaczony:** dokumenty B2C automatycznie otrzymują status `KSeF: nie podlega` — nie są wysyłane.

### 3.5 Wysyłanie danych kontaktowych firmy

- **Parametr zaznaczony:** adres e-mail i numer telefonu z ustawień firmy dołączane do XML każdej faktury (pola `Email` i `Telefon` w sekcji `Podmiot1`).
- **Parametr odznaczony:** faktury wysyłane bez danych kontaktowych.

### 3.6 Adnotacja Metoda kasowa

- Dla podatników rozliczających się metodą kasową: parametr `P_16` w strukturze eFaktury.
- **Parametr zaznaczony:** każdy nowy dokument automatycznie oznaczany adnotacją *Metoda kasowa*.

---

## 4. Wysyłka faktur sprzedaży do KSeF

### Typy dokumentów obsługiwanych przez KSeF

- Faktury sprzedaży
- Faktury zaliczkowe i finalne
- Faktury VAT Marża
- Korekty

### Przepływ wysyłki

```
Zatwierdzenie faktury → Wysyłanie do KSeF → Odbiór UPO → Rejestr VAT sprzedaży → Zaksięgowanie
```

> **Uwaga:** Jeśli wysyłka do KSeF lub odbiór UPO nie powiedzie się — dokument **nie zostanie zaksięgowany** ani przeniesiony do rejestru VAT. Proces wznawia się dopiero po pomyślnej wysyłce.

### Statusy dokumentu w KSeF

| Status | Znaczenie |
|---|---|
| `Trwa przetwarzanie` | Dokument poprawnie przyjęty w KSeF, oczekuje na weryfikację |
| `Pobieranie UPO` | KSeF weryfikuje dokument, trwa pobieranie poświadczenia |
| `Błąd przetwarzania` | KSeF odrzucił dokument — szczegóły w Centrum powiadomień |

### Seryjne wysyłanie

- Zaznaczyć dokumenty na liście → `Wyślij do KSeF / Odbierz UPO`.
- **Limit MF:** 30 faktur na minutę.

### Anulowanie dokumentu

| Środowisko | Możliwość anulowania |
|---|---|
| Demo | Tak — nawet po wysłaniu do KSeF |
| Produkcyjne | Tylko przed wysłaniem do KSeF |

---

## 5. Odbiór faktur zakupowych z KSeF

| Pakiet | Lista docelowa | Opcje |
|---|---|---|
| eFaktury | Lista *Faktury kosztowe* | Weryfikacja → wysyłka do biura rachunkowego lub usunięcie |
| eFaktury Plus | Lista *Faktury z KSeF* | Przeniesienie do Rejestru VAT / Faktury zakupu / Archiwizacja |

---

## 6. Tryb awaryjny (Offline)

| Tryb | Termin wysyłki po przywróceniu KSeF |
|---|---|
| **Offline24** | Niezwłocznie, nie później niż następny dzień roboczy od wystawienia |
| **Offline** | W ciągu 1 dnia roboczego od ustania niedostępności |
| **Awaria KSeF** | W ciągu 7 dni od ustania awarii; przy awarii krytycznej — brak obowiązku wysyłki |

- Dokumenty trafiają do rejestrów VAT z kodami JPK dla JPK_V7.
- Wydruk: dwa kody QR (Offline + Certyfikat). Tytuł: `Faktura VAT` (B2C/zagranica) lub `Potwierdzenie transakcji` (B2B krajowy).
- Wymagany Certyfikat Offline do wydruku.

---

## 7. Uprawnienia operatora do KSeF

Ścieżka: `Ustawienia → Użytkownicy i Role → Role`

| Uprawnienie | Zachowanie po zatwierdzeniu faktury |
|---|---|
| **Automatyczna wysyłka** | Dokument automatycznie przesyłany do KSeF po zatwierdzeniu |
| **Wysyłka na żądanie** | Dokument lokalny, wysyłka ręczna przez „Wyślij do KSeF" |
| **Brak uprawnień** | Wysyłka możliwa tylko przez innego uprawnionego użytkownika |

Pakiet eFaktury: wysyłka zawsze automatyczna — brak zarządzania per operator.

---

## 8. Źródła

- https://pomoc.comarchbetterfly.pl/dokumentacja/jak-skonfigurowac-integracje-z-krajowym-systemem-e-faktur-ksef/
- https://pomoc.comarchbetterfly.pl/dokumentacja/jakie-parametry-do-wysylania-dokumentow-do-ksef-mozna-ustawic-w-comarch-beterfly/
- https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wyslac-fakture-do-krajowego-systemu-e-faktur-ksef/
- https://pomoc.comarchbetterfly.pl/dokumentacja/jak-wystawic-fakture-podczas-niedostepnosci-i-awarii-ksef/
- https://pomoc.comarchbetterfly.pl/dokumentacja/jak-nadac-uprawnienia-do-wysylania-faktur-do-ksef/