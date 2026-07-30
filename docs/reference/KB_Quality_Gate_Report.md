# KB Quality Gate Report

Generated at: 2026-07-30T11:29:18.807Z

Overall: `FAIL`

## ComarchOptimaSchema

- Verdict: `PASS`
- Export dir: `exports/optima_schema/v1`
- Staging generatedAt: `2026-07-21T16:27:57.821Z`
- Required files:
  - `table.csv`: exists `true`, rows `630`
  - `column.csv`: exists `true`, rows `12441`
  - `chunk.csv`: exists `true`, rows `13122`
- Jobs:
  - `419` `FINISH` `database_instance.csv`
  - `420` `FINISH` `table.csv`
  - `421` `FINISH` `column.csv`
  - `422` `FINISH` `primary_key.csv`
  - `423` `FINISH` `foreign_key.csv`
  - `424` `FINISH` `index.csv`
  - `425` `FINISH` `constraint.csv`
  - `426` `FINISH` `view.csv`
  - `427` `FINISH` `stored_procedure.csv`
  - `428` `FINISH` `function.csv`
  - `429` `FINISH` `trigger.csv`
  - `430` `FINISH` `parameter.csv`
  - `432` `FINISH` `schema_change.csv`
  - `434` `FINISH` `table_query_guide.csv`
  - `435` `FINISH` `join_path_guide.csv`
  - `436` `FINISH` `object_dependency.csv`
  - `437` `FINISH` `sql_object_guide.csv`
  - `438` `FINISH` `chunk.csv`

## ComarchOptimaAdditionalFunctions

- Verdict: `FAIL`
- Export dir: `exports/optima_additional_functions/v1`
- Staging generatedAt: `2026-07-30T11:25:58.680Z`
- Errors:
  - Duplicate IDs in implementation_example.csv: 15
  - Duplicate IDs in configuration_catalog_entry.csv: 1
  - Duplicate IDs in chunk.csv: 15
- Required files:
  - `reference_document.csv`: exists `true`, rows `153`
  - `chunk.csv`: exists `true`, rows `248`
- Jobs:
  - `undefined` `FINISH` `additional_function_capability.csv`
  - `undefined` `FINISH` `additional_function_entry_point.csv`
  - `undefined` `FINISH` `additional_function_execution_mode.csv`
  - `undefined` `FINISH` `additional_function_configuration_option.csv`
  - `undefined` `FINISH` `additional_function_rule.csv`
  - `undefined` `FINISH` `additional_function_pattern.csv`
  - `undefined` `FINISH` `related_feature.csv`
  - `undefined` `FINISH` `com_interface.csv`
  - `undefined` `FINISH` `configuration_catalog_entry.csv`
  - `undefined` `FINISH` `procedure_dictionary_entry.csv`
  - `undefined` `FINISH` `message_catalog_entry.csv`
  - `undefined` `FINISH` `implementation_guide.csv`
  - `undefined` `FINISH` `module_recipe.csv`
  - `undefined` `FINISH` `schema_touchpoint.csv`
  - `undefined` `FINISH` `file_artifact.csv`
  - `undefined` `FINISH` `implementation_example.csv`
  - `undefined` `FINISH` `chunk.csv`
  - `391` `FINISH` `reference_document.csv`

## ComarchOptimaSprint

- Verdict: `FAIL`
- Export dir: `exports/optima_sprint/v1`
- Staging generatedAt: `2026-07-30T11:27:21.677Z`
- Errors:
  - Duplicate IDs in chunk.csv: 3
- Warnings:
  - Duplicate sourceUrl values in reference_document.csv: 1
- Required files:
  - `reference_document.csv`: exists `true`, rows `172`
  - `chunk.csv`: exists `true`, rows `315`
- Jobs:
  - `88` `FINISH` `print_technology.csv`
  - `89` `FINISH` `print_workflow.csv`
  - `90` `FINISH` `print_option.csv`
  - `91` `FINISH` `template_feature.csv`
  - `93` `FINISH` `diagnostic_case.csv`
  - `94` `FINISH` `version_change.csv`
  - `95` `FINISH` `print_catalog.csv`
  - `96` `FINISH` `learning_resource.csv`
  - `97` `FINISH` `glossary_term.csv`
  - `98` `FINISH` `schema_touchpoint.csv`
  - `99` `FINISH` `module_recipe.csv`
  - `87` `FINISH` `file_artifact.csv`
  - `92` `FINISH` `sql_pattern.csv`
  - `201` `FINISH` `file_artifact.csv`
  - `202` `FINISH` `sql_pattern.csv`
  - `387` `FINISH` `reference_document.csv`
  - `390` `FINISH` `chunk.csv`

