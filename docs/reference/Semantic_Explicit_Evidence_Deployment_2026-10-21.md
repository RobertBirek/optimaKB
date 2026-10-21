# Wdrożenie explicit record evidence — 2026-10-21

## Status

**Wdrożono i zweryfikowano live.** Użytkownik po ukończeniu prywatnego PoC jawnie zlecił commit, push do main oraz wdrożenie. Ta decyzja zastępuje historyczne ograniczenie publikacji w raportach PoC; ich oryginalne wyniki i hashe pozostają historią, nie aktualnym statusem wdrożenia.

Kod działającego wydania: `a7258d2e6fdeb046e45f234c1429e677c66a9950`, wypchnięty do `origin/main`. Commity składowe:

- `ed764d9` — dwa narzędzia, compiler/lookup/verifier, prywatny profil i aktywacja z konfiguracji operatora, testy i raport PoC.
- `97bc5c3` — normatywne dokumenty v2/v3 i niezależne przeglądy.
- `a7258d2` — zachowanie istniejącego wdrożonego proxy przewodników przy przełączeniu bridge na wersjonowane źródła MAIN.

## Endpoint i autoryzacja

`https://optima.kag.taxbell.pl/mcp/erp-semantic-evidence-poc`

Narzędzia: `erp_subject.discover`, `erp_evidence.get`, `list_knowledge_bases`. Profil pozostaje OWA-only; nowa ścieżka jest opt-in konfiguracji operatora, poza domyślną enumeracją siedmiu dotychczasowych publicznych profili. Autoryzacja Bearer: klucz użytkownika wymaga `kb.semantic.read`; istniejący token transportowy odczytu otrzymuje ten zakres wyłącznie na nowej ścieżce dzięki jawnemu ustawieniu operatora. Tokeny i zawartość plików z sekretami nie zostały zapisane w repozytorium ani raporcie.

Zachowano stary endpoint `/mcp/erp-semantic-mcp`, jego cztery metody i wspólną metodę metadanych, dedykowaną usługę portu3420 oraz wszystkie 14 baz widocznych wcześniej przez legacy base path. Raw pool ma osobne limity 2 workery / 8 oczekujących; legacy pool pozostaje niezależny.

## Tożsamość wydania

| Wartość | Identyfikator |
|---|---|
| snapshot | `e3e875a110a6ee1868bba5dec685063a6eeac882414a8c229ca98406296a2313` |
| manifest SHA256 | `6d3e0f81a0f01195cec71be4bdbaadffc272ed54ec906d7fe742696fc28d93aa` |
| worker generation | `bdc3b0f9d10005369b4c679ebd8b68ad85cf40f819999d28b614a9cf34d09706` |
| runtime code SHA256 | `753a132ccf68e625165e7addc99252790dc84e8fc9d4b6a2fba831edced70a59` |

Artefakt skompilowano ponownie z finalnych źródeł `file:///docker/openspg/`; nie przemianowano generacji z worktree. Niezależny weryfikator uruchomiony jako `mcpbot` potwierdził: 366 rekordów owned, zero ambiguous/unresolved, 1347 diagnostyk. Runtime obejmuje 44 pliki / 669004 bajty.

Trwałe pięć plików danych: `/var/lib/erp-kb-raw/releases/e3e875a110a6ee1868bba5dec685063a6eeac882414a8c229ca98406296a2313/`. Katalogi należą do root, grupa mcpbot, tryb0750; pliki0440. Proces usługi może je czytać, lecz nie zapisywać. Zewnętrzny trust root: `/etc/erp-kb-raw.binding.json` root:mcpbot0640. Sekrety nie są częścią artefaktu.

## Faktyczna topologia i aktywacja

Początkowy restart prawidłowo nie przeszedł bramki readiness: późniejszy drop-in70 uruchamiał bridge z `/opt/erp-kb-entity-guides/releases/optima-internal-assistant-20261020/`, a nie plik MAIN. Przyczynę potwierdzono przez MainPID/commandline i drop-iny60/70. Nie uznano starego health200 za udane wdrożenie.

