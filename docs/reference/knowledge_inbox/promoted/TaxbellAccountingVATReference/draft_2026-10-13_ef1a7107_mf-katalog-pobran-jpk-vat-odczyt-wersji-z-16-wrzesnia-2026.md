# MF: katalog pobrań JPK VAT, odczyt wersji z 16 września 2026
- draftId: `draft_2026-10-13_ef1a7107_mf-katalog-pobran-jpk-vat-odczyt-wersji-z-16-wrzesnia-2026`
- kbNamespace: `TaxbellAccountingVATReference`
- status: `promoted`
- promotedAt: `2026-10-13T11:51:55.155Z`
- sourceUrl: https://www.podatki.gov.pl/podatki-firmowe/jednolity-plik-kontrolny/jpk_vat/pliki-do-pobrania-jpk-vat/
- tags: `source-correction`, `verified-summary`, `MF`, `JPK`, `technical-catalog`, `dated-snapshot`
- reviewNote: Verified source correction; supersedes draft_2026-06-05_6b5ac5ed_serwis-o-podatkach-pliki-do-pobrania-jpk-vat-podatki-gov-pl; controller-authorized local phase only.
## Content
## Katalog i daty
MF udostępnia na tej stronie dokumentację usług JPK, certyfikaty, broszury i przykłady. Strona podaje publikację 15 grudnia 2025 r. oraz aktualizację 16 września 2026 r. Poniższy opis odpowiada rozwiniętym sekcjom odczytanym 13 października 2026 r., a nie migawce z dnia promocji draftu.

## Dokumentacja i środowiska
Katalog wymienia specyfikację interfejsów w wersji 5.6.0, schemat initupload dla metadanych żądania inicjującego i certyfikaty klucza publicznego w wariantach binarnym oraz Base64. MF rozdziela certyfikaty produkcyjne i testowe, podając daty ich wersji. Link do specyfikacji: https://www.podatki.gov.pl/media/bngboylg/specyfikacja-interfejs%C3%B3w-us%C5%82ug-jpk-wersja-560.pdf; schemat: https://www.podatki.gov.pl/media/fmdjp0ri/initupload.xsd.

Według opisu strona e-dokumenty.mf.gov.pl służy produkcyjnym wysyłkom z podpisem kwalifikowanym, zaufanym lub danymi autoryzującymi; esb2.mf.gov.pl:5064 obsługuje samą metodę status. MF wskazuje test-e-dokumenty.mf.gov.pl dla prób. W testach stosuje uproszczone mocki: wynik pełnomocnictwa zależy od końcowej cyfry NIP, autoryzacji od parzystości identyfikatora, a CRL zwraca wynik dodatni. Parametr enableValidateQualifiedSignature=true pozwala wymusić sprawdzanie certyfikatu podpisu. MF zaleca fikcyjne dane i ograniczenie liczby przesyłek. Reguły mocków nie opisują weryfikacji produkcyjnej.

## Broszury, przykłady i granice
Dwie pozostałe sekcje wymieniają broszury JPK_VAT(3) po polsku i angielsku oraz przykładowe materiały JPK_VAT(3), w tym paczkę JPK-VAT-TEST-0001. Polski poradnik wskazuje plik https://www.podatki.gov.pl/media/aosft1rf/broszura-jpk_vat-3-wersja-20180214.pdf. Nazwy JPK_VAT(3) nie należy utożsamiać z JPK_V7M(3)/JPK_V7K(3). Katalog odsyła także do struktur JPK w serwisie KAS. Odczyt obejmuje etykiety i opisy pięciu sekcji; nie obejmuje zawartości PDF, XSD, ZIP ani testu usług. Nie potwierdza aktualnych obowiązków podatkowych.