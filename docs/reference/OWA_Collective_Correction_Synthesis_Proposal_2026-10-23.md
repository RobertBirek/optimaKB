# Korekta zbiorcza FA: synteza zatwierdzona redakcyjnie

**Stan:** operator zatwierdził treść i sprzedażowy zakres encji 23.10.2026. Dokument nie stanowi promowanego rekordu KB. Data przygotowania: 23.10.2026.

Przygotowano na podstawie [przeglądu źródeł](OWA_Collective_Correction_Source_Review_2026-10-23.md). Poniższa treść nie zmienia korpusu ani statusu dotychczasowych draftów. Oznaczenie „potwierdzone dokumentacją” dotyczy wskazanego źródła, nie testu zainstalowanego systemu.

## Zatwierdzona decyzja modelowania

Zachować nazwę **Encja: Korekta zbiorcza FA** i identyfikator **OWAOntology.KorektaZbiorczaFA**, a tę encję ograniczyć do wariantu dla faktur sprzedaży (FS). To zatwierdzony zakres lokalnej ontologii. Oficjalna pomoc opisuje szerszy mechanizm korekty zbiorczej/rabatu dla FS oraz FZ; nazwa encji nie ogranicza funkcjonalności produktu do sprzedaży.

Nie dodawać ani nie zmieniać encji FZ w tym kroku. Zmiana nazwy, identyfikatora lub rozszerzenie obecnej encji na wspólny model FS/FZ wymaga osobnej decyzji.

## Proponowana treść rekordu

### Status weryfikacji

- Nazwa: `Encja: Korekta zbiorcza FA`.
- Identyfikator ontologiczny: `OWAOntology.KorektaZbiorczaFA`.
- Zakres proponowany: zbiorcza korekta rabatowa faktur sprzedaży; odniesienie do wariantu zakupowego stanowi kontekst produktu.
- Dowody: oficjalna dokumentacja funkcjonalna, dokumentacja struktury bazy 2026.4.1 i odczyt historycznego przykładu COM.
- Weryfikacja bieżącego runtime, SQL i MCP/API: **nieprzeprowadzona**. Nie nadawać jednego poziomu pewności wszystkim twierdzeniom; stosować statusy przy poszczególnych ustaleniach.

### Opis biznesowy

W oficjalnej pomocy Comarch opisuje funkcję **Korekta zbiorcza/rabat**, dostępną z list Faktur Sprzedaży i Faktur Zakupu. Użytkownik może udzielić rabatu dotyczącego dostaw dla jednego odbiorcy lub dostawcy w wybranym okresie. Może także wskazać faktury, które chce objąć korektą. [S1: L23, L27–32]

W proponowanej encji sprzedażowej jeden dokument korekty może odnosić się do wielu faktur sprzedaży. Pomoc opisuje listę tych faktur na zakładce Dokumenty korekty oraz odnośnik do korekty w każdej fakturze źródłowej. Nie wynika z tego obowiązek tworzenia osobnego dokumentu korygującego dla każdej faktury. [S1: L30, L32, L36]

Opis dotyczy udokumentowanej korekty zbiorczej/rabatu. Nie rozszerza zakresu na dowolne zbiorcze korekty formalne, zmianę stawki VAT ani naprawę błędów systemowych.

### Warunki i zachowanie opisane w pomocy

Poniższe ustalenia mają status **potwierdzone dokumentacją S1**, bez testu lokalnego runtime:

1. Faktury objęte rabatem muszą być zatwierdzone i wystawione w tej samej walucie. Użytkownik wybiera kontrahenta oraz okres lub wskazuje faktury. [S1: L23–24, L27–34]
2. Na formularzu program przedstawia wartości sprzedaży/zakupu według stawek VAT. Nie przenosi pozycji towarowych z faktur źródłowych; rozdziela rabat procentowy lub kwotowy między przedstawione wartości. [S1: L35]
3. Pomoc opisuje powiązania między dokumentem korekty a fakturami źródłowymi, widoczne na zakładkach Dokumenty. To potwierdzenie zachowania interfejsu, nie dowód konkretnego klucza obcego ani tabeli relacji. [S1: L36]
4. Dla tego mechanizmu autor pomocy wskazuje brak wpływu na wartość towaru na magazynie oraz brak korygowania pojedynczych faktur i przyjęć zewnętrznych. Nie należy uogólniać tej informacji na inne rodzaje korekt. [S1: L37]
5. Do korekty zbiorczej nie można utworzyć dokumentu korygującego. [S1: L38]

Samo grupowanie wartości według stawek VAT nie potwierdza sposobu zapisu do rejestru VAT, dekretacji ani rozrachunków w zainstalowanej bazie.

### Relacje biznesowe i mapowanie techniczne

| Element | Ustalenie | Granica dowodu |
|---|---|---|
| Korekta a faktury sprzedaży | Jeden dokument może obejmować wiele faktur; użytkownik widzi powiązania w interfejsie. [S1: L30, L32, L36] | Nie ustalono pełnej kardynalności odwrotnej ani ograniczeń bazy danych. |
| Kontrahent i zakres faktur | Pomoc opisuje wybór kontrahenta, okresu oraz opcję wskazania faktur. [S1: L23–34] | Nie ustalono obecnego formatu parametrów API. |
| Tabele, klucze i warunki JOIN | **UNKNOWN** dla aktualnego wdrożenia. | Nie przypisywać automatycznie `TraNag`, `TraElem`, `TraRelacje` ani `DokumentRelacje` jako zweryfikowanego mapowania tej encji. |
| Rejestr VAT, księgowanie, rozrachunki | **UNKNOWN** dla aktualnego wdrożenia. | Nie deklarować relacji 1:N ani N:M do tych obiektów bez właściwego dowodu. |
| Uprawnienia i przebieg operacji | **UNKNOWN** dla aktualnego wdrożenia. | Nie zakładać wymogu administratora ani konkretnego sposobu wykonania na serwerze. |

### Historyczny przykład COM i rozbieżność kodów

W przykładzie z katalogu COM 2016 autor tworzy jeden obiekt `CDN.DokumentyHaMag` przez `AddNew()` i przekazuje do `UstawElemntyKorektyZbiorczejDokID` listę dwóch identyfikatorów faktur. Odczyt kodu potwierdza konstrukcję przykładu, nie powodzenie operacji ani obecny kontrakt COM/API. Skryptu nie uruchamiano. [S2: L58, L75]

Przykład ustawia właściwości COM `Korekta=6`, `Rodzaj=302010`, `TypDokumentu=302` i wybiera definicję o symbolu `FKOR`. Dokumentacja struktury bazy 2026.4.1 podaje natomiast rodzaj `302009` dla zbiorczej korekty sprzedaży i `302010` dla korekty danych. [S2: L61–67; S3: L169146–169156]

Nie rozstrzygnięto przyczyny tej różnicy ani zgodności właściwości historycznego COM z obecnymi kolumnami SQL. Nie traktować powyższych wartości jako instrukcji zapisu do bazy lub obecnego API. [S2, S3]

Dokumentacja 2026.4.1 opisuje `TrN_Korekta` jako pole `TINYINT` kodujące rodzaj korekty; wartość `1` oznacza tam korektę ilości. Nie przedstawiać `TrN_Korekta=1` jako uniwersalnej flagi logicznej korekty ani klucza do faktury źródłowej. [S3: L83981–83990]

### MCP i API

**UNKNOWN:** dostępność i kontrakt bieżącej operacji MCP/API dla korekty zbiorczej. Zweryfikowane tu źródła nie potwierdzają `create_sales_correction` ani `POST /api/v1/sales/correction`. Nie dowodzą też nieistnienia takiej operacji. [S1–S3]

Historyczny przykład COM nie stanowi specyfikacji obecnego endpointu. Brak dopasowania nazwy w przeglądanym katalogu narzędzi MCP nie rozstrzyga dostępności całego API.

### Otwarte ustalenia

- Aktualny kontrakt API/COM, parametry, autoryzacja i zakres dostępnych typów korekt.
- Mapowanie dokumentu na obecne tabele, klucze, kody typów i relacje SQL.
- Przyczyna rozbieżności między kodami przykładu COM a dokumentacją 2026.4.1.
- Skutki księgowe, zapis do rejestrów VAT i rozrachunków oraz ich kardynalności w aktualnym wdrożeniu.

## Źródła i daty

