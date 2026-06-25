# ERP Knowledge Assistant 50Q Accuracy Test Report

Date: `2026-06-12`

## Summary

- PASS: `50`

## By Category

- `schema`: total `5`, PASS `5`
- `additional_functions`: total `5`, PASS `5`
- `sprint`: total `5`, PASS `5`
- `reference`: total `5`, PASS `5`
- `partner`: total `5`, PASS `5`
- `betterfly`: total `5`, PASS `5`
- `taxbell_accounting_vat`: total `4`, PASS `4`
- `taxbell_legal`: total `4`, PASS `4`
- `taxbell_payroll_hr`: total `4`, PASS `4`
- `community_news`: total `4`, PASS `4`
- `business_semantics`: total `4`, PASS `4`

## Results

### Q002 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Answer primary KB: `ComarchOptimaSchema`
- KBs used: `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Które klucze łączą dokument handlowy z kontrahentem?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q027 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Answer primary KB: `ComarchOptimaAdditionalFunctions`
- KBs used: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Transport: `bridge`
- Question: Jakie są tryby uruchamiania funkcji dodatkowych?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q047 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Answer primary KB: `ComarchOptimaSprint`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Transport: `bridge`
- Question: Jakie SQL patterny mamy dla Sprint?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: Ta odpowiedź łączy lokalne artefakty KB z zewnętrznie cytowanymi wynikami wyszukiwania live.

### Q062 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Answer primary KB: `ComarchOptimaReference`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jak zacząć pracę z oficjalną dokumentacją Optimy?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q072 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Answer primary KB: `ComarchOptimaPartnerTechnical`
- KBs used: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jakie partnerowe procedury dotyczą wydruków i parametrów dynamicznych?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q086 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Answer primary KB: `ComarchBetterflyReference`
- Transport: `bridge`
- Question: Jak działa token Betterfly API?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q201 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Answer primary KB: `TaxbellAccountingVATReference`
- KBs used: `TaxbellLegalReference`
- Transport: `bridge`
- Question: Jakie są obowiązki księgowe związane z przesyłaniem JPK_V7M przy rozliczeniu VAT?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q210 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Answer primary KB: `TaxbellLegalReference`
- KBs used: `TaxbellAccountingVATReference`
- Transport: `bridge`
- Question: Czy zgodnie z ustawą o CIT mogę odliczyć straty z lat ubiegłych?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q219 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Answer primary KB: `TaxbellPayrollHRReference`
- KBs used: `TaxbellLegalReference`
- Transport: `bridge`
- Question: Jakie są obowiązki pracodawcy wobec PIP w zakresie wynagrodzeń i składek ZUS?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q231 PASS

- Category: `community_news`
- Expected primary KB: `ComarchCommunityNews`
- Answer primary KB: `ComarchCommunityNews`
- KBs used: `ComarchOptimaReference`, `ComarchBetterflyReference`
- Transport: `bridge`
- Question: Czy są aktualności społeczności Comarch o planowanej przerwie technicznej?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: Ta odpowiedź łączy lokalne artefakty KB z zewnętrznie cytowanymi wynikami wyszukiwania live.

### Q233 PASS

- Category: `business_semantics`
- Expected primary KB: `ComarchOptimaBusinessSemantics`
- Answer primary KB: `ComarchOptimaBusinessSemantics`
- KBs used: `ComarchOptimaSchema`
- Transport: `bridge`
- Question: Co oznacza typ dokumentu i dopuszczalne wartości kodu w Optimie?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q003 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Answer primary KB: `ComarchOptimaSchema`
- KBs used: `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jakie obiekty SQL czytają tabelę TraNag?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: Ta odpowiedź łączy lokalne artefakty KB z zewnętrznie cytowanymi wynikami wyszukiwania live.

### Q028 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Answer primary KB: `ComarchOptimaAdditionalFunctions`
- KBs used: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Transport: `bridge`
- Question: Jakie przykłady COM dotyczą handlu i magazynu?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q048 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Answer primary KB: `ComarchOptimaSprint`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Transport: `bridge`
- Question: Jak użyć RO_GetReportHeader i RO_GetReportContent?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q063 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Answer primary KB: `ComarchOptimaReference`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Gdzie szukać oficjalnych instrukcji o aktualizacjach?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q073 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Answer primary KB: `ComarchOptimaPartnerTechnical`
- KBs used: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jakie partnerowe komunikaty mamy dla konfiguracji?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: Ta odpowiedź łączy lokalne artefakty KB z zewnętrznie cytowanymi wynikami wyszukiwania live.

