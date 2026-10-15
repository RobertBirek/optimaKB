# Zakończenie korekty 14 materiałów — 2026-10-13

## Wynik

Wykonano zatwierdzoną przez operatora wymianę 14 materiałów i warunkowe
usunięcie dokładnie 40 starych obiektów grafu. Przywrócono stan automatyzacji
i harmonogram autodraftu. Nie wykonano commitu ani globalnego rebuildu.

- 14 nowych szkiców: `promoted`, z treścią z zatwierdzonego pakietu.
- 14 poprzedników: `withdrawn`, z archiwami JSON/Markdown zgodnymi bajtowo
  z poprzednimi promowanymi wersjami. Oryginalne raw pliki zachowano.
- 36 nowych obiektów: 11 dokumentów i 25 chunków.
- 3 dokumenty kanoniczne użyto ponownie.
- 40 starych obiektów usunięto: 14 dokumentów i 26 chunków.
- 33 chronione obiekty zachowały pełny stan, również wektory i internal IDs.
- Pozostałe tematy/metadane pozostawiono poza zakresem usuwania.

## Import i weryfikacja

| KB | Joby zakończone FINISH | Usunięte stare obiekty |
|---|---|---:|
| Community | 881–882 | 7 |
| Legal | 883–885 | 4 |
| Payroll HR | 886–889 | 14 |
| Accounting VAT | 890–892 | 15 |

Buildy obejmowały dokumenty i chunki oraz wymagane, wygenerowane z korekt
metadane tematów/routingu. Po imporcie przeliczone przez builder wektory
semantycznie niezmienionych chronionych rekordów przywrócono z kopii przy
użyciu guarded, vector-only transakcji. Zweryfikowano odzyskanie oryginalnych
pełnych hashy i indeksy ONLINE; celowo zmienione metadane zachowały nowe
wartości i ich wektory.

Czyszczenie wykonano 16:04:08–16:11:05 UTC. Użyto transakcji ze zwykłym
`DELETE n`, bez `DETACH`, prefiksowych dopasowań lub usuwania po URL.
Warunki transakcyjne obejmowały dokładne database+semantic ID, internal ID,
etykiety, pełne właściwości, brak relacji i brak zewnętrznych referencji.
Readback: OLD40=0; NEW36+canonical3 zgodne; preserve33 zgodne; delty baz
dokładnie 7/4/14/15; indeksy ONLINE.

Końcowy scoped quality gate wykonany jako `mcpbot` zwrócił PASS bez błędów
i ostrzeżeń dla wszystkich czterech KB. Globalny raport nadal WARN,
a świeżość WARN; nie traktowano tych globalnych statusów jako dowodu
niepowodzenia wykonanej korekty. Official Delta: OK.

## Przywrócenie automatyzacji — dowody koordynatora

Po pozytywnym readbacku koordynator wykonał wspierany admin/CSRF PATCH
`/panel/api/automation/config` z jedyną zmianą `paused:false`. Token pobrano
wewnątrz procesu; nie zapisano go ani nie pokazano w raporcie. Następnie
wykonano `sudo -n systemctl start erp-kb-discovery-autodraft.timer`.

Odczyty API po przywróceniu potwierdziły:

- `enabled=true`, `paused=false`, `shadowOnly=true`, `publicationApproved=true`;
- `allowedNamespaces=[ComarchCommunityNews]`, bez zmiany progów i autoRollback;
- bramka publikacji zatwierdzona i bez blokerów;
- LLM PASS, brak aktywnych jobów, alertów i zamrożeń;
- zachowany jeden throttle społeczności;
- dashboard active, most MCP `/health` z `ok=true`.

Zaległy autodraft uruchomił się po wznowieniu timera i zakończył `Result=success`.
Końcowy odczyt koordynatora 2026-10-13T16:25:13Z potwierdził timer
`active+enabled`, usługę przebiegu `inactive` po sukcesie oraz następny
termin 2026-10-13 22:02:18 UTC (00:02:18 CEST dnia 14 października).
GET status o 16:25:14.239Z potwierdził zero aktywnych operacji panelu.

To bezpośrednie odczyty koordynatora, nie deklaracja użytkownika.
Starsze completion seale etapów prawidłowo kończą się stanem wstrzymanym;
niniejszy dokument zapisuje późniejsze przywrócenie.

## Odtwarzanie i audyt

Chronione backupy i journal:
`/tmp/opencode/protected-source-correction-20261013/`.
Oryginalny `rollback.tar.gz` ma SHA-256
`ac3add0f87d36f7b684bcd5d3441f446bbe07b40a7407d249913af910f09cbc0`.
Backup obejmuje pełne właściwości grafu z wektorami oraz stan lokalny.
Nie usuwano go po wykonaniu. Jest to katalog tymczasowy, więc jego istnienie
nie stanowi gwarancji trwałej retencji po czyszczeniu systemowego `/tmp`.

Końcowa niezależna recenzja potwierdziła spójność dowodów wykonania bez
ustaleń Critical/Important. Minor M-1 dotyczy granicy sumy kontrolnej journalu:
hash w historycznym raporcie cleanupu obejmuje prefiks PRZED końcowym eventem
`FINAL_DONE_REPORT_SEALED`, a nie plik z dopisanym sealem. Recenzja potwierdziła
dokładną zgodność prefiksu. Nie nadpisano historycznych hashy, żeby pozornie
uzyskać samoodnoszącą się sumę całego, następnie dopisanego journalu.

## Raporty szczegółowe

- `Promoted_Correction_Preflight_2026-10-13.md` i JSON — hold, backup i granice.
- `Promoted_Correction_Local_Apply_2026-10-13.md` i JSON — mapowanie 14 old→new.
- `Promoted_Correction_Build_Readback_2026-10-13.md` i JSON — joby i pełne hashe.
- `Promoted_Correction_Graph_Cleanup_2026-10-13.md` i JSON — dokładne transakcje OLD40.
- `Promoted_Correction_Final_Review_2026-10-13.md` — niezależna kontrola dowodów.

Korekta zapewnia wierność zweryfikowanym źródłom w zakresie streszczeń;
nie certyfikuje aktualnej mocy prawnej ani wdrożenia historycznych zapowiedzi.
