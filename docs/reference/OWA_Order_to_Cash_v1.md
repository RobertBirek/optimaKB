# Order-to-Cash v1

## Status kontraktu

- Identyfikator: `owa.process.order_to_cash.v1`
- Wersja: `1.0.0-draft`
- Właściciel merytoryczny: ERP Semantic Core
- Zakres: sprzedaż od intencji klienta do rozliczenia należności
- Status: `DECYZJA PRODUKTOWA`
- Mapowania Comarch ERP Optima: `WYMAGA EKSPERTA` do czasu potwierdzenia testami na bazie testowej

Ten dokument definiuje kanoniczny proces biznesowy. Nie jest instrukcją bezpośredniego zapisu do tabel MSSQL i nie zastępuje walidacji wykonywanej przez Optima API/Worker.

## Cel biznesowy

Proces Order-to-Cash przyjmuje zapotrzebowanie klienta, ustala warunki sprzedaży, rezerwuje lub wydaje towar, wystawia dokument sprzedaży, tworzy należność i kończy się jej rozliczeniem albo kontrolowaną korektą.

## Encje kanoniczne

| Encja | Rola w procesie | Minimalna odpowiedzialność |
|---|---|---|
| `Party` | nabywca lub odbiorca | identyfikacja, status handlowy, warunki płatności |
| `Product` | towar lub usługa | identyfikacja pozycji, jednostka, stawka podatkowa |
| `SalesOffer` | propozycja handlowa | zakres, cena, termin ważności |
| `SalesOrder` | zobowiązanie realizacyjne | zamówione ilości, ceny, terminy i odbiorca |
| `InventoryReservation` | blokada dostępności | ilość, magazyn, okres obowiązywania |
| `GoodsIssue` | wydanie magazynowe | faktyczne ilości i skutek magazynowy |
| `SalesInvoice` | dokument sprzedaży | wartości, podatki, termin i forma płatności |
| `Receivable` | należność | kwota otwarta, termin, waluta i status |
| `Payment` | przepływ pieniężny | kwota, data i rachunek lub kasa |
| `Settlement` | powiązanie płatności z należnością | kwota rozliczona i pozostałe saldo |
| `Correction` | kontrolowana zmiana skutków | dokument źródłowy, przyczyna i różnica |

## Przebieg podstawowy

| Krok | Stan wejściowy | Operacja kanoniczna | Wynik | Ryzyko |
|---|---|---|---|---|
| 1 | rozpoznana intencja klienta | `sales.offer.prepare` | oferta robocza | R1 |
| 2 | zaakceptowane warunki | `sales.order.preview` | zwalidowany projekt zamówienia | R1 |
| 3 | zatwierdzony payload | `sales.order.commit` | aktywne zamówienie | R3 |
| 4 | dostępny zasób | `inventory.reservation.commit` | rezerwacja | R2 |
| 5 | gotowość realizacji | `inventory.goods_issue.preview` | podgląd skutków magazynowych | R1 |
| 6 | zatwierdzony podgląd | `inventory.goods_issue.commit` | wydanie towaru | R3 |
| 7 | spełnione warunki fakturowania | `sales.invoice.preview` | podgląd faktury i należności | R1 |
| 8 | zgoda użytkownika | `sales.invoice.commit` | faktura i należność | R3 |
| 9 | zarejestrowana płatność | `finance.settlement.preview` | propozycja rozliczenia | R1 |
| 10 | zgoda użytkownika | `finance.settlement.commit` | rozliczona należność | R3 |

## Stany procesu

`DRAFT -> VALIDATED -> CONFIRMED -> RESERVED -> PARTIALLY_FULFILLED -> FULFILLED -> INVOICED -> PARTIALLY_SETTLED -> SETTLED`

Dozwolone są ścieżki wyjątków:

