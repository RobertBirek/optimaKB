# Audyt OpenSPG

Data audytu: 2026-05-12 11:29 Europe/Warsaw

Aktualizacja: czesc ustalen zostala poprawiona 2026-05-12. Szczegoly wykonanych zmian sa w `OPENSPG_REMEDIATION.md`.

## Zakres

Audyt obejmuje lokalne wdrozenie kontenerowe w `/docker/openspg`: `compose.yaml`, `.env`, katalogi danych, stan kontenerow Docker, podstawowe logi i test HTTP. Nie obejmuje kodu zrodlowego aplikacji ani pelnego skanu CVE obrazow, bo w tym workspace nie ma repozytorium aplikacji, a `trivy`, `grype` i `docker scout` nie sa dostepne.

## Stan Biezacy

- `docker compose config` przechodzi poprawnie.
- Kontenery `mysql`, `neo4j`, `minio` i `server` dzialaja; restart count: `0`.
- OpenSPG odpowiada lokalnie na `http://127.0.0.1:8887/` kodem `HTTP 200`.
- Port `8887` jest wystawiony na `0.0.0.0` i `[::]`.
- Dane zajmuja ok. `704M`: MySQL `200M`, Neo4j `520M`, MinIO `120K`.
- System plikow ma ok. `26G` wolnego miejsca.

## Ustalenia Krytyczne / Wysokie

1. Twardo wpisane sekrety w `compose.yaml`.
   Hasla i klucze sa zapisane jawnie w konfiguracji (`compose.yaml:8`, `24`, `47-48`, `75`, `77-78`). Przenies je do sekretow Docker, managera sekretow albo przynajmniej do niecommitowanego `.env`, a nastepnie wykonaj rotacje hasel.

2. Aplikacja laczy sie do MySQL jako uprzywilejowany uzytkownik.
   Serwer uzywa hasla roota MySQL (`compose.yaml:75`). Utworz dedykowanego uzytkownika aplikacyjnego z minimalnymi uprawnieniami do bazy `openspg` i zmien konfiguracje serwera.

3. OpenSPG jest wystawiony publicznie na wszystkich interfejsach.
   Mapowanie `8887:8887` (`compose.yaml:63-64`) publikuje usluge na IPv4 i IPv6. Jesli ma byc dostepna tylko lokalnie lub przez reverse proxy, uzyj np. `127.0.0.1:8887:8887` albo usun publikacje portu i wystawiaj usluge przez kontrolowany proxy z TLS i autoryzacja.

4. Neo4j ma zbyt szeroko odblokowane procedury.
   `NEO4J_dbms_security_procedures_unrestricted: "*"` i allowlist `*` (`compose.yaml:28-29`) poszerzaja powierzchnie ataku, szczegolnie z APOC. Ogranicz do wymaganych procedur, np. `apoc.*`, albo jeszcze wezszego zestawu.

## Ustalenia Srednie

- Obrazy uzywaja tagu `latest` (`compose.yaml:3`, `19`, `42`, `60`). Przypnij wersje albo digesty, zeby wdrozenia byly powtarzalne.
- Obrazy lokalne maja 10-17 miesiecy, a MinIO loguje, ze jest starszy od aktualnego wydania. Zaplanuj kontrolowana aktualizacje po backupie.
- MinIO uzywa przestarzalych zmiennych `MINIO_ACCESS_KEY` i `MINIO_SECRET_KEY`; zamien na `MINIO_ROOT_USER` i `MINIO_ROOT_PASSWORD`.
- Brak healthcheckow dla wszystkich kontenerow. Dodaj `healthcheck` i uzaleznij start `server` od zdrowych zaleznosci.
- `server` i `minio` dzialaja jako `root`; Neo4j startuje przez root entrypoint, proces JVM dziala jako UID `7474`, MySQL jako UID `999`. Ustaw jawnych uzytkownikow tam, gdzie obrazy na to pozwalaja.
- Brak utwardzenia kontenerow: `cap_drop`, `security_opt` i `read_only` sa puste. Dodaj co najmniej `security_opt: ["no-new-privileges:true"]`, ogranicz capabilities i rozdziel potrzebne katalogi zapisywalne.
- Naglowki HTTP zwracaja liberalny CORS (`Access-Control-Allow-Origin: *` oraz credentials). Skonfiguruj dozwolone originy zgodnie z realnym frontendem/proxy.
- Siec `proxy` zawiera tez `n8n` i `dockge`; OpenSPG server wspoldzieli segment z innymi aplikacjami. Ogranicz sieci lub reguly proxy do koniecznego minimum.

## Ustalenia Niskie / Operacyjne

- Brak widocznego mechanizmu backupu. Ustal regularne backupy `data/mysql/`, `data/neo4j/` i `data/minio/` oraz test odtworzeniowy.
- Logi MySQL zawieraja wczesniejsze `Aborted connection`; obecne logi serwera wygladaja stabilnie, ale warto monitorowac powtarzalnosc tych ostrzezen.
- `.env` jest pusty, a `compose.yaml` zawiera cala konfiguracje. Rozdziel konfiguracje srodowiskowa od definicji stacka.

## Zalecana Kolejnosc Dzialan

1. Wykonaj backup danych i potwierdz procedury odtworzenia.
2. Zmien i zrotuj wszystkie sekrety; usun jawne hasla z `compose.yaml`.
3. Ogranicz ekspozycje portu `8887` oraz skonfiguruj TLS/autoryzacje na warstwie proxy.
4. Ogranicz uprawnienia Neo4j/APOC i utworz dedykowanego uzytkownika MySQL.
5. Przypnij wersje obrazow, zaplanuj aktualizacje i dodaj healthchecki.
6. Utwardz kontenery: non-root tam, gdzie mozliwe, `no-new-privileges`, minimalne capabilities, ograniczone sieci.