## ComarchOptimaReference

- Verdict: `FAIL`
- Export dir: `exports/optima_reference/v1`
- Staging generatedAt: `2026-07-30T11:26:41.098Z`
- Errors:
  - Duplicate IDs in reference_document.csv: 1
- Required files:
  - `reference_document.csv`: exists `true`, rows `3370`
  - `chunk.csv`: exists `true`, rows `456`
- Jobs:
  - `102` `FINISH` `help_category.csv`
  - `103` `FINISH` `module_area.csv`
  - `109` `FINISH` `learning_guide.csv`
  - `110` `FINISH` `knowledge_route.csv`
  - `112` `FINISH` `entry_guide.csv`
  - `227` `FINISH` `version_topic.csv`
  - `363` `FINISH` `chunk.csv`
  - `552` `FINISH` `reference_document.csv`

## ComarchOptimaBusinessSemantics

- Verdict: `FAIL`
- Export dir: `exports/optima_business_semantics/v1`
- Staging generatedAt: `2026-07-30T11:26:44.605Z`
- Errors:
  - Required CSV has zero rows: code_meaning.csv
- Required files:
  - `business_domain.csv`: exists `true`, rows `8`
  - `business_description.csv`: exists `true`, rows `630`
  - `code_meaning.csv`: exists `true`, rows `0`
  - `business_rule.csv`: exists `true`, rows `21`
- Jobs:
  - `336` `FINISH` `business_domain.csv`
  - `337` `FINISH` `business_description.csv`
  - `338` `FINISH` `code_meaning.csv`
  - `339` `FINISH` `business_rule.csv`

## ComarchOptimaPartnerTechnical

- Verdict: `FAIL`
- Export dir: `exports/optima_partner_technical/v1`
- Staging generatedAt: `2026-07-30T11:26:50.394Z`
- Errors:
  - Duplicate IDs in cfg_entry.csv: 3
- Required files:
  - `reference_document.csv`: exists `true`, rows `126`
  - `partner_asset.csv`: exists `true`, rows `548`
  - `chunk.csv`: exists `true`, rows `339`
- Jobs:
  - `122` `FINISH` `partner_category.csv`
  - `147` `FINISH` `partner_asset.csv`
  - `124` `FINISH` `asset_type.csv`
  - `125` `FINISH` `version_band.csv`
  - `126` `FINISH` `product_area.csv`
  - `165` `FINISH` `msg_entry.csv`
  - `138` `FINISH` `com_example.csv`
  - `139` `FINISH` `com_interface_use.csv`
  - `140` `FINISH` `com_schema_touchpoint.csv`
  - `127` `FINISH` `knowledge_route.csv`
  - `150` `FINISH` `com_module_recipe.csv`
  - `160` `FINISH` `cfg_entry.csv`
  - `162` `FINISH` `proc_entry.csv`
  - `385` `FINISH` `reference_document.csv`
  - `389` `FINISH` `chunk.csv`

## ComarchBetterflyReference