- `CONFIRMED -> CANCELLED`, jeżeli nie powstały nieodwracalne skutki;
- `RESERVED -> RESERVATION_RELEASED`;
- `PARTIALLY_FULFILLED -> CORRECTION_REQUIRED`;
- `INVOICED -> CORRECTED` przez dokument korekty, a nie edycję zatwierdzonej faktury;
- `PARTIALLY_SETTLED -> SETTLED` przez kolejne rozliczenia.

## Reguły deterministyczne

1. LLM nie oblicza samodzielnie VAT, cen końcowych, rabatów, kursów ani wartości magazynowej.
2. Każda operacja R3 wymaga sekwencji `preview -> approval -> commit`.
3. Approval musi być związany z hashem payloadu, `tenant_id`, `user_id`, capability, czasem ważności i `correlation_id`.
4. `commit` musi być idempotentny i odrzucić payload różny od zatwierdzonego.
5. Dostępność, cena, saldo i status dokumentu pochodzą z Optima API na żywo, nie z OpenSPG.
6. Częściowa realizacja zachowuje ilość zamówioną, zrealizowaną i pozostałą.
7. Korekta wskazuje dokument źródłowy i opisuje skutki magazynowe, finansowe oraz podatkowe.
8. Rozliczenie nie jest płatnością: `Payment` rejestruje przepływ, a `Settlement` przypisuje go do należności.

## Mapowanie Comarch ERP Optima

Poniższe elementy są hipotezami technicznymi i wymagają potwierdzenia przez eksperyment read-only oraz API/COM na bazie testowej:

| Element kanoniczny | Kandydat Optima | Status |
|---|---|---|
| `SalesOrder` | Rezerwacja Odbiorcy (RO) | `WYMAGA EKSPERTA` |
| `GoodsIssue` | Wydanie Zewnętrzne (WZ) | `WYMAGA EKSPERTA` |
| `SalesInvoice` | Faktura Sprzedaży (FS) | `WYMAGA EKSPERTA` |
| relacja realizacji | relacje dokumentów handlowych | `WYMAGA EKSPERTA` |
| `Receivable` | zdarzenie rozrachunkowe | `WYMAGA EKSPERTA` |
| `Settlement` | rozliczenie dokumentów kasowo-bankowych | `WYMAGA EKSPERTA` |

Nie wolno wyprowadzać operacji zapisu wyłącznie z nazw tabel `TraNag`, `TraElem` lub tabel rozrachunkowych.

## Kontrakt odpowiedzi preview

```json
{
  "operation_id": "op_...",
  "capability": "sales.invoice.commit",
  "payload_hash": "sha256:...",
  "warnings": [],
  "business_effects": {
    "affects_stock": false,
    "creates_receivable": true,
    "tax_effect": "pending_vendor_validation"
  },
  "approval": {
    "required": true,
    "expires_at": "..."
  },
  "correlation_id": "corr_..."
}
```

## Scenariusze akceptacyjne

1. Pełna realizacja RO do WZ i FS, a następnie pełne rozliczenie.
2. Częściowa realizacja zamówienia z poprawną ilością pozostałą.
3. Brak dostępności blokuje commit, ale preview zwraca czytelny błąd domenowy.
4. Użytkownik bez scope `sales.invoice.commit` nie widzi narzędzia commit.
5. Zmiana payloadu po approval powoduje odrzucenie operacji.
6. Ponowienie z tym samym idempotency key nie tworzy drugiego dokumentu.
7. Faktura po częściowej płatności ma status `PARTIALLY_SETTLED`.
8. Korekta nie modyfikuje historycznego dokumentu źródłowego.

## Otwarte decyzje

- Czy faktura może poprzedzać WZ w każdym obsługiwanym wariancie Optimy.
- Jak reprezentować wiele WZ realizujących jedno RO i jedną FS realizującą wiele RO.
- Które serie dokumentów i magazyny mogą być wybierane automatycznie.
- Które błędy Optimy mapować na wspólne kody domenowe.
- Jakie limity wartości wymagają dodatkowego poziomu zatwierdzenia.