### Q087 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Answer primary KB: `ComarchBetterflyReference`
- Transport: `bridge`
- Question: Które endpointy Betterfly są wersjonowane?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q202 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Answer primary KB: `TaxbellAccountingVATReference`
- KBs used: `TaxbellLegalReference`
- Transport: `bridge`
- Question: Kiedy należy wystawić fakturę korygującą VAT w księgowości i jak wpływa na rozliczenie?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q211 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Answer primary KB: `TaxbellLegalReference`
- KBs used: `TaxbellAccountingVATReference`
- Transport: `bridge`
- Question: Jaka jest aktualna interpretacja podatkowa dotycząca kosztów uzyskania przychodów w PIT?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q220 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Answer primary KB: `TaxbellPayrollHRReference`
- KBs used: `TaxbellLegalReference`
- Transport: `bridge`
- Question: Kiedy pracownik ma prawo do urlopu wypoczynkowego i jak naliczać wynagrodzenie za ten urlop?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q232 PASS

- Category: `community_news`
- Expected primary KB: `ComarchCommunityNews`
- Answer primary KB: `ComarchCommunityNews`
- KBs used: `ComarchOptimaReference`, `ComarchBetterflyReference`
- Transport: `bridge`
- Question: Jakie publiczne aktualności Comarch mówią o nowej wersji?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: Ta odpowiedź łączy lokalne artefakty KB z zewnętrznie cytowanymi wynikami wyszukiwania live.

### Q234 PASS

- Category: `business_semantics`
- Expected primary KB: `ComarchOptimaBusinessSemantics`
- Answer primary KB: `ComarchOptimaBusinessSemantics`
- KBs used: `ComarchOptimaSchema`
- Transport: `bridge`
- Question: Jakie jest znaczenie kodu typu dokumentu w domenie biznesowej Optimy?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q004 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Answer primary KB: `ComarchOptimaSchema`
- KBs used: `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jakie obiekty zapisują do TraElem?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q029 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Answer primary KB: `ComarchOptimaAdditionalFunctions`
- KBs used: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Transport: `bridge`
- Question: Jakie interfejsy COM pojawiają się przy logowaniu?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q049 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Answer primary KB: `ComarchOptimaSprint`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Transport: `bridge`
- Question: Jakie są typowe źródła danych dla wydruków sPrint?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q064 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Answer primary KB: `ComarchOptimaReference`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Gdzie w dokumentacji są szkolenia i onboarding?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q074 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Answer primary KB: `ComarchOptimaPartnerTechnical`
- KBs used: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jakie COM sample partnerowe dotyczą logowania?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q088 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Answer primary KB: `ComarchBetterflyReference`
- Transport: `bridge`
- Question: Jaka jest różnica między payments i paymentdetails?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q203 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Answer primary KB: `TaxbellAccountingVATReference`
- KBs used: `TaxbellLegalReference`
- Transport: `bridge`
- Question: Czy deklaracja VAT za miesiąc może być złożona przez KSeF, a jakie są terminy rozliczenia?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q212 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Answer primary KB: `TaxbellLegalReference`
- KBs used: `TaxbellAccountingVATReference`
- Transport: `bridge`
- Question: Jakie przepisy prawa podatkowego regulują kwestię amortyzacji środków trwałych?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q221 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Answer primary KB: `TaxbellPayrollHRReference`
- KBs used: `TaxbellLegalReference`
- Transport: `bridge`
- Question: Jakie składki ZUS powinny być potrącane z wynagrodzenia pracownika w 2026 roku?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q235 PASS

- Category: `community_news`
- Expected primary KB: `ComarchCommunityNews`
- Answer primary KB: `ComarchCommunityNews`
- KBs used: `ComarchOptimaReference`, `ComarchBetterflyReference`
- Transport: `bridge`
- Question: Jakie są najnowsze aktualności i ogłoszenia ze społeczności Comarch?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: Ta odpowiedź łączy lokalne artefakty KB z zewnętrznie cytowanymi wynikami wyszukiwania live.

### Q243 PASS

- Category: `business_semantics`
- Expected primary KB: `ComarchOptimaBusinessSemantics`
- Answer primary KB: `ComarchOptimaBusinessSemantics`
- KBs used: `ComarchOptimaSchema`
- Transport: `bridge`
- Question: Jakie mapowanie kodów na etykiety jest zdefiniowane dla typu dokumentu 'FZ' w systemie Optima?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q005 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Answer primary KB: `ComarchOptimaSchema`
- KBs used: `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jak znaleźć join path od dokumentu do definicji dokumentu?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q030 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Answer primary KB: `ComarchOptimaAdditionalFunctions`
- KBs used: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Transport: `bridge`
- Question: Które przykłady FD dotykają TraNag albo TraElem?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q050 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Answer primary KB: `ComarchOptimaSprint`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Transport: `bridge`
- Question: Jakie są najczęstsze problemy diagnostyczne wydruków?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q065 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Answer primary KB: `ComarchOptimaReference`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jak znaleźć oficjalne info o kolumnach użytkownika?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q075 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Answer primary KB: `ComarchOptimaPartnerTechnical`
- KBs used: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jakie COM sample partnerowe dotyczą handlu i magazynu?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q089 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Answer primary KB: `ComarchBetterflyReference`
- Transport: `bridge`
- Question: Jak wygląda Bearer auth w Betterfly?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q204 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Answer primary KB: `TaxbellAccountingVATReference`
- KBs used: `TaxbellLegalReference`
- Transport: `bridge`
- Question: Jakie elementy musi zawierać faktura VAT zgodna z wymogami KSeF w rachunkowości?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q213 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Answer primary KB: `TaxbellLegalReference`
- KBs used: `TaxbellAccountingVATReference`
- Transport: `bridge`
- Question: Czy kodeks spółek handlowych ma wpływ na rozliczenia CIT?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q222 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Answer primary KB: `TaxbellPayrollHRReference`
- KBs used: `TaxbellLegalReference`
- Transport: `bridge`
- Question: Czy PIP może kontrolować dokumentację kadrową i płacową firmy?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q236 PASS

