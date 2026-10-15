# Potwierdzenie odnowienia TLS MCP — 2026-10-14

## Wynik

Odnowienie i aktualnie serwowany certyfikat zostały potwierdzone świeżymi
połączeniami z włączoną walidacją certyfikatu i nazwy hosta. Wszystkie cztery
podłączone profile KB odpowiedziały poprawnie na `list_knowledge_bases`.

## Nowy certyfikat

- Host/SAN: `optima.kag.taxbell.pl`.
- Wystawca: Let's Encrypt YE1.
- Ważny od: 2026-10-14 04:10:37 UTC.
- Ważny do: 2027-01-12 04:10:36 UTC.
- Serial: `05301D3FF5769E9517B2E3745D47144B3662`.
- SHA-256 fingerprint:
  `1B:5C:74:A1:82:34:48:B8:F1:F5:F7:A1:27:4F:43:18:79:09:E6:EE:4E:F4:25:4C:F0:EF:5F:D3:1D:4F:98:DD`.

OpenSSL z `-verify_return_error -verify_hostname optima.kag.taxbell.pl`
potwierdził cały dostarczony łańcuch zarówno dla publicznego IP
`46.174.24.27`, jak i proxy `10.10.254.46`. Próba z ALPN `h2,http/1.1`
również przeszła. Obie ścieżki serwowały ten sam nowy leaf.

## Kontrole HTTP i MCP

- Publiczny HTTPS `/health`: HTTP 200, `ssl_verify_result=0`.
- HTTPS przez `--resolve optima.kag.taxbell.pl:443:10.10.254.46`:
  HTTP 200, `ssl_verify_result=0`; końcowy odczyt 2026-10-14T05:24:53Z.
- `AccountingTaxKB.list_knowledge_bases`: project 14, odpowiedź poprawna.
- `PayrollHrKB.list_knowledge_bases`: project 13, odpowiedź poprawna.
- `OptimaProductKB.list_knowledge_bases`: projekty 11 i 8, odpowiedź poprawna.
- `LegalComplianceKB.list_knowledge_bases`: project 12, odpowiedź poprawna.

Pierwsze próby około 05:12:45 UTC nadal zgłaszały wygaśnięcie, choć późniejszy
handshake OpenSSL widział już nowy leaf. Powtórzone kontrole curl i wszystkich
narzędzi MCP przeszły. Dokładnej przyczyny tej przejściowej rozbieżności nie
ustalono; nie przypisano jej bez dowodu do cache, algorytmu TLS czy reloadu.

Nie wyłączano sprawdzania TLS, nie używano `-k`, nie zmieniano konfiguracji
klienta, reverse proxy ani usług. Odnowienie wykonał operator; asystent
wykonał tylko publiczne próby TLS/HTTP i odczyty MCP.

Potwierdzenie transportu nie jest ponowną oceną jakości 16 odpowiedzi.
Diagnoza utraty treści/cytowań i intencji release pozostaje osobnym zadaniem.
