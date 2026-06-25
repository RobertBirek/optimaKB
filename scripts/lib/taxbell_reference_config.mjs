#!/usr/bin/env node

export const TAXBELL_REFERENCE_KBS = {
  TaxbellLegalReference: {
    namespace: 'TaxbellLegalReference',
    kbName: 'Taxbell Legal Reference',
    category: 'Taxbell',
    projectName: 'Taxbell Legal Reference',
    projectDescription: 'Polish law, tax law, official legal acts, tax explanations, rulings, and public authority guidance for Taxbell advisory work.',
    exportDir: 'exports/taxbell_legal_reference/v1',
    sourceRoot: 'downloads/taxbell/legal_reference',
    buildManifest: 'build_taxbell_legal_reference_jobs_manifest.json',
    uploadManifest: 'upload_taxbell_legal_reference_manifest.json',
    schemaFile: 'docs/reference/TaxbellLegalReference.schema',
    jobPrefix: 'TBLG',
    sourceDomains: [
      'isap.sejm.gov.pl',
      'dziennikustaw.gov.pl',
      'sejm.gov.pl',
      'podatki.gov.pl',
      'gov.pl',
      'biznes.gov.pl',
      'mf.gov.pl',
      'sip.mf.gov.pl',
    ],
    broadDomains: [
      'lexlege.pl',
      'infor.pl',
      'pit.pl',
      'poradnikprzedsiebiorcy.pl',
      'rp.pl',
    ],
    queries: [
      'polskie prawo podatkowe podatki.gov.pl objaśnienia podatkowe interpretacje ogólne',
      'ISAP ustawa o podatku od towarów i usług VAT tekst jednolity',
      'ISAP Ordynacja podatkowa tekst jednolity',
      'podatki.gov.pl interpretacje objaśnienia podatkowe MDR WHT VAT CIT PIT',
      'biznes.gov.pl obowiązki podatkowe przedsiębiorcy zaświadczenia NIP VAT',
      'gov.pl prawo podatkowe przedsiębiorca obowiązki podatkowe Polska',
    ],
    routeKeywords: ['prawo', 'ustawa', 'podatkowe', 'ordynacja', 'interpretacja', 'objaśnienie podatkowe', 'podstawa prawna', 'kodeks'],
  },
  TaxbellPayrollHRReference: {
    namespace: 'TaxbellPayrollHRReference',
    kbName: 'Taxbell Payroll HR Reference',
    category: 'Taxbell',
    projectName: 'Taxbell Payroll HR Reference',
    projectDescription: 'Polish payroll, HR, ZUS, PIP, employment, social insurance, and labor obligations reference corpus for Taxbell.',
    exportDir: 'exports/taxbell_payroll_hr_reference/v1',
    sourceRoot: 'downloads/taxbell/payroll_hr_reference',
    buildManifest: 'build_taxbell_payroll_hr_reference_jobs_manifest.json',
    uploadManifest: 'upload_taxbell_payroll_hr_reference_manifest.json',
    schemaFile: 'docs/reference/TaxbellPayrollHRReference.schema',
    jobPrefix: 'TBHR',
    sourceDomains: [
      'zus.pl',
      'pip.gov.pl',
      'gov.pl',
      'biznes.gov.pl',
      'praca.gov.pl',
      'psz.praca.gov.pl',
      'isap.sejm.gov.pl',
    ],
    broadDomains: [
      'infor.pl',
      'poradnikprzedsiebiorcy.pl',
      'kadry.infor.pl',
      'pit.pl',
    ],
    queries: [
      'ZUS dokumenty rozliczeniowe składki płatnik poradnik',
      'ZUS zasady podlegania ubezpieczeniom społecznym zdrowotnym podstawa wymiaru składek',
      'PIP kodeks pracy umowa o pracę czas pracy urlop wypowiedzenie',
      'gov.pl zatrudnianie pracownika obowiązki pracodawcy kadry płace',
      'biznes.gov.pl pracownik składki ZUS wynagrodzenie minimalne umowa zlecenie',
      'isap kodeks pracy tekst jednolity ustawa system ubezpieczeń społecznych',
    ],
    routeKeywords: ['zus', 'kadry', 'płace', 'place', 'hr', 'pracownik', 'umowa o pracę', 'zlecenie', 'składki', 'wynagrodzenie', 'urlop', 'pip'],
  },
  TaxbellAccountingVATReference: {
    namespace: 'TaxbellAccountingVATReference',
    kbName: 'Taxbell Accounting VAT Reference',
    category: 'Taxbell',
    projectName: 'Taxbell Accounting VAT Reference',
    projectDescription: 'Polish accounting, bookkeeping, VAT practice, JPK, financial reporting, and settlement guidance corpus for Taxbell.',
    exportDir: 'exports/taxbell_accounting_vat_reference/v1',
    sourceRoot: 'downloads/taxbell/accounting_vat_reference',
    buildManifest: 'build_taxbell_accounting_vat_reference_jobs_manifest.json',
    uploadManifest: 'upload_taxbell_accounting_vat_reference_manifest.json',
    schemaFile: 'docs/reference/TaxbellAccountingVATReference.schema',
    jobPrefix: 'TBAC',
    sourceDomains: [
      'podatki.gov.pl',
      'gov.pl',
      'biznes.gov.pl',
      'mf.gov.pl',
      'isap.sejm.gov.pl',
      'pfr.mf.gov.pl',
    ],
    broadDomains: [
      'infor.pl',
      'poradnikprzedsiebiorcy.pl',
      'pit.pl',
      'rachunkowosc.com.pl',
    ],
    queries: [
      'podatki.gov.pl JPK VAT struktury deklaracje pliki do pobrania',
      'podatki.gov.pl VAT biała lista split payment WIS KSeF JPK',
      'gov.pl sprawozdanie finansowe księgowość rachunkowość przedsiębiorca',
      'biznes.gov.pl księgowość ewidencja VAT faktury przedsiębiorca',
      'ISAP ustawa o rachunkowości tekst jednolity',
      'podatki.gov.pl ewidencja VAT faktury kasa fiskalna JPK_V7',
    ],
    routeKeywords: ['księgowość', 'ksiegowosc', 'rachunkowość', 'vat', 'jpk', 'faktura', 'deklaracja', 'sprawozdanie', 'ewidencja', 'rozliczenie'],
  },
};

export const TAXBELL_REFERENCE_NAMESPACES = Object.keys(TAXBELL_REFERENCE_KBS);

export function taxbellConfig(namespace) {
  const config = TAXBELL_REFERENCE_KBS[namespace];
  if (!config) throw new Error(`Unsupported Taxbell namespace: ${namespace}`);
  return config;
}

export function taxbellConfigsFor(value = 'all') {
  if (!value || value === 'all') return Object.values(TAXBELL_REFERENCE_KBS);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(taxbellConfig);
}