- Category: `community_news`
- Expected primary KB: `ComarchCommunityNews`
- Answer primary KB: `ComarchCommunityNews`
- KBs used: `ComarchOptimaReference`, `ComarchBetterflyReference`
- Transport: `bridge`
- Question: Gdzie znajdę bazę wiedzy z ogłoszeniami o wydarzeniach społeczności?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: Ta odpowiedź łączy lokalne artefakty KB z zewnętrznie cytowanymi wynikami wyszukiwania live.

### Q244 PASS

- Category: `business_semantics`
- Expected primary KB: `ComarchOptimaBusinessSemantics`
- Answer primary KB: `ComarchOptimaBusinessSemantics`
- KBs used: `ComarchOptimaSchema`
- Transport: `bridge`
- Question: Które reguły walidacyjne obowiązują dla procesu zatwierdzania faktury zakupu w Optima?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q006 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Answer primary KB: `ComarchOptimaSchema`
- KBs used: `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jak wygląda ścieżka joinów od BnkZapisy do kontrahenta?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q031 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Answer primary KB: `ComarchOptimaAdditionalFunctions`
- KBs used: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Transport: `bridge`
- Question: Jak znaleźć przykład dodawania operatora przez COM?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q051 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Answer primary KB: `ComarchOptimaSprint`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Transport: `bridge`
- Question: Jakie modułowe recipes mamy dla wydruków handlowych?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q066 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Answer primary KB: `ComarchOptimaReference`
- KBs used: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Gdzie w dokumentacji jest strojenie MSSQL dla Optimy?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q076 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Answer primary KB: `ComarchOptimaPartnerTechnical`
- KBs used: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Transport: `bridge`
- Question: Jakie assety partnerowe są z obszaru XML structures?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

### Q090 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Answer primary KB: `ComarchBetterflyReference`
- Transport: `bridge`
- Question: Jakie endpointy dotyczą invoices w Betterfly?
- Checks passing: hasPrimary, correctPrimary, hasEvidence, hasNote, hasArtifacts, noError
- Evidence hits: `5`
- Note preview: To jest wstępna odpowiedź z lokalnych artefaktów KB.