- Verdict: `PASS`
- Export dir: `exports/betterfly_reference/v1`
- Staging generatedAt: `2026-07-27T03:35:41.907Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `40`
  - `api_resource.csv`: exists `true`, rows `25`
  - `api_pattern.csv`: exists `true`, rows `70`
  - `chunk.csv`: exists `true`, rows `264`
- Jobs:
  - `167` `FINISH` `help_category.csv`
  - `168` `FINISH` `module_area.csv`
  - `186` `FINISH` `api_resource.csv`
  - `192` `FINISH` `api_pattern.csv`
  - `193` `FINISH` `learning_guide.csv`
  - `194` `FINISH` `entry_guide.csv`
  - `322` `FINISH` `knowledge_route.csv`
  - `522` `FINISH` `reference_document.csv`
  - `523` `FINISH` `chunk.csv`

## ComarchCommunityNews

- Verdict: `FAIL`
- Export dir: `exports/community_news/v1`
- Staging generatedAt: `2026-07-30T03:15:14.157Z`
- Errors:
  - Duplicate IDs in chunk.csv: 78
- Required files:
  - `reference_document.csv`: exists `true`, rows `167`
  - `news_topic.csv`: exists `true`, rows `37`
  - `chunk.csv`: exists `true`, rows `597`
- Jobs:
  - `209` `FINISH` `knowledge_route.csv`
  - `210` `FINISH` `entry_guide.csv`
  - `542` `FINISH` `reference_document.csv`
  - `543` `FINISH` `news_topic.csv`
  - `544` `FINISH` `community_attachment.csv`
  - `545` `FINISH` `chunk.csv`

## TaxbellLegalReference

- Verdict: `PASS`
- Export dir: `exports/taxbell_legal_reference/v1`
- Staging generatedAt: `2026-07-30T08:43:18.085Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `72`
  - `source_topic.csv`: exists `true`, rows `5`
  - `chunk.csv`: exists `true`, rows `389`
- Jobs:
  - `248` `FINISH` `source_topic.csv`
  - `249` `FINISH` `knowledge_route.csv`
  - `250` `FINISH` `entry_guide.csv`
  - `549` `FINISH` `chunk.csv`
  - `554` `FINISH` `reference_document.csv`

## TaxbellPayrollHRReference

- Verdict: `FAIL`
- Export dir: `exports/taxbell_payroll_hr_reference/v1`
- Staging generatedAt: `2026-07-30T11:28:18.617Z`
- Errors:
  - Duplicate IDs in chunk.csv: 60
- Required files:
  - `reference_document.csv`: exists `true`, rows `69`
  - `source_topic.csv`: exists `true`, rows `10`
  - `chunk.csv`: exists `true`, rows `576`
- Jobs:
  - `253` `FINISH` `source_topic.csv`
  - `254` `FINISH` `knowledge_route.csv`
  - `255` `FINISH` `entry_guide.csv`
  - `550` `FINISH` `reference_document.csv`
  - `551` `FINISH` `chunk.csv`

## TaxbellAccountingVATReference

- Verdict: `PASS`
- Export dir: `exports/taxbell_accounting_vat_reference/v1`
- Staging generatedAt: `2026-07-30T08:43:18.740Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `75`
  - `source_topic.csv`: exists `true`, rows `6`
  - `chunk.csv`: exists `true`, rows `416`
- Jobs:
  - `258` `FINISH` `source_topic.csv`
  - `259` `FINISH` `knowledge_route.csv`
  - `260` `FINISH` `entry_guide.csv`
  - `536` `FINISH` `reference_document.csv`
  - `537` `FINISH` `chunk.csv`

## ComarchUniversalKnowledge

- Verdict: `WARN`
- Export dir: `exports/universal_knowledge/v1`
- Staging generatedAt: `2026-06-24T07:39:30.734Z`
- Warnings:
  - Required CSV has zero rows: reference_document.csv (catch-all KB starts empty)
  - Required CSV has zero rows: chunk.csv (catch-all KB starts empty)
- Required files:
  - `reference_document.csv`: exists `true`, rows `0`
  - `chunk.csv`: exists `true`, rows `0`

## OWAOntology

- Verdict: `FAIL`
- Export dir: `exports/owa_ontology/v1`
- Staging generatedAt: `2026-07-30T11:27:24.370Z`
- Errors:
  - Duplicate IDs in ontology_entity.csv: 1
  - Duplicate IDs in ontology_relation.csv: 3
  - Duplicate IDs in workflow_pattern.csv: 1
  - Duplicate IDs in chunk.csv: 2
  - Promoted drafts without visible chunks: 66
- Required files:
  - `ontology_entity.csv`: exists `true`, rows `68`
  - `ontology_field.csv`: exists `true`, rows `109`
  - `ontology_relation.csv`: exists `true`, rows `149`
  - `workflow_pattern.csv`: exists `true`, rows `133`
  - `chunk.csv`: exists `true`, rows `192`
- Jobs:
  - `462` `FINISH` `ontology_entity.csv`
  - `463` `FINISH` `ontology_field.csv`
  - `464` `FINISH` `ontology_relation.csv`
  - `465` `FINISH` `workflow_pattern.csv`
  - `466` `FINISH` `chunk.csv`