**S1: oficjalna pomoc funkcjonalna.** [Korekta zbiorcza, wersja URL 2026_5](https://pomoc.comarch.pl/optima/pl/2026_5/dokumentacja/korekta-zbiorcza/). Odczyt publicznej strony: 23.10.2026, 06:55:42 UTC. Strona wskazuje datę aktualizacji **20.09.2022**. Wersja w URL i data odczytu nie dowodzą aktualizacji artykułu w 2026 ani działania instalacji użytkownika.

- Zarchiwizowany tekst: `/tmp/opencode/owa-source-evidence-20261023-eo3x_89j/korekta-zbiorcza-2026_5.txt`; odniesienia L23–38 dotyczą tego pliku.
- SHA256 tekstu UTF-8: `2446c348948615bfa6be3a08b7d91a8d58ce82123237574423f796292eb4b86f`.
- SHA256 oryginalnego HTML: `f02eab6e95474cef2b3f38e3b90041ec3dcdde2b5d5bb1d0e831b04d31384750`.
- Archiwalna strona w ścieżce `/2026/` wskazuje link do `/2026_5/`; treść analizowanych akapitów obu stron jest taka sama. Szczegóły archiwów: przegląd źródeł, sekcja Official help archives.

**S2: historyczny przykład COM.** `/docker/openspg/downloads/google_drive/additional_functions/Przyklady użycia obiektów COM 2016 - NET - XPT - JS - VB60 - VC/JS/KorektaZbiorczaFA.js`.

- Kodowanie odczytu: cp1250. SHA256 oryginalnych bajtów: `11911b941a1c51f1da75e9ac7b49b794576d3ad40a50fc43db3b762e89d32305`.
- Numery linii odnoszą się do oryginalnego pliku. Odczyt dotyczył fragmentów biznesowych; nie kopiowano sekcji logowania i nie wykonywano skryptu.

**S3: dokumentacja struktury bazy 2026.4.1.** `/docker/openspg/docs/reference/Struktura_Bazy_2026.4.1.md`.

- Kodowanie: UTF-8. SHA256: `c3adf9ff27267c1abcc235326672c03f06713dc74ba9cf8074adf2770e03112d`.
- Numery linii odnoszą się do tej wersji dokumentu. Nie przeprowadzono porównania z aktualną bazą SQL.

Przegląd źródeł zawiera także hashe i treściowe porównanie dwóch istniejących promowanych wersji. Ich status redakcyjny nie stanowi dowodu prawdziwości zawartych w nich twierdzeń.

## Proponowana decyzja po przeglądzie treści

Po zatwierdzeniu operator może zlecić osobny etap przygotowania nowego rekordu oraz jawnego zastąpienia dwóch dotychczasowych rewizji:

- `draft_2026-07-15_0570f3dd_korekta-zbiorcza-fa`;
- `draft_2026-07-17_941acb19_encja-korekta-zbiorcza-fa`.

Nie należy zostawiać nowej, różnej treści jako trzeciej promowanej rewizji bez rozstrzygnięcia poprzednich. Samo dopisanie kolejnej wersji nie usunie niejednoznaczności w poprawionej bramce. Ta propozycja nie wykonuje zastąpienia ani wycofania żadnego rekordu.

Przed przyszłą promocją trzeba przygotować format i proweniencję nowego rekordu oraz wskazać tryb zastąpienia poprzednich wersji; zwykła kopia tego dokumentu nie wystarcza. Pozostałe trzy grupy OWA wymagają własnego przeglądu. Nie zakładać, że zatwierdzenie tej treści oznacza zieloną bramkę, wdrożenie kodu, zgodę na build lub wznowienie automatu.

## Zapis zatwierdzenia treści

Operator odpowiedział „tak” na pytanie o zatwierdzenie treści oraz sprzedażowego zakresu encji. Zatwierdzenie z 23.10.2026 dotyczy propozycji z commita `e8a42fe826ab4e271e48a506375c0386a8c3cf0c`: syntezy z jawnymi UNKNOWN oraz zachowania nazwy/identyfikatora encji dla wariantu sprzedażowego przy opisaniu szerszego mechanizmu FS/FZ. Treść sekcji „Proponowana treść rekordu” i „Źródła i daty” pozostaje bez zmian względem zatwierdzonej propozycji.

Zatwierdzenie redakcyjne nie jest promocją rekordu, zastąpieniem lub wycofaniem poprzednich wersji ani potwierdzeniem runtime/API/SQL. Dalsze czynności na korpusie, eksporcie, grafie i usługach wymagają osobnego polecenia. W tym kroku zapisano tylko decyzję w dokumentacji izolowanego checkoutu.