Zachowano istniejący helper przewodników byte-for-byte, SHA256 `9dda86e0b7f4e3f213b3336a0bc6c6ec23b31f9a2037ae214a695476f8a670d9`, i identyczny dispatch w wersjonowanym bridge. Nowy `80-main-bridge.conf` kieruje ExecStart na `/docker/openspg/scripts/erp_knowledge_mcp_http_bridge.mjs`. Zachowano wcześniejsze Environment/proxy-config oraz stare wydania `/opt`. Drop-in50 ładuje osobny plik konfiguracji raw. Po świeżej kompilacji i weryfikacji ponownie uruchomiono `erp-kb-mcp.service` i `erp-semantic-mcp.service`.

## Kontrole

- Aktywacja: niezależny przegląd spec/quality PASS; 300/300 testów dotkniętych obszarów, w tym 29 regresji legacy.
- Korekta topologii: niezależny przegląd spec/quality PASS; 34 RED → 34 GREEN, 64/64 testów wersjonowanego/oryginalnego proxy oraz 300/300 testów dotkniętych obszarów. Zbiory częściowo się pokrywają — nie należy ich dodawać jako unikalnego coverage.
- Weryfikacja artefaktu z docelowej lokalizacji jako użytkownik usługi: valid, właściwy finalny snapshot.
- LAN i publiczny HTTPS: bez tokenu401; initialize2025-03-26; tools/list dokładnie3 narzędzia; discovery `operator` zwróciło4 kandydatów; jawnie wybrany ref dostarczony z obowiązkowym E, `returned_all`, 2 rekordy / 1 właściciel / 1745UTF16; dokładna zgodność canonical text/structuredContent.
- Dwa równoległe wywołania potwierdziły snapshot w obu rzeczywistych workerach. Końcowy raw health: available, workers2, active0, queued0, limity2/8, unavailableReason null.
- Stary Semantic tools/list na LAN i publicznym HTTPS: kontrakt zachowany. Wszystkie legacy namespaces identyczne z pomiarem przed wdrożeniem. Dedykowany health3420:200.
- Zachowany proxy route `/public/v1/search/text` na LAN i publicznym HTTPS:405 `guide_proxy_method_denied`, co potwierdza obsługę istniejącej ścieżki i aktywną konfigurację. Poprawne odczyty guide/Operation testowano z syntetycznym upstreamem w testach referencyjnych; nie deklaruje się wykonania tych uwierzytelnionych odczytów live.
- Końcowo obie usługi active/running, ExecMainStatus0, NRestarts0. Local main i origin/main zgodne. Raporty timerów oraz wcześniejsze niezwiązane dokumenty pozostawiono poza commitami.

## Dowody i rollback

Szczegółowe niepubliczne receipts w zachowanym worktree `.superpowers/sdd/`: `rollout-live-baseline.json`, `rollout-provisioned.json`, `rollout-live-probes.json`, `rollout-stability.json`, `rollout-config-backup.json`, raporty implementacji/przeglądów i logi testów. Kopia poprzedniej nieaktywowanej próby jest zachowana; nie przemianowano jej snapshotu.

Rollback konfiguracji: odtworzyć poprzednie pliki wskazane w `rollout-config-backup.json` i usunąć nowe drop-iny50/80, jeśli wcześniej ich nie było; daemon-reload i restart centralnej usługi przywrócą wcześniej zachowany override70 i stary release. Nie usuwać trwałych generacji ani resetować innych zmian repozytorium. Zmiana kodu wymaga nowej kompilacji i nowego trust root przed kolejnym restartem.

Wdrożenie potwierdza mechanikę dostarczania źródeł. Nie zmienia oceny modelu-klienta, historycznego A8 FAIL/BLOCKED1.25 ani znanego20 1PASS/12PARTIAL/7MISS. Nieblokująca uwaga M1 dotycząca exit code pomocniczego runnera PoC pozostaje opisana w raporcie zamknięcia; wdrożenie oparto na jawnych wynikach weryfikatorów i live probes.
