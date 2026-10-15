# Wiązanie dokumentów FZ w buforze z zatwierdzonymi dokumentami ZD – Baza Wiedzy programu Comarch ERP Optima
- draftId: `draft_2026-10-06_4439c646_wiazanie-dokumentow-fz-w-buforze-z-zatwierdzonymi-dokumentami-zd-baza-wiedzy-pro`
- kbNamespace: `ComarchOptimaBusinessSemantics`
- status: `promoted`
- promotedAt: `2026-10-08T12:03:27.836Z`
- sourceUrl: https://pomoc.comarch.pl/optima/pl/2025_5/dokumentacja/wiazanie-dokumentow-fz-w-buforze-z-zatwierdzonymi-dokumentami-zd/
- tags: `exa`, `auto-draft`, `recency_question`
- reviewNote: Approved from inbox row
## Content
External source discovered via Exa query: COM/SDK bez porad podatkowych: Comarch ERP Optima Session.Save COMException HRESULT -2147133958 (0x800556FA), zapis nowej FZ, wcześniej ten sam błąd przy zatwierdzaniu FZ1092. Jaki jest dokładny komunikat/znaczenie i źródło? Nie zgaduj. Czy to tryb demonstracyjny/ograniczenie dat dokumentów?
Title: Wiązanie dokumentów FZ w buforze z zatwierdzonymi dokumentami ZD – Baza Wiedzy programu Comarch ERP Optima
URL: https://pomoc.comarch.pl/optima/pl/2025_5/dokumentacja/wiazanie-dokumentow-fz-w-buforze-z-zatwierdzonymi-dokumentami-zd/
Tier: official
Published: 2025-06-23T00:00:00.000Z
Summary:
Summary:
The page describes how to link (powiązać) a purchase invoice (faktura zakupu, FZ) saved in a buffer with approved supplier documents (ZD) in Comarch ERP Optima. Key points relevant to your query:
- Function: You can bind an FZ in the buffer to ZD documents that are approved, have unreleased items, at least one item on FZ, and share the same supplier and currency. VAT calculation method must match the invoice, and warehouse alignment must be consistent.
- Source documents: ZD options shown in the binding wizard may come from Comarch OCR uploads or KSEF-derived orders, and can be linked to an FZ still in the buffer (not yet linked to any document).
- Constraints: The FZ must not be already linked to another document; once linked, the FZ cannot be re-bound or un-bound via the wizard. If needed, delete the FZ to remove the link.
- Post-link behavior: After linking, you can edit F...

Operator notes:
Automatyczny draft utworzony z odpowiedzi fallback KB-first. Sprawdź przed promocją.
This draft came from external search and requires review before promotion into a KB.