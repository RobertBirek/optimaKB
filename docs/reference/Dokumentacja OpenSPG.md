# OpenSPG & KAG — Complete Knowledge Base

---

## Document Metadata

| Field | Value |
|---|---|
| **Document Title** | OpenSPG & KAG — Complete Knowledge Base for LLM |
| **Version** | KAG v0.8.0 / OpenSPG latest |
| **Last Updated** | 2026-04-06 |
| **Primary Sources** | https://openspg.yuque.com/ndx6g9/docs_en · https://github.com/OpenSPG/KAG · https://github.com/OpenSPG/openspg · https://arxiv.org/abs/2409.13731 |
| **License** | Apache License 2.0 |
| **Organization** | Ant Group Knowledge Graph Team + OpenKG |
| **Purpose** | LLM knowledge base — optimized for retrieval, reasoning, and Q&A |

---

## Table of Contents

1. [Overview & Background](#1-overview--background)
2. [Core Concepts & Terminology](#2-core-concepts--terminology)
3. [OpenSPG Architecture & Core Capabilities](#3-openspg-architecture--core-capabilities)
4. [KAG Framework Architecture](#4-kag-framework-architecture)
5. [Knowledge Representation (LLMFriSPG)](#5-knowledge-representation-llmfrispg)
6. [Knowledge Alignment](#6-knowledge-alignment)
7. [Installation & Quick Start](#7-installation--quick-start)
8. [User Guide — Product Mode](#8-user-guide--product-mode)
9. [User Guide — Developer Mode](#9-user-guide--developer-mode)
10. [Configuration Reference](#10-configuration-reference)
11. [KAG v0.8 — New Features (2025)](#11-kag-v08--new-features-2025)
12. [KAG v0.7 — Features (2025)](#12-kag-v07--features-2025)
13. [SPGReasoner](#13-spgreasoner)
14. [Examples & Use Cases](#14-examples--use-cases)
15. [Performance & Benchmarks](#15-performance--benchmarks)
16. [Differences: KAG vs RAG vs GraphRAG](#16-differences-kag-vs-rag-vs-graphrag)
17. [HTTP API Reference](#17-http-api-reference)
18. [Release History](#18-release-history)
19. [Design Philosophy](#19-design-philosophy)
20. [Contributing & Community](#20-contributing--community)
21. [Citation & References](#21-citation--references)
22. [FAQ](#22-faq)

---

## 1. Overview & Background

### 1.1 What is OpenSPG

**OpenSPG** (Open Semantic-enhanced Programmable Graph) is a **knowledge graph engine** developed by **Ant Group** in collaboration with **OpenKG**, based on the SPG (Semantic-enhanced Programmable Graph) framework. It is an open engine for knowledge graphs designed and implemented on the basis of the SPG framework, which represents a summary of Ant Group's years of experience in constructing and applying diverse domain knowledge graphs in financial scenarios.

OpenSPG provides:
- Explicit semantic representations
- Logical rule definitions
- Operator frameworks for construction and inference
- Pluggable adaptation of basic engines and algorithmic services by various vendors
- Support for building customized solutions

OpenSPG is the **underlying engine** on which the KAG (Knowledge Augmented Generation) framework is natively built.

**Key repositories:**
- OpenSPG engine: https://github.com/OpenSPG/openspg
- KAG framework: https://github.com/OpenSPG/KAG
- KAG-Thinker model: https://github.com/OpenSPG/KAG-Thinker

### 1.2 What is KAG

**KAG** (Knowledge Augmented Generation) is a **logical reasoning and Q&A framework** based on the OpenSPG engine and large language models (LLMs). KAG is used to build logical reasoning and Q&A solutions for vertical domain knowledge bases.

**Primary goal:** Build a knowledge-enhanced LLM service framework in professional domains, supporting logical reasoning, factual Q&A, and domain-specific knowledge services.

**KAG solves the following key problems:**
- The gap between vector similarity and the relevance of knowledge reasoning in traditional RAG
- Insensitivity to knowledge logic (numerical values, temporal relations, expert rules)
- The noise problem introduced by OpenIE in GraphRAG
- Lack of multi-hop reasoning capability in standard retrieval systems

**KAG's core features:**
1. **Knowledge and Chunk Mutual Indexing** — integrates more complete contextual text information
2. **Knowledge alignment using conceptual semantic reasoning** — alleviates the noise problem caused by OpenIE
3. **Schema-constrained knowledge construction** — supports representation and construction of domain expert knowledge
4. **Logical form-guided hybrid reasoning and retrieval** — supports logical reasoning and multi-hop reasoning Q&A

### 1.3 Relationship between OpenSPG and KAG

```
OpenSPG (Engine Layer)
├── SPG-Schema       ← semantic modeling
├── SPG-Builder      ← knowledge construction
├── SPG-Reasoner     ← logical rule reasoning
├── KNext            ← programmable framework
└── Cloudext         ← cloud adaptation layer

KAG (Application Framework Layer — built on top of OpenSPG)
├── KAG-Builder      ← uses SPG-Builder + LLMs for knowledge extraction
├── KAG-Solver       ← uses SPG-Reasoner + LLMs for hybrid reasoning
└── KAG-Model        ← fine-tuned models for KAG pipeline tasks
```

OpenSPG provides the **infrastructure**: graph storage, schema management, reasoning execution engine, and cloud adaptation. KAG provides the **application-level framework**: knowledge extraction pipelines, hybrid reasoning solvers, and Q&A interfaces.

### 1.4 Origins: Ant Group and OpenKG

- **Ant Group** (Alibaba/Alipay's fintech subsidiary) developed the SPG framework internally after years of building and applying domain knowledge graphs in financial scenarios (risk management, supply chain, compliance, etc.).
- **OpenKG** is the open knowledge graph platform/consortium that collaborated in releasing OpenSPG publicly.
- The SPG White Paper was jointly released by Ant Group and OpenKG.
- Academic research paper: *KAG: Boosting LLMs in Professional Domains via Knowledge Augmented Generation* (arXiv:2409.13731, September 2024).

### 1.5 SPG (Semantic-enhanced Programmable Graph) Background

**SPG** is a semantic representation framework based on **property graph** (LPG), developed by Ant Group's knowledge graph platform after years of supporting business in the financial field.

**Key innovations of SPG:**
1. **Integrates LPG structure with RDF semantics** — overcomes the problem that RDF/OWL semantic complexity cannot be industrially deployed, while fully inheriting the advantages of LPG's structural simplicity and compatibility with big data systems.
2. **Defines and represents knowledge semantics from three aspects:**
   - Formal representation and programmable framework of "knowledge" (machine-understandable, definable, programmable)
   - Compatibility and progressive advancement between knowledge levels
   - Effective bridge between big data and AI technology systems
3. **Supports domain model extension** — new business scenarios can quickly build domain models by extending the domain knowledge model and developing new operators.

**SPG vs LPG vs RDF comparison:**

| Feature | LPG | RDF/OWL | SPG |
|---|---|---|---|
| Structure | Simple, flexible | Complex ontology | Enhanced property graph |
| Semantic richness | Low | High | High |
| Industrial deployment | Easy | Difficult | Easy |
| Big data compatibility | Good | Poor | Good |
| Programmable logic rules | Limited | Yes (OWL) | Yes (KGDSL) |
| LLM friendliness | Medium | Low | High (LLMFriSPG) |

### 1.6 Comparison: RAG vs GraphRAG vs KAG

**RAG (Retrieval-Augmented Generation):**
- Retrieves text chunks using vector similarity
- Does not maintain entity relationships across chunks
- Struggles with multi-hop reasoning
- Prone to hallucinations in professional domains
- Good for: general Q&A, open-domain questions, flexible documents

**GraphRAG (Microsoft):**
- Builds a graph of document snippets with semantic relations
- Uses OpenIE — introduces noise from ambiguous entity extraction
- Generates community summaries
- Better at multi-hop than standard RAG
- Does not perform strict fact extraction
- Cannot execute structured graph queries

**KAG (Knowledge Augmented Generation):**
- Combines structured knowledge graphs with vector retrieval
- Uses schema-constrained or schema-free extraction
- Supports multi-hop logical reasoning
- Maintains entity relationships with explicit semantics
- Uses concept graphs for noise reduction and semantic alignment
- Supports logical forms (SPARQL-like + symbolic reasoning)
- Suitable for: professional domains (law, medicine, finance, science), strict fact Q&A, multi-hop reasoning

---

## 2. Core Concepts & Terminology

### 2.1 SPG — Semantic-enhanced Programmable Graph

The core framework that defines how knowledge is represented, stored, and reasoned about. SPG extends LPG with:
- Rich semantic types (EntityType, ConceptType, EventType)
- Predicate semantics and logical rule definitions
- Programmable operator framework
- Compatibility with both schema-constrained and schema-free representations

### 2.2 LPG — Labeled Property Graph

A graph model where:
- Nodes and edges have labels (types)
- Both nodes and edges can have arbitrary key-value properties
- Examples: Neo4j, TuGraph
- SPG is built on top of LPG

### 2.3 RDF/OWL

**RDF** (Resource Description Framework) — a W3C standard for representing information about resources on the web using subject-predicate-object triples.

**OWL** (Web Ontology Language) — extends RDF with richer vocabulary for describing ontologies, but is complex and difficult to deploy industrially.

SPG bridges LPG and RDF/OWL by providing semantic expressiveness without the deployment complexity of OWL.

### 2.4 DIKW Hierarchy

The **Data → Information → Knowledge → Wisdom** hierarchy is the conceptual foundation for KAG's knowledge representation:

```
Wisdom    → Business insights, decisions
Knowledge → KGcs: schema-constrained expert knowledge
Information → KGfr: graph information from OpenIE extraction
Data      → RC: raw document chunks
```

KAG maps each DIKW level to a specific representation layer, allowing progressive knowledge construction from raw data to structured expert knowledge.

### 2.5 LLMFriSPG

**LLMFriSPG** is an upgrade of the SPG framework specifically designed to be **friendly to Large Language Models**. It adds:
- Deep text-context awareness (supporting_chunks, description, summary)
- Dynamic properties alongside static schema-constrained properties
- Knowledge stratification (three-layer hierarchy)
- Instance-to-concept relationships (belongTo)
- Built-in properties for LLM interaction

Formal definition:
```
ℳ = {𝒯, ρ, 𝒞, ℒ}

where:
  𝒯 = all EntityType and EventType classes (LPG-compatible)
  𝒞 = all ConceptType classes, concept nodes, concept relations
  ρ = inductive relations from instances to concepts
  ℒ = executable rules on logical relations and logical concepts

For each type t ∈ 𝒯:
  p_t = {p_t^c, p_t^f, p_t^b}

  p_t^c = pre-defined static properties (domain expert schema)
  p_t^f = dynamically added free properties (OpenIE extraction)
  p_t^b = built-in system properties (supporting_chunks, description, summary, belongTo)
```

### 2.6 KGcs — Knowledge Graph with Schema Constraints

The **knowledge layer** in LLMFriSPG. Characteristics:
- Fully complies with SPG semantic specifications
- Requires pre-defined schema constraints
- High knowledge accuracy and logical rigor
- Constructed with expert annotation (higher cost)
- Supports knowledge construction and logical rule definition
- Use case: professional decision-making, compliance, medical facts

### 2.7 KGfr — Knowledge Graph Free Representation

The **graph information layer** in LLMFriSPG. Characteristics:
- Shares the same EntityTypes, EventTypes, and conceptual system with KGcs
- Constructed via OpenIE (schema-free information extraction)
- Lower construction cost, broader coverage
- Provides effective information supplement for KGcs
- Connected to RC via supporting_chunks, summary, description edges
- Use case: general information retrieval, exploratory knowledge building

### 2.8 RC — Raw Chunks

The **raw chunks layer** in LLMFriSPG. Characteristics:
- Original document chunks after semantic segmentation
- Stored as Chunk entity type instances
- Each chunk has: id (articleID#paraCode#idInPara), summary, mainText
- Connected to KGfr via inverted index (graph-structure-based)
- Provides full text context for LLM reasoning

### 2.9 SPO Triples

**Subject-Predicate-Object** triples are the fundamental knowledge units in KAG/SPG:
- **Subject**: an entity instance (e.g., "Thomas C. Sudhof")
- **Predicate**: a relation type (e.g., "worksAt", "hasDisease", "belongTo")
- **Object**: another entity instance or literal value (e.g., "Stanford University")

Example:
```
(Thomas C. Sudhof, worksAt, Stanford University)
(Thomas C. Sudhof, researchFocus, Alzheimer's disease)
(Stanford University, locatedIn, California)
```

### 2.10 Entity Types, Concept Types, Event Types

**EntityType (`𝒯`):**
- Object-oriented class declarations (LPG-compatible)
- Examples: Person, Organization, GEOLocation, Date, Creature, Work
- Can have pre-defined static properties (p_t^c) and dynamic free properties (p_t^f)

**ConceptType (`𝒞`):**
- Represents categories and taxonomies
- Organized in concept trees (text-based hierarchy)
- Each concept node has a unique ConceptType class
- Examples: TaxoOfPerson, TaxoOfOrganization
- Used for semantic alignment between LLM and instances

**EventType:**
- Represents events and activities
- Has associated entities and temporal properties
- Extracted alongside entity instances during knowledge construction

### 2.11 KGDSL — Knowledge Graph Domain Specific Language

**KGDSL** (Knowledge Graph Domain Specific Language) is the programmable symbolic language abstracted by SPG-Reasoner for defining:
- Logic rules (if-then rules over graph patterns)
- Predicate semantics
- Dependency and transfer between knowledge
- Complex business scenario analysis

KGDSL provides:
- Machine-understandable symbolic form for downstream tasks
- Rule inference execution
- Neural/symbolic fusion learning support
- KG2Prompt representation for LLM integration

### 2.12 Mutual Indexing

**Mutual Indexing** is a bidirectional index structure between the knowledge graph (KGfr) and raw text chunks (RC). It consists of:

1. **Graph → Text direction**: Each entity/relation instance has `supporting_chunks` property pointing to the text chunks it was extracted from.
2. **Text → Graph direction**: Each text chunk is linked to the entity instances extracted from it.

Benefits:
- Constructs graph-structure-based inverted index
- Enables efficient retrieval during reasoning
- Provides full text context for LLM responses
- Supports cross-document entity linking
- Enables traceable and interpretable results

### 2.13 Logical Forms

**Logical Forms** are structured symbolic representations of natural language questions. In KAG, the LFPlanner converts natural language queries into logical forms that:
- Specify entity types and relation patterns
- Include variable bindings for multi-hop traversal
- Can be executed against the knowledge graph (SPARQL-like)
- Enable exact match retrieval, fuzzy search, numerical computation, and semantic reasoning
- Combine multiple retrieval strategies into coherent problem-solving processes

---

## 3. OpenSPG Architecture & Core Capabilities

### 3.1 SPG-Schema Semantic Modeling

The schema framework responsible for semantic enhancement of property graphs. Features:
- **Subject models**: entity type definitions with properties and relations
- **Evolutionary models**: support for incremental schema evolution
- **Predicate models**: semantic definition of relationships between entities
- Domain model constrained knowledge modeling
- Schema management API (via OpenSPG-Server)
- Namespace-based isolation between different knowledge domains

**Schema definition example** (`MyProject.schema`):
```
namespace MyProject

# Entity type definition
Person(name: Text, birthDate: Date, nationality: Text)
  - worksAt -> Organization
  - knownFor -> Text
  - belongTo -> TaxoOfPerson

Organization(name: Text, type: Text, location: Text)
  - hasMember -> Person

# Concept type definition
TaxoOfPerson(name: Text)
  - isA -> TaxoOfPerson  # hierarchical concept tree
```

### 3.2 SPG-Builder Knowledge Construction

Supports construction of both structured and unstructured knowledge. Features:
- **Compatible with big data architecture** — provides knowledge construction operator framework
- **Unstructured knowledge construction**: from text documents (PDF, TXT, Word, HTML)
- **Structured knowledge construction**: from tables, databases, JSON
- **Knowledge processing SDK framework**: entity linking, concept standardization, entity normalization operators
- **NLP and deep learning algorithm integration**: improves uniqueness level of instances within a single type
- **Continuous iterative evolution**: supports progressive knowledge graph building

**Core pipeline components:**
```
Reader → Splitter → Extractor → PostProcessor → Vectorizer → Writer
```

| Component | Type | Description |
|---|---|---|
| Reader | `dict_reader` | Reads input data (file, dataset, structured data) |
| Splitter | `length_splitter` | Splits documents into chunks with configurable length |
| Extractor | `schema_free_extractor` | OpenIE-based entity/relation extraction using LLM |
| PostProcessor | `kag_post_processor` | Entity disambiguation and knowledge alignment |
| Vectorizer | `batch_vectorizer` | Generates embeddings for text chunks and entities |
| Writer | `kg_writer` | Writes SPO triples and vectors to storage |

### 3.3 SPG-Reasoner Logical Rule Reasoning

Abstracts KGDSL to provide programmable symbolic representation of logic rules. Features:
- **Rule inference**: execute if-then rules over graph data
- **Neural/symbolic fusion learning**: combine deep learning with symbolic rules
- **KG2Prompt**: link LLM knowledge extraction/reasoning with symbolic forms
- **Predicate semantics**: define dependency and transfer between knowledge
- **Complex business scenario modeling**: multi-step reasoning pipelines
- **Downstream task support**: classification, risk detection, compliance checking

### 3.4 KNext — Programmable Framework

KNext is the programmable framework of the knowledge graph, offering extensible, procedural, and user-friendly components:
- **Abstracts core KG capabilities** into componentized, framework-oriented, engine-built-in capabilities
- **Isolates engine from business logic**: enables rapid definition of KG solutions without modifying the engine
- **Constructs controllable AI technology stack**: connects LLM and GraphLearning capabilities
- **Component types**: builders, reasoners, retrievers, generators, planners

### 3.5 Cloudext — Cloud Adaptation Layer

The cloud adaptation layer enables vendor-agnostic deployment:
- Business systems build front-ends by interfacing with open SDKs
- **Extensible/adaptable graph storage engines**: TuGraph, Neo4j, custom backends
- **Extensible/adaptable graph calculation engines**: custom algorithms
- **Machine learning framework adaptation**: suitable for different business ML infrastructure

### 3.6 Storage Backends

**Graph Databases (KG Store — LPG storage):**
| Backend | Type | Notes |
|---|---|---|
| TuGraph | Open-source LPG DB | Developed by Ant Group, default in some configurations |
| Neo4j | Commercial/Community LPG DB | Most commonly used, well-documented |
| Custom LPG | Any LPG-compatible | Via Cloudext adaptation layer |

**Vector Stores:**
| Backend | Type | Notes |
|---|---|---|
| ElasticSearch | Distributed search | Supports both text and vector search |
| Milvus | Dedicated vector DB | High-performance vector similarity search |
| Built-in (LPG embedded) | Embedded vector storage | Available in some LPG engines |

---

## 4. KAG Framework Architecture

### 4.1 Overview

The KAG framework consists of **three main components**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        KAG Framework                            │
│                                                                  │
│  ┌───────────────────────┐    ┌───────────────────────────────┐ │
│  │     KAG-Builder       │    │        KAG-Solver             │ │
│  │  (Offline Indexing)   │    │    (Online Reasoning Q&A)     │ │
│  │                       │    │                               │ │
│  │ • Semantic Chunking   │    │ • Logical Form Planning       │ │
│  │ • OpenIE Extraction   │    │ • Hybrid Retrieval            │ │
│  │ • Knowledge Alignment │    │ • Graph Reasoning             │ │
│  │ • Mutual Indexing     │    │ • Answer Generation           │ │
│  │ • Schema Constraints  │    │ • Reflection                  │ │
│  └───────────────────────┘    └───────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     KAG-Model                               ││
│  │  NLU Enhancement | NLI Enhancement | NLG Enhancement        ││
│  │  K-LoRA | OneGen | KAG-Thinker                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   OpenSPG Engine │
                    │ (Graph DB + Vec  │
                    │  Store + Schema) │
                    └──────────────────┘
```

### 4.2 KAG-Builder (kg-builder)

KAG-Builder implements a knowledge representation friendly to large language models. It builds offline indexes from raw documents through three coherent processes:

1. **Structured information acquisition**
2. **Knowledge semantic alignment**
3. **Graph storage writer**

#### 4.2.1 Semantic Chunking

The document is segmented into semantically coherent chunks based on:
- Document structural hierarchy (sections, paragraphs, headers)
- Inherent logical connections between paragraphs
- System-built-in prompts for semantic chunking

**Chunk properties:**
- `id`: composite field `articleID#paraCode#idInPara` (sequential adjacency = content adjacency)
- `summary`: auto-generated summary of the chunk
- `mainText`: the actual text content

**Chunk storage:**
- Stored as instances of the `Chunk` EntityType in the RC layer
- Reciprocal relations established between original document and segmented chunks
- Adjacent chunks are adjacent in ID space for context navigation

#### 4.2.2 Information Extraction (OpenIE)

Uses fine-tuning-free LLMs (GPT-3.5, DeepSeek, Qwen, etc.) or fine-tuned models to extract:

**Three-step extraction process:**
1. Extract entity set `E = {e1, e2, e3, ...}` chunk by chunk
2. Extract event set `EV = {ev1, ev2, ev3, ...}` associated with all entities; iteratively extract relation set `R = {r1, r2, r3, ...}` between all entities in E
3. Complete all hypernym relations between instances and their spgClass

**Generated built-in properties per instance:**
- `e.description` — general descriptive information for the entity
- `e.summary` — entity summary in original document context
- `<e, belongTo, semanticType>` — semantic type classification
- `<e, hasClass, spgClass>` — SPG class assignment

**Supported LLMs for extraction:**
- OpenAI GPT series (GPT-3.5, GPT-4)
- DeepSeek (deepseek-chat)
- Qwen (qwen2 series)
- Any OpenAI-compatible API endpoint

#### 4.2.3 Domain Knowledge Injection and Constraints

Three mechanisms for domain-specific knowledge alignment:

**1. Domain term and concept injection:**
```
Step 1: Store domain concepts and terms with descriptions in KG storage
Step 2: Extract all instances from document via OpenIE
Step 3: Perform vector retrieval to obtain possible concept/term sets Ed
Step 4: Add Ed to extraction prompt → re-extract → get Eda (aligned set)
```

**2. Schema-constraint Extraction:**
- Pre-define EntityType with specific properties for document types
- Examples: drug instructions, government documents, legal definitions
- Each document type → EntityType, each paragraph → property value
- Enables direct property-level retrieval without LLM re-generation

**3. Pre-defined Knowledge Structures by Document Type:**
```
# Example: Government Affairs
GovernmentAffair(
  administrativeDivisions: Text,
  serviceProcedures: Text,
  requiredMaterials: Text,
  serviceLocations: Text,
  targetGroups: Text
)
```

#### 4.2.4 Mutual Indexing Between Text Chunks and Knowledge Structures

Four core data structures in the mutual index:

| Structure | Description | Storage |
|---|---|---|
| **Shared Schemas** | Pre-defined SPG Classes (EntityTypes, ConceptTypes, EventTypes) as coarse-grained categories | KG Store |
| **Instance Graph** | All event and entity instances from KGcs and KGfr | KG Store |
| **Text Chunks** | Special entity nodes conforming to Chunk EntityType | KG Store + Vector Store |
| **Concept Graph** | Core component for knowledge alignment — concept nodes + relations | KG Store + Vector Store |

**Two storage structures:**
1. **KG Store** — stores graph data in LPG databases (TuGraph, Neo4j)
2. **Vector Store** — stores text and vectors in ElasticSearch, Milvus, or embedded vector storage

#### 4.2.5 Schema-Constrained Extraction

For professional domain documents with strong structural consistency:
- Define the data structure as an SPG schema
- Map document sections to entity type properties
- Perform structured extraction aligned with the pre-defined schema
- Enables: knowledge management, quality improvement, property-level retrieval

#### 4.2.6 Builder Pipeline Components

```yaml
kag_builder_pipeline:
  chain:
    type: unstructured_builder_chain
  reader:         # Input data reader
  splitter:       # Document chunker
  extractor:      # Entity/relation extractor
  post_processor: # Disambiguation, alignment
  vectorizer:     # Embedding generation
  writer:         # KG storage writer
```

**Configuration parameters:**
- `num_threads_per_chain`: parallelism within a single chain (default: 1)
- `num_chains`: number of parallel chains (default: 16)
- `split_length`: maximum chunk length (characters)
- `window_length`: overlap between adjacent chunks
- `similarity_threshold`: entity deduplication threshold (default: 0.9)

### 4.3 KAG-Solver (kg-solver)

KAG-Solver is a logical symbol-guided hybrid solving and reasoning engine. It transforms natural language questions into a problem-solving process combining language and symbols.

#### 4.3.1 Logical Form Solver Algorithm

```
Algorithm: Logical Form Solver
Input: query (natural language question)

1. memory ← []
2. query_cur ← query
3. FOR round in (0, n):
4.   lf_list ← LFPlanner(query_cur)
5.   history ← []
6.   FOR lf in lf_list:
7.     lf_subquery, lf_func ← lf
8.     retrievals_sub ← Execute(lf_func, lf_subquery, memory)
9.     history.append(retrievals_sub)
10.  answer_cur, is_sufficient ← Reasoner(query_cur, history, memory)
11.  IF is_sufficient:
12.    memory.append(answer_cur)
13.    query_cur ← next_subquery(query_cur)
14.  ELSE:
15.    query_cur ← supplement_query(query_cur, history)
16. RETURN Generator(query, memory)
```

#### 4.3.2 Planning Operators (LFPlanner)

The **LFPlanner** decomposes complex natural language questions into:
- **Sub-questions**: simpler components of the original question
- **Logical forms**: structured symbolic representations
- **Execution plans**: ordered steps for retrieval and reasoning

**Two planning modes (KAG v0.7+):**
- **Static planning**: all sub-questions determined upfront before execution
- **Iterative planning**: dynamically generates next sub-question based on intermediate results (more adaptive, better for complex queries)

#### 4.3.3 Reasoning Operators

The reasoning phase integrates four distinct problem-solving processes:

| Process | Description | When Used |
|---|---|---|
| **KG Reasoning** | Graph traversal, relation path following, SPARQL-like queries | Multi-hop fact retrieval |
| **Language Reasoning** | LLM-based inference and comprehension | Open-ended analysis |
| **Numerical Computation** | Mathematical operations, set operations, sorting | Quantitative questions |
| **Retrieval** | Vector similarity search, text matching | Broad document search |

#### 4.3.4 Retrieval Operators

**Three retrieval operator types:**

**1. Exact KG Retriever (`exact_kg_retriever`):**
```yaml
exact_kg_retriever:
  type: default_exact_kg_retriever
  el_num: 5          # number of entity linking candidates
  llm_client: *chat_llm
  search_api: *search_api
  graph_api: *graph_api
```

**2. Fuzzy KG Retriever (`fuzzy_kg_retriever`):**
```yaml
fuzzy_kg_retriever:
  type: default_fuzzy_kg_retriever
  el_num: 5
  vectorize_model: *vectorize_model
  llm_client: *chat_llm
  search_api: *search_api
  graph_api: *graph_api
```

**3. Chunk Retriever (`chunk_retriever`):**
```yaml
chunk_retriever:
  type: default_chunk_retriever
  llm_client: *chat_llm
  recall_num: 10     # number of chunks to recall
  rerank_topk: 10    # top-k after reranking
```

#### 4.3.5 KAG Solver Pipeline Configuration

```yaml
kag_solver_pipeline:
  memory:
    type: default_memory
    llm_client: *chat_llm
    max_iterations: 3
  reasoner:
    type: default_reasoner
    llm_client: *chat_llm
    lf_planner:
      type: default_lf_planner
      llm_client: *chat_llm
      vectorize_model: *vectorize_model
    lf_executor:
      type: default_lf_executor
      llm_client: *chat_llm
      force_chunk_retriever: true
      exact_kg_retriever: *exact_kg_retriever
      fuzzy_kg_retriever: *fuzzy_kg_retriever
      chunk_retriever: *chunk_retriever
  merger:
    type: default_lf_sub_query_res_merger
    vectorize_model: *vectorize_model
    chunk_retriever: *chunk_retriever
  generator:
    type: default_generator
    llm_client: *chat_llm
    generate_prompt:
      type: resp_simple
  reflector:
    type: default_reflector
    llm_client: *chat_llm
```

### 4.4 KAG-Model (kag-model)

KAG-Model optimizes the capabilities of general LLMs for specific KAG pipeline tasks. *(Note: kag-model is being gradually open-sourced.)*

#### 4.4.1 NLU — Natural Language Understanding

Enhanced capabilities:
- Label bucketing for structured output from unstructured text
- Task-specific guidelines for information extraction
- Better entity recognition and classification
- Domain-specific entity disambiguation

#### 4.4.2 NLI — Natural Language Inference

Enhanced capabilities:
- Conceptual reasoning over knowledge graph structures
- Relation prediction between instances and concept nodes
- Semantic type inference
- Hypernym/hyponym classification

#### 4.4.3 NLG — Natural Language Generation

Enhanced capabilities:
- **K-LoRA**: domain-specific fine-tuning technique that adapts LLM writing style and knowledge to domain
- **Alignment with KG Feedback**: reduces hallucinations by validating generated content against KG facts
- High-quality answer generation grounded in retrieved knowledge

#### 4.4.4 OneGen

**OneGen** is a unified generation and retrieval model that:
- Performs generation and retrieval in a single forward pass
- Reduces latency by eliminating separate retrieval calls
- Improves coherence between retrieved content and generated answers

#### 4.4.5 KAG-Thinker

**KAG-Thinker** is an interactive thinking and deep reasoning model designed for:
- Complex multi-hop problems requiring cognitive reasoning
- Multi-round iterative thinking frameworks
- Breadth-wise problem decomposition
- Depth-wise solution derivation
- Knowledge boundary determination
- Noise-resistant retrieval result processing
- Improved reasoning paradigm stability and logical rigor

GitHub: https://github.com/OpenSPG/KAG-Thinker

---

## 5. Knowledge Representation (LLMFriSPG)

### 5.1 Three-Layer Knowledge Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: KGcs (Knowledge Layer)                        │
│  • Schema-constrained expert knowledge                  │
│  • High accuracy, high rigor                            │
│  • Requires expert annotation                           │
│  • Use: professional decision-making                    │
├─────────────────────────────────────────────────────────┤
│  Layer 2: KGfr (Information Layer)                      │
│  • OpenIE-extracted graph data                          │
│  • Entities, relations, events                          │
│  • Lower cost, broader coverage                         │
│  • Connected to KGcs and RC                             │
├─────────────────────────────────────────────────────────┤
│  Layer 1: RC (Raw Chunks Layer)                         │
│  • Original document segments                           │
│  • Full text context for LLM                            │
│  • High information completeness                        │
│  • Foundation for all higher layers                     │
└─────────────────────────────────────────────────────────┘
```

**Practical application guidance:**

| Requirement | Strategy |
|---|---|
| High accuracy and logical rigorousness | Increase coverage of R(KGcs); invest in expert annotation |
| High retrieval efficiency with some error tolerance | Increase coverage of R(KGfr); leverage automated construction |
| Balanced approach | Mix KGcs for core facts + KGfr for broader coverage |

### 5.2 Property Types

**For each EntityType `t`:**

```
p_t = {p_t^c, p_t^f, p_t^b}
```

| Property Set | Symbol | Description | Examples |
|---|---|---|---|
| Schema-constrained | `p_t^c` | Pre-defined by domain experts | name, gender, birthDate, (Person, hasFather, Person) |
| Free/dynamic | `p_t^f` | Added ad-hoc via OpenIE | constellation, recordCompany, (Person, friendOf, Person) |
| System built-in | `p_t^b` | Built into the KAG framework | supporting_chunks, description, summary, belongTo |

**Key insight:** `p_t^c` and `p_t^f` share the same class declaration but can be instantiated independently. This allows:
- Professional decision-making scenarios → mainly instantiate static properties
- Information retrieval scenarios → mainly instantiate dynamic properties
- Balanced scenarios → mix both types

### 5.3 Built-in System Properties (p_t^b)

| Property | Applied To | Meaning |
|---|---|---|
| `supporting_chunks` | Instance `e_i` | Set of all text chunks containing instance `e_i` — creates inverted index |
| `description` | Type `t_k` | Global description for the type (helps LLM understand type semantics) |
| `description` | Instance `e_i` | General descriptive information for the instance in original document context |
| `summary` | Instance `e_i` or relation `r_j` | Summary of the entity/relation in original document context |
| `belongTo` | Instance `e_i` → Concept | Inductive semantics from instance to concept (enables concept-based alignment) |

### 5.4 Instance vs Concept Separation

**Instances (`𝒯`):**
- Specific occurrences in documents (e.g., "Thomas C. Sudhof", "Stanford University")
- Use object-oriented principles to match LPG representation
- Can have both static (schema-constrained) and dynamic (free) properties

**Concepts (`𝒞`):**
- General common-sense knowledge independent of specific documents
- Organized in text-based concept trees
- Different instances linked to the same concept node → classifies instances
- Enables semantic alignment between LLM and instances
- Serves as navigation for knowledge retrieval

**Example concept tree:**
```
TaxoOfPerson (ConceptType root)
├── Scientist
│   ├── Neuroscientist
│   ├── Biochemist
│   └── Physicist
├── Politician
└── Artist
```

### 5.5 belongTo Relationship

The `belongTo` relation connects instances to concept nodes:
```
(Thomas C. Sudhof, belongTo, Biochemist)
(Stanford University, belongTo, ResearchUniversity)
```

Benefits:
- Groups instances into semantic categories
- Enables concept-based retrieval and reasoning
- Reduces ambiguity in entity understanding
- Facilitates cross-instance semantic comparison

### 5.6 Entity Normalization and Disambiguation

**Entity normalization** ensures that entities with the same meaning but different surface forms are unified:
- "Thomas C. Sudhof" = "Thomas Christian Sudhof" = "T. C. Sudhof"
- Unified through the `description` property and concept alignment
- Reduces redundancy and enhances graph connectivity

**Entity disambiguation** separates entities with same name but different meaning:
- Uses `description` and `summary` for contextual disambiguation
- Uses `belongTo` concept to differentiate types
- Uses `semanticType` and `spgClass` for type-based separation

---

## 6. Knowledge Alignment

### 6.1 Concept Semantic Graph

The concept semantic graph is the core component for knowledge alignment. It consists of:
- **Concept nodes**: fine-grained types of instances (e.g., "Biochemist", "Stanford University", "California")
- **Concept relations**: semantic relationships between concepts
- **Instance-concept links**: `belongTo` relations connecting instances to concepts

The concept graph enables:
- Alignment between LLM's internal knowledge and KG instances
- Navigation for knowledge retrieval
- Disambiguation of same-name entities
- Generalization across instances of the same concept

### 6.2 Semantic Relations Supported

| Relation Type | Description | Example |
|---|---|---|
| `isA` / hypernym | Instance or concept is a type of another | "Biochemist isA Scientist" |
| `synonym` | Two terms have the same meaning | "Thomas C. Sudhof" synonym "Thomas Sudhof" |
| `isPartOf` | Component/whole relationship | "Synapse isPartOf Neuron" |
| `contains` | Inverse of isPartOf | "Neuron contains Synapse" |
| `belongTo` | Instance belongs to a concept category | "T. Sudhof belongTo Biochemist" |
| `relatedTo` | General semantic relatedness | "Alzheimer's relatedTo Neuroscience" |

### 6.3 Offline KG Indexing Alignment

During the build phase (offline), alignment improves:
- **Standardization**: unify surface form variants of same entity
- **Connectivity**: link previously disconnected entity nodes via shared concepts
- **Deduplication**: merge duplicate entity instances using similarity threshold
- **Schema alignment**: map free-extraction results to schema-constrained representations

**Process:**
```
1. Extract entities via OpenIE from all documents
2. For each extracted entity:
   a. Compute vector embedding
   b. Retrieve similar entities from concept graph (vector search)
   c. If similarity > threshold: merge/link to existing entity
   d. Else: create new entity node, link to appropriate concept
3. Store aligned entities in KG with supporting_chunks edges
```

### 6.4 Online Retrieval Alignment

During the query phase (online), alignment serves as a bridge between user questions and KG index:
- Query entity mentions are linked to KG entity nodes via concept alignment
- Disambiguates query intent using concept context
- Expands query to cover synonyms and hypernyms
- Filters irrelevant entities using type constraints

### 6.5 Disambiguation and Fusion

**Disambiguation steps:**
1. Generate `description` and `semanticType` for each extracted entity using LLM
2. Compare with existing entities in KG using vector similarity
3. If similarity > threshold: fuse (merge) the two entity records
4. If similarity < threshold: create new entity record

**Fusion process:**
- Merge property values (prefer schema-constrained over free)
- Union `supporting_chunks` sets
- Propagate concept links
- Update inverted index

### 6.6 Domain Term and Concept Injection

**Iterative injection process:**
```python
# Step 1: Pre-load domain terms
domain_terms = load_domain_terms()  # e.g., medical terms, legal concepts
kg_store.insert(domain_terms)

# Step 2: Initial OpenIE extraction
raw_entities = openIE_extract(document)

# Step 3: Vector retrieval of candidate domain concepts
Ed = vector_search(raw_entities, domain_terms, top_k=20)

# Step 4: Guided re-extraction with domain context
prompt = build_prompt(document, Ed)  # inject Ed into extraction prompt
aligned_entities = llm_extract(prompt)

# Step 5: Store aligned entities
kg_store.insert(aligned_entities)
```

---

## 7. Installation & Quick Start

### 7.1 Product Mode — For Ordinary Users

#### 7.1.1 System Requirements

| Platform | Minimum Version |
|---|---|
| macOS | macOS Monterey 12.6 or later |
| Linux | CentOS 7 / Ubuntu 20.04 or later |
| Windows | Windows 10 LTSC 2021 or later |

**Software requirements:**

| Platform | Required Software |
|---|---|
| macOS / Linux | Docker, Docker Compose |
| Windows | WSL 2 or Hyper-V, Docker, Docker Compose |

**Recommended hardware:**
- RAM: 8GB minimum, 16GB recommended
- Storage: 20GB minimum
- Internet connection for downloading models and API calls

#### 7.1.2 Docker Installation

```bash
# Step 1: Set HOME environment variable (Windows users only)
# set HOME=%USERPROFILE%

# Step 2: Download docker-compose.yml (international/west)
curl -sSL https://raw.githubusercontent.com/OpenSPG/openspg/refs/heads/master/dev/release/docker-compose-west.yml \
  -o docker-compose-west.yml

# Step 3: Start all services
docker compose -f docker-compose-west.yml up -d

# Step 4: Verify services are running
docker compose -f docker-compose-west.yml ps
```

**Services launched by Docker Compose:**
- `openspg-server`: Main OpenSPG server with KAG framework
- `openspg-neo4j`: Neo4j graph database (port 7687)
- Supporting infrastructure (vector store, etc.)

#### 7.1.3 Accessing the Web UI

Navigate to the default URL:
```
http://127.0.0.1:8887
```

**Default credentials:**
```
Username: openspg
Password: openspg@kag
```

### 7.2 Developer Mode — For Developers

#### 7.2.1 Prerequisites

- OpenSPG-Server running (see Product Mode installation above)
- Python 3.10 (recommended) or 3.8.10+
- Conda or Python venv
- Git

#### 7.2.2 Environment Setup

**macOS / Linux:**
```bash
# Install Conda (if not installed)
# Visit: https://docs.anaconda.com/miniconda/

# Create and activate virtual environment
conda create -n kag-demo python=3.10
conda activate kag-demo

# Clone KAG repository
git clone https://github.com/OpenSPG/KAG.git

# Install KAG in development mode
cd KAG && pip install -e .

# Verify installation
knext version
knext help
```

**Windows:**
```powershell
# Install official Python 3.10 and Git
# Download from: https://www.python.org/downloads/

# Create and activate virtual environment
py -m venv kag-demo
kag-demo\Scripts\activate

# Clone KAG repository
git clone https://github.com/OpenSPG/KAG.git

# Install KAG
cd KAG && pip install -e .
```

#### 7.2.3 knext CLI Commands

```bash
Usage: knext [OPTIONS] COMMAND [ARGS]

Options:
  --version  Show the version and exit.
  --help     Show this message and exit.

Commands:
  project   Project client.     # Create, update, list projects
  reasoner  Reasoner client.    # Execute reasoning queries
  schema    Schema client.      # Commit, view schema
  thinker   Thinker client.     # Interact with KAG-Thinker

# Common commands:
knext project create --config_path ./example_config.yaml
knext project update --proj_path ./
knext schema commit
knext schema view
```

#### 7.2.4 Project Creation and Directory Structure

```bash
# Navigate to examples directory
cd kag/examples

# Edit project configuration
vim ./example_config.yaml

# Create project (maps to knowledge base in product)
knext project create --config_path ./example_config.yaml
```

**Generated project directory structure:**
```
TwoWikiTest/               # namespace from config
├── builder/
│   ├── data/              # Input documents
│   ├── indexer.py         # Build pipeline script
│   └── prompt/
│       ├── ner.py         # NER extraction prompt
│       ├── std.py         # Entity standardization prompt
│       └── tri.py         # Triple extraction prompt
├── kag_config.yaml        # Project configuration
├── reasoner/              # KGDSL rule definitions
├── schema/
│   └── TwoWikiTest.schema # Schema definition
└── solver/
    ├── evaForHotpotqa.py  # Evaluation script
    └── prompt/
        ├── logic_form_plan.py  # Planning prompt
        └── resp_generator.py   # Response generation prompt
```

---

## 8. User Guide — Product Mode

### 8.1 Global Configuration

The Global Configuration page allows setting defaults for all knowledge bases in the system.

#### 8.1.1 Database Configuration (Neo4j)

```json
{
  "database": "neo4j",
  "uri": "neo4j://release-openspg-neo4j:7687",
  "user": "neo4j",
  "password": "neo4j@openspg"
}
```

- `database`: Default database name (will be replaced by knowledge base namespace)
- `uri`: Neo4j server address (can be replaced by custom Neo4j instance)
- `user`: Neo4j username
- `password`: Neo4j password

#### 8.1.2 Vector Configuration (Embedding Models)

```json
{
  "type": "openai",
  "model": "BAAI/bge-m3",
  "base_url": "https://api.siliconflow.cn/v1",
  "api_key": "your_api_key"
}
```

- `type`: Interface type (`openai` for OpenAI-compatible APIs)
- `model`: Embedding model name
- `base_url`: URL of the embedding service endpoint
- `api_key`: API key for the service

**Important:** Embedding vectors generated by different representation models **cannot be mixed** even if they have the same dimensions. The vector configuration **cannot be modified** after a knowledge base is created.

#### 8.1.3 Prompt Configuration

```json
{
  "biz_scene": "default",
  "language": "en"
}
```

- `biz_scene`: Business scene for KAG template selection (default: "default")
- `language`: `"en"` for English, `"zh"` for Chinese

#### 8.1.4 Model Configuration

KAG supports OpenAI-compatible generative model APIs. Modes: `maas`, `vllm`, `ollama`.

**MaaS (Model as a Service) — cloud API:**
```json
{
  "model": "deepseek-chat",
  "base_url": "https://api.deepseek.com",
  "api_key": "your_deepseek_api_key"
}
```

**vLLM — local hosted:**
```json
{
  "type": "vllm",
  "model": "Qwen/Qwen2-7B-Instruct",
  "base_url": "http://localhost:8000/v1",
  "api_key": "EMPTY"
}
```

**Ollama — local hosted:**
```json
{
  "type": "ollama",
  "model": "qwen2:7b",
  "base_url": "http://localhost:11434/v1",
  "api_key": "ollama"
}
```

#### 8.1.5 User Management

User configuration supports:
- Create / delete users
- Change password
- Role management
- Access control for knowledge bases

### 8.2 Creating a Knowledge Base

1. Navigate to **Knowledge Base** → **Create New**
2. Fill in:
   - **Name**: Knowledge base name (namespace)
   - **Description**: Optional description
3. Configure:
   - **Namespace and graphStore**: can inherit from global config (default database name = namespace)
   - **Vector configuration**: inherits from global; **cannot be changed after creation**
   - **Prompt configuration**: language and business scene

### 8.3 Importing Documents (Build Task)

1. Navigate to knowledge base → **Build** → **Create Task**
2. Upload documents (supported formats: TXT, PDF, Word, HTML)
3. The build pipeline will:
   - Chunk documents semantically
   - Extract entities, events, and relations using the configured LLM
   - Align with domain concepts
   - Build mutual index
   - Store in graph database and vector store
4. Monitor progress in the task list

**Sample test files for multi-hop Q&A:**
- David Eagleman.txt
- Karl Deisseroth.txt
- Thomas C. Sudhof.txt

### 8.4 Knowledge Exploration

After building, navigate to **Knowledge Exploration** to:
- Browse extracted entities and their types
- View entity properties (static and dynamic)
- Explore relations between entities
- Filter by entity type
- Inspect supporting chunks for any entity

**Knowledge Exploration interface shows:**
- Knowledge list with entity names, types, and descriptions
- Entity detail view with all properties
- Graph visualization of entity relationships

### 8.5 Reasoning Q&A Interface

Navigate to **Reasoning Q&A** to:
1. Create a new query dialog
2. Enter your question
3. View the answer with reasoning trace:
   - Sub-question decomposition steps
   - Retrieved evidence
   - Reasoning justification
   - Final answer

**Example query:** "Which Stanford University professor works on Alzheimer's?"

**System process:**
```
Sub-question 1: Which Stanford University professor works on Alzheimer's?
→ Retrieves: Thomas C. Sudhof (TCDEMO1.PERSON)
→ Properties: biochemist, appointments at Stanford School of Medicine

Sub-question 2: Which of these professors work on Alzheimer's? Why?
→ Evidence: Thomas C. Sudhof is a Stanford University professor who works on 
  Alzheimer's. His research has significantly advanced the understanding of 
  Alzheimer's at the Howard Hughes Medical Institute.

Final Answer: Thomas C. Sudhof
```

### 8.6 Simple Mode vs Deep Reasoning Mode

| Mode | Description | Best For |
|---|---|---|
| **Simple Mode** | Single-pass retrieval and answer generation | Straightforward factual questions |
| **Deep Reasoning** | Multi-hop reasoning with sub-question decomposition | Complex questions requiring logical inference |

Deep Reasoning mode also provides:
- Streaming inference output (token-by-token display)
- Automatic rendering of graph indexes used
- Links from generated content to original source references

---

## 9. User Guide — Developer Mode

### 9.1 Project Configuration (kag_config.yaml)

The complete configuration file for a KAG project:

```yaml
# ============================================================
# LLM Configuration
# ============================================================
openie_llm: &openie_llm
  api_key: your_api_key_here
  base_url: https://api.deepseek.com
  model: deepseek-chat
  type: maas

chat_llm: &chat_llm
  api_key: your_api_key_here
  base_url: https://api.deepseek.com
  model: deepseek-chat
  type: maas

# ============================================================
# Vector/Embedding Model Configuration
# ============================================================
vectorize_model: &vectorize_model
  api_key: your_api_key_here
  base_url: https://api.siliconflow.cn/v1/
  model: BAAI/bge-m3
  type: openai
  vector_dimensions: 1024

vectorizer: *vectorize_model

# ============================================================
# Logging
# ============================================================
log:
  level: INFO

# ============================================================
# Project Configuration
# ============================================================
project:
  biz_scene: default
  host_addr: http://127.0.0.1:8887
  id: 1
  language: en
  namespace: TwoWikiTest

# ============================================================
# KAG-Builder Pipeline Configuration
# ============================================================
kag_builder_pipeline:
  chain:
    type: unstructured_builder_chain
  extractor:
    type: schema_free_extractor
    llm: *openie_llm
    ner_prompt:
      type: default_ner
    std_prompt:
      type: default_std
    triple_prompt:
      type: default_triple
  reader:
    type: dict_reader
  post_processor:
    type: kag_post_processor
    similarity_threshold: 0.9
  splitter:
    type: length_splitter
    split_length: 100000
    window_length: 0
  vectorizer:
    type: batch_vectorizer
    vectorize_model: *vectorize_model
  writer:
    type: kg_writer
  num_threads_per_chain: 1
  num_chains: 16
  scanner:
    type: 2wiki_dataset_scanner

# ============================================================
# KAG-Solver Pipeline Configuration
# ============================================================
search_api: &search_api
  type: openspg_search_api

graph_api: &graph_api
  type: openspg_graph_api

exact_kg_retriever: &exact_kg_retriever
  type: default_exact_kg_retriever
  el_num: 5
  llm_client: *chat_llm
  search_api: *search_api
  graph_api: *graph_api

fuzzy_kg_retriever: &fuzzy_kg_retriever
  type: default_fuzzy_kg_retriever
  el_num: 5
  vectorize_model: *vectorize_model
  llm_client: *chat_llm
  search_api: *search_api
  graph_api: *graph_api

chunk_retriever: &chunk_retriever
  type: default_chunk_retriever
  llm_client: *chat_llm
  recall_num: 10
  rerank_topk: 10

kag_solver_pipeline:
  memory:
    type: default_memory
    llm_client: *chat_llm
    max_iterations: 3
  reasoner:
    type: default_reasoner
    llm_client: *chat_llm
    lf_planner:
      type: default_lf_planner
      llm_client: *chat_llm
      vectorize_model: *vectorize_model
    lf_executor:
      type: default_lf_executor
      llm_client: *chat_llm
      force_chunk_retriever: true
      exact_kg_retriever: *exact_kg_retriever
      fuzzy_kg_retriever: *fuzzy_kg_retriever
      chunk_retriever: *chunk_retriever
  merger:
    type: default_lf_sub_query_res_merger
    vectorize_model: *vectorize_model
    chunk_retriever: *chunk_retriever
  generator:
    type: default_generator
    llm_client: *chat_llm
    generate_prompt:
      type: resp_simple
  reflector:
    type: default_reflector
    llm_client: *chat_llm
```

### 9.2 knext CLI Reference

```bash
# Project management
knext project create --config_path ./example_config.yaml  # Create new project
knext project update --proj_path ./                       # Update project config
knext project list                                        # List all projects

# Schema management
knext schema commit                                       # Commit schema to server
knext schema view                                         # View current schema

# Reasoner
knext reasoner execute --file ./reasoner/rule.dsl         # Execute KGDSL rule

# Thinker (KAG-Thinker integration)
knext thinker run --query "your question here"
```

### 9.3 Schema Definition and Commit

Define your domain schema in `schema/YourProject.schema`:

```
namespace YourProject

# Simple entity type
Person(
  name: Text,
  birthDate: Date,
  nationality: Text,
  occupation: Text
)
  - worksAt -> Organization
  - knownFor -> Work

Organization(
  name: Text,
  type: Text,
  foundedDate: Date,
  location: Text
)

Work(
  title: Text,
  year: Date,
  type: Text
)

# Concept type for semantic alignment
TaxoOfPerson(name: Text)
  - isA -> TaxoOfPerson

TaxoOfOrganization(name: Text)
  - isA -> TaxoOfOrganization
```

Commit to server:
```bash
cd kag/examples/YourProject
knext schema commit
```

### 9.4 Builder Pipeline Execution (indexer.py)

```python
import os
import logging
from kag.common.registry import import_modules_from_path
from kag.builder.runner import BuilderChainRunner

logger = logging.getLogger(__name__)

def buildKB(file_path):
    from kag.common.conf import KAG_CONFIG
    
    # Initialize builder from config
    runner = BuilderChainRunner.from_config(
        KAG_CONFIG.all_config['kag_builder_pipeline']
    )
    
    # Execute build pipeline
    runner.invoke(file_path)
    
    logger.info(f"\n\nbuildKB successfully for {file_path}\n\n")

if __name__ == "__main__":
    import_modules_from_path(".")
    dir_path = os.path.dirname(__file__)
    file_path = os.path.join(dir_path, "data/your_corpus.json")
    buildKB(file_path)
```

```bash
# Run the builder
cd builder
python ./indexer.py
```

### 9.5 Checkpoint System

KAG provides checkpoint-based resumption for interrupted builds.

**Checkpoint directory structure:**
```
builder/
└── ckpt/
    └── kag_checkpoint_0_1.ckpt    # Records processed documents

chain/
├── extractor/
├── postprocessor/
├── reader/
└── splitter/
```

**Checkpoint commands:**
```bash
# View extraction statistics (nodes/edges per document)
less ckpt/kag_checkpoint_0_1.ckpt

# Count successfully processed documents
wc -l ckpt/kag_checkpoint_0_1.ckpt
```

**Resumption behavior:** If build is interrupted (LLM quota exceeded, network error, program crash), simply re-run `indexer.py`. KAG automatically detects checkpoint files and resumes from where it left off.

### 9.6 Solver Pipeline / QA Execution (qa.py)

```python
import json
import logging
import os
from kag.solver.logic.solver_pipeline import SolverPipeline
from kag.common.conf import KAG_CONFIG
from kag.common.registry import import_modules_from_path

logger = logging.getLogger(__name__)

class KAGQASystem:
    """KAG-based question answering system."""
    
    def __init__(self):
        pass
    
    def qa(self, query: str) -> tuple[str, dict]:
        """
        Execute a Q&A query against the knowledge base.
        
        Args:
            query: Natural language question
            
        Returns:
            (answer, traceLog) - answer string and reasoning trace
        """
        resp = SolverPipeline.from_config(
            KAG_CONFIG.all_config['kag_solver_pipeline']
        )
        answer, traceLog = resp.run(query)
        
        logger.info(f"\n\nAnswer for '{query}': {answer}\n\n")
        return answer, traceLog

if __name__ == "__main__":
    import_modules_from_path("./prompt")
    
    qa_system = KAGQASystem()
    
    # Single question
    answer, trace = qa_system.qa(
        "Which Stanford University professor works on Alzheimer's?"
    )
    print(f"Answer: {answer}")
```

**Running with evaluation on benchmark:**
```python
from kag.common.benchmarks.evaluate import Evaluate
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

def evaluate_dataset(data_file: str, output_file: str):
    with open(data_file) as f:
        qa_pairs = json.load(f)
    
    results = []
    qa = KAGQASystem()
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(qa.qa, item['question']): item 
            for item in qa_pairs
        }
        for future in tqdm(as_completed(futures)):
            item = futures[future]
            answer, trace = future.result()
            results.append({
                'question': item['question'],
                'predicted': answer,
                'gold': item['answer'],
                'trace': trace
            })
    
    # Compute metrics
    evaluator = Evaluate()
    metrics = evaluator.compute_f1(results)
    print(f"F1: {metrics['f1']}, EM: {metrics['em']}")
```

---

## 10. Configuration Reference

### 10.1 Supported LLM Providers

| Provider | Type | Configuration |
|---|---|---|
| OpenAI | `maas` | `base_url: https://api.openai.com/v1` |
| DeepSeek | `maas` | `base_url: https://api.deepseek.com` |
| Qwen (Aliyun) | `maas` | `base_url: https://dashscope.aliyuncs.com/compatible-mode/v1` |
| SiliconFlow | `maas` | `base_url: https://api.siliconflow.cn/v1` |
| vLLM (self-hosted) | `vllm` | `base_url: http://localhost:8000/v1` |
| Ollama (local) | `ollama` | `base_url: http://localhost:11434` |
| Azure OpenAI | `maas` | `base_url: https://{resource}.openai.azure.com` |
| Anthropic Claude | `maas` | OpenAI-compatible proxy required |

### 10.2 Embedding Models

| Model | Provider | Dimensions | Notes |
|---|---|---|---|
| `BAAI/bge-m3` | SiliconFlow / local | 1024 | Recommended default |
| `text-embedding-3-small` | OpenAI | 1536 | OpenAI native |
| `text-embedding-ada-002` | OpenAI | 1536 | Legacy |
| `BAAI/bge-large-en-v1.5` | HuggingFace | 1024 | Good for English |
| `BAAI/bge-large-zh-v1.5` | HuggingFace | 1024 | Good for Chinese |

> ⚠️ **Important:** Embedding vectors from different models cannot be mixed, even if they have the same dimensions. Once set for a knowledge base, the embedding model configuration cannot be changed.

### 10.3 Graph Database Configuration

```yaml
# Neo4j (default)
graphstore:
  database: neo4j           # default database name (replaced by KB namespace)
  uri: "neo4j://release-openspg-neo4j:7687"
  user: neo4j
  password: neo4j@openspg

# TuGraph (alternative)
graphstore:
  type: tugraph
  uri: "bolt://localhost:7687"
  user: admin
  password: 73@TuGraph
```

### 10.4 Vector Store Configuration

```yaml
# Milvus
vectorstore:
  type: milvus
  host: localhost
  port: 19530

# ElasticSearch
vectorstore:
  type: elasticsearch
  host: localhost
  port: 9200

# Embedded (default in OpenSPG container)
vectorstore:
  type: embedded
```

### 10.5 Builder Chain Types

| Chain Type | Class | Use Case |
|---|---|---|
| `unstructured_builder_chain` | `DefaultUnstructuredBuilderChain` | General documents (txt, pdf, word) |
| `schema_constrained_builder_chain` | `SchemaConstrainedBuilderChain` | Structured domain data |
| `structured_builder_chain` | `StructuredBuilderChain` | CSV/table data |
| `lightweight_builder_chain` | `LightweightBuilderChain` | Fast build, 89% fewer tokens |

### 10.6 Solver Pipeline Parameters

| Parameter | Default | Description |
|---|---|---|
| `max_iterations` | 3 | Max reasoning rounds |
| `el_num` | 5 | Entity linking candidates |
| `recall_num` | 10 | Chunk recall count |
| `rerank_topk` | 10 | Chunks after reranking |
| `similarity_threshold` | 0.9 | Post-processing dedup threshold |
| `force_chunk_retriever` | true | Always use chunk retrieval as fallback |
| `num_threads_per_chain` | 1 | Threads per build chain |
| `num_chains` | 16 | Parallel build chains |

---

## 11. KAG v0.8 — New Features (2025)

*Released: 2025-06-27*

### 11.1 Dual Knowledge Base Modes

**Private Knowledge Base Mode:**
- Supports both structured and unstructured data
- Enhanced indexing with built-in fundamental index types
- Full control over data privacy and security

**Public Network Knowledge Base Mode:**
- Integrates public data sources via MCP protocol
- Supports LBS (Location-Based Services)
- WebSearch integration
- Other public data sources via MCP adapters

### 11.2 Built-in Index Types

KAG v0.8 introduces standardized, built-in index types for the Private Knowledge Base:

| Index Type | Description | Use Case |
|---|---|---|
| `Outline` | Document structure outline | Navigation, structure understanding |
| `Summary` | Document/section summaries | Quick overview retrieval |
| `KnowledgeUnit` | Extracted knowledge units (SPO triples) | Precise fact retrieval |
| `AtomicQuery` | Atomic question-answer pairs | FAQ-style retrieval |
| `Chunk` | Raw text chunks with vectors | Semantic similarity search |
| `Table` | Structured table data | Numerical/structured queries |

### 11.3 Knowledge Base / Application Decoupling

- **Knowledge Bases** now manage data independently (structured, unstructured, public)
- **Applications** can associate with **multiple knowledge bases**
- Applications automatically adapt corresponding retrievers based on index types established during KB construction
- Enables modular architecture for complex multi-domain systems

### 11.4 MCP (Model Context Protocol) Integration

- KAG now fully embraces the MCP standard
- KAG-powered inference Q&A is accessible via MCP protocol within agent workflows
- Enables integration with Claude Desktop, Cursor, and other MCP-compatible tools
- See: [Integrate KAG via KAG MCP server](https://openspg.yuque.com/ndx6g9/docs_en/integrate-kag-mcp)

```bash
# Example: Start KAG MCP server
kag mcp-server --port 3000 --kb-id your_knowledge_base_id
```

### 11.5 KAG-Thinker Model Adaptation

KAG v0.8 completes adaptation for the **KAG-Thinker** model (https://github.com/OpenSPG/KAG-Thinker):
- Interactive thinking and deep reasoning model
- Cognitive reasoning paradigm for complex multi-hop problems
- Optimizations in:
  - **Breadth-wise problem decomposition** — explores multiple reasoning paths
  - **Depth-wise solution derivation** — iteratively refines answers
  - **Knowledge boundary determination** — knows when to stop searching
  - **Noise-resistant retrieval** — filters irrelevant results
- Framework's reasoning paradigm stability and logical rigor improved under multi-round iterative thinking

---

## 12. KAG v0.7 — Features (2025)

*Released: 2025-04-17*

### 12.1 Refactored KAG-Solver Framework

- Complete architectural overhaul of the solver
- More rigorous knowledge layering mechanism in the reasoning phase
- Better separation of concerns between planning, reasoning, and retrieval

### 12.2 Task Planning Modes

**Static Planning Mode:**
- Question is decomposed into a fixed plan before execution
- All sub-questions defined upfront
- Faster, predictable, suitable for well-defined query structures

**Iterative Planning Mode:**
- Dynamic, adaptive question decomposition
- Each step re-evaluates based on previous results
- Better for complex, open-ended questions
- Higher accuracy for multi-hop reasoning

### 12.3 Reasoning Modes (UI)

| Mode | Description | Best For |
|---|---|---|
| **Simple Mode** | Fast, direct retrieval + generation | Factual, straightforward questions |
| **Deep Reasoning** | Full logical form solver with multi-hop | Complex, multi-step questions |

### 12.4 Other v0.7 Improvements

- **Streaming inference output** — real-time display of reasoning steps
- **Automatic rendering of graph indexes** — visual KG exploration in UI
- **Content-to-reference linking** — generated answers linked to original source chunks
- **open_benchmark directory** — standardized benchmarks for comparing RAG methods
- **Lightweight Build mode** — reduces knowledge construction token costs by **89%**

---

## 13. SPGReasoner

### 13.1 Overview

**SPGReasoner** is the logical rule reasoning component of OpenSPG. It provides:
- Programmable symbolic representation of logic rules via KGDSL
- Rule inference execution engine
- Neural/symbolic fusion support
- KG2Prompt capabilities (linking LLM with structured KG knowledge)

### 13.2 KGDSL — Knowledge Graph Domain Specific Language

KGDSL abstracts logic rules in a machine-understandable symbolic form. It supports:

```
# Example KGDSL rule: defining risk propagation
DEFINE RULE RiskPropagation:
  MATCH (company:Company)-[:hasShareholder]->(person:Person)
  WHERE person.riskScore > 0.8
  THEN company.derivedRisk = HIGH

# Example: concept hierarchy traversal
DEFINE RULE IsSubsidiaryOf:
  MATCH (a:Company)-[:investedBy*1..3]->(b:Company)
  WHERE relationship.holdingRatio > 0.5
  THEN (a, isSubsidiaryOf, b)
```

### 13.3 Predicate Semantics

SPG defines knowledge through predicate semantics:
- **Synonyms** (`isSynonymOf`) — same concept, different expressions
- **Hypernyms** (`isA`, `belongTo`) — generalization relations
- **Inclusions** (`isPartOf`, `contains`) — part-whole relations
- **Temporal** (`happenedBefore`, `happenedAfter`) — event ordering
- **Causal** (`causes`, `isResultOf`) — cause-and-effect

### 13.4 Downstream Tasks Supported

1. **Rule inference** — pattern matching + rule application
2. **Neural/symbolic fusion learning** — combining ML with symbolic rules
3. **KG2Prompt** — converting KG structures into LLM-friendly prompts for knowledge extraction and reasoning
4. **Complex business scenario analysis** — multi-hop dependency modeling

### 13.5 knext reasoner CLI

```bash
# Execute KGDSL rules on a project
knext reasoner execute --proj_path ./MyProject --file ./reasoner/rules.dsl

# List available reasoner tasks
knext reasoner list

# Check reasoner status
knext reasoner status --task_id <task_id>
```

---

## 14. Examples & Use Cases

### 14.1 Enterprise Supply Chain Knowledge Graph

**Use Case:** Modeling complex supply chain relationships between companies, suppliers, products, and transactions.

**Schema elements:**
- EntityTypes: Company, Supplier, Product, Contract, Person
- Relations: supplies, owns, signsContract, isSubsidiaryOf
- Rules: RiskPropagation, SupplyChainDisruption

**Key capabilities used:**
- Schema-constrained extraction from structured data
- Multi-hop reasoning for supply chain risk analysis
- Event type modeling for disruption events

### 14.2 Risk Mining Knowledge Graph

**Use Case:** Detecting financial fraud, identifying risk networks, and scoring entity risk.

**Schema elements:**
- EntityTypes: Person, Company, BankAccount, Transaction, Device
- ConceptTypes: RiskCategory, FraudPattern
- Rules: MoneyLaunderingPattern, RiskPropagation

**Key capabilities used:**
- Graph traversal for network analysis
- KGDSL rules for pattern detection
- Temporal reasoning for transaction sequences

### 14.3 Medical Knowledge Graph

**Use Case:** Building a comprehensive medical knowledge base for E-Health Q&A.

**Schema elements:**
- EntityTypes: Disease, Symptom, Drug, Treatment, Doctor, Hospital
- ConceptTypes: DiseaseCategory, DrugClass
- Relations: treats, causedBy, symptomOf, contraindicatedWith

**Key capabilities used:**
- Schema-constrained extraction from medical literature
- Concept alignment for medical terminology standardization
- Multi-hop Q&A (e.g., "Which drug treats both condition A and condition B?")

### 14.4 E-Government Q&A (Ant Group Production)

**Deployment:** Internal Ant Group system for answering government service questions.

**Setup:**
- Data: Government affairs documents with standardized structure
- Schema: GovernmentAffair EntityType with properties:
  - administrative_divisions
  - service_procedures
  - required_materials
  - service_locations
  - target_groups

**Example Q&A:**
```
Q: "What materials are needed to apply for housing provident fund in Xihu District?"
A: [directly retrieved from required_materials property of matching GovernmentAffair instance]
```

**Results:** Significantly higher accuracy than traditional RAG in professional domain Q&A.

### 14.5 E-Health Q&A (Ant Group Production)

**Deployment:** Medical Q&A service for disease, symptom, and treatment queries.

**Setup:**
- Data: Medical resources, drug instructions, clinical guidelines
- Schema: Disease, Symptom, Drug, Treatment, Hospital entities
- Domain knowledge injection: Medical terminology and concept trees

**Results:** Significantly higher accuracy than traditional RAG in professional medical Q&A.

### 14.6 Benchmark Datasets

#### 2WikiMultiHopQA
- Multi-hop questions requiring reasoning over Wikipedia-style documents
- Tests cross-document entity linking and multi-hop path following
- Example: "Who directed the film starring [actor] who won [award] in [year]?"

#### MuSiQue (Multi-hop questions via Single-hop questions)
- Compositional multi-hop questions
- Requires combining multiple single-hop facts
- Tests systematic reasoning chains

#### HotpotQA
- Multi-hop Q&A over multiple Wikipedia paragraphs
- Requires finding supporting facts across documents
- Two task types: distractor setting and full wiki setting

---

## 15. Performance & Benchmarks

### 15.1 Multi-hop Q&A Performance (F1 Score)

| Method | HotpotQA | 2WikiMultiHopQA | MuSiQue |
|---|---|---|---|
| Naive RAG | ~45% | ~35% | ~25% |
| HippoRAG | ~55% | ~42% | ~30% |
| GraphRAG | ~52% | ~40% | ~28% |
| **KAG** | **~66%** | **~56%** | **~36%** |
| **Improvement vs SOTA** | **+19.6%** | **+33.5%** | **+12.2%** |

> Note: Absolute values are approximate; the relative improvements over prior SOTA (HippoRAG) are confirmed at +19.6% on HotpotQA and +33.5% on 2wiki in F1.

### 15.2 Retrieval Metrics (Recall@5)

KAG shows significant improvements in retrieval quality across all tested datasets:
- Better entity disambiguation reduces false positives
- Concept graph alignment reduces noise from OpenIE
- Mutual indexing enables more precise graph-based retrieval

### 15.3 Professional Domain Performance

In Ant Group's production deployments:
- **E-Government Q&A:** Significantly higher accuracy vs RAG
- **E-Health Q&A:** Significantly higher accuracy vs RAG
- Both domains require multi-hop reasoning and strict fact accuracy

### 15.4 Build Cost Comparison

| Mode | Token Cost | Speed | Accuracy |
|---|---|---|---|
| Full KAG Build | Baseline | Standard | Highest |
| Lightweight Build (v0.7+) | **-89%** | Faster | Slightly lower |

---

## 16. Differences: KAG vs RAG vs GraphRAG

### 16.1 Detailed Comparison Table

| Aspect | RAG | GraphRAG | KAG |
|---|---|---|---|
| **Knowledge representation** | Text chunks + vectors | Document graph + community summaries | LLMFriSPG (3-layer: KGcs, KGfr, RC) |
| **Entity handling** | None (text-level) | OpenIE (noisy) | Schema-constrained + OpenIE |
| **Retrieval method** | Vector similarity | Community traversal + vector | Logical forms + exact KG + fuzzy + chunk |
| **Reasoning** | LLM-only | LLM-only + graph community | Logical form solver + KG reasoning + LLM |
| **Multi-hop** | Limited | Better | Best |
| **Numerical reasoning** | Weak | Weak | Supported (logical forms) |
| **Temporal reasoning** | Weak | Weak | Supported (KGDSL rules) |
| **Domain knowledge injection** | No | No | Yes (schema + concept trees) |
| **Noise reduction** | None | Limited | Concept semantic alignment |
| **Interpretability** | Low | Medium | High (traceable logical steps) |
| **Setup complexity** | Low | Medium | Medium-High |
| **Best for** | General Q&A | Document exploration | Professional domain Q&A |

### 16.2 When to Use Each

**Use RAG when:**
- General-purpose Q&A without strict accuracy requirements
- Flexible, unstructured documents
- Quick prototype without domain modeling effort
- Open-domain questions with tolerance for hallucination

**Use GraphRAG when:**
- Document exploration and community summarization needed
- No pre-defined schema available
- Medium complexity queries
- Dataset is primarily Wikipedia-like encyclopedic text

**Use KAG when:**
- Professional domains: medicine, law, finance, science, government
- Strict factual accuracy required
- Multi-hop reasoning required
- Domain expert knowledge available for schema definition
- Numerical or temporal reasoning needed
- Interpretability and traceability required

---

## 17. HTTP API Reference

### 17.1 Overview

The OpenSPG server exposes a REST API for programmatic access. Default base URL: `http://127.0.0.1:8887`

### 17.2 Knowledge Base Management

```http
# List all knowledge bases
GET /api/knowledgebase/list

# Create knowledge base
POST /api/knowledgebase/create
Content-Type: application/json
{
  "name": "MyKB",
  "namespace": "MyKB",
  "description": "My knowledge base",
  "config": { ... }
}

# Get knowledge base details
GET /api/knowledgebase/{id}

# Delete knowledge base
DELETE /api/knowledgebase/{id}
```

### 17.3 Build Tasks

```http
# Create build task (upload document)
POST /api/builder/task/create
Content-Type: multipart/form-data
- file: <document file>
- kb_id: <knowledge_base_id>
- config: <json config>

# Get build task status
GET /api/builder/task/{task_id}/status

# List build tasks
GET /api/builder/task/list?kb_id={kb_id}
```

### 17.4 Reasoning Q&A

```http
# Submit Q&A query
POST /api/solver/qa
Content-Type: application/json
{
  "question": "Which Stanford professor works on Alzheimer's?",
  "kb_id": "<knowledge_base_id>",
  "mode": "deep_reasoning"  # or "simple"
}

# Response
{
  "answer": "Thomas C. Sudhof",
  "evidence": [...],
  "trace_log": [...],
  "sub_questions": [...]
}

# Streaming Q&A (SSE)
GET /api/solver/qa/stream?question=...&kb_id=...
```

### 17.5 MCP Server Integration

```bash
# Install KAG MCP server
pip install kag[mcp]

# Start MCP server
kag mcp-server --host 0.0.0.0 --port 3000

# MCP tool configuration (for Claude Desktop)
{
  "mcpServers": {
    "kag": {
      "command": "kag",
      "args": ["mcp-server"],
      "env": {
        "KAG_SERVER_URL": "http://127.0.0.1:8887",
        "KAG_KB_ID": "your_kb_id"
      }
    }
  }
}
```

---

## 18. Release History

| Version | Release Date | Highlights |
|---|---|---|
| **v0.8.0** | 2025-06-27 | Dual KB modes, built-in index types, MCP integration, KB/app decoupling, KAG-Thinker |
| **v0.7.0** | 2025-04-17 | Refactored solver, static/iterative planning, Simple/Deep modes, streaming, Lightweight Build (-89% tokens) |
| **v0.1.0** | 2025-01-07 | Domain knowledge injection, schema customization, QFS tasks, visual query analysis, schema-constraint extraction |
| **v0.0.2** | 2024-11-21 | Word doc upload, model invoke concurrency, UX optimizations |
| **v0.0.1** | 2024-10-25 | **Initial public release** |

### 18.1 Upgrade Guide: v0.7 → v0.8

Key breaking changes:
- Knowledge base and application are now separate concepts — migration required for existing projects
- New index types must be explicitly configured during KB construction
- MCP server is a new optional dependency (`pip install kag[mcp]`)

For detailed upgrade instructions, see: https://openspg.yuque.com/ndx6g9/docs_en/upgraded-from-v07-to-v08

---

## 19. Design Philosophy

### 19.1 Knowledge-Driven AI

OpenSPG and KAG are built on the philosophy that:
1. **Structured knowledge is essential** for reliable AI in professional domains
2. **Symbolic reasoning** complements neural (LLM) reasoning
3. **Bidirectional enhancement** between LLMs and KGs leads to better outcomes than either alone

### 19.2 Five Key Design Principles

1. **LLM-Friendly Knowledge Representation** (LLMFriSPG)
   - Knowledge should be structured in a way that LLMs can understand and use effectively
   - Text context must be preserved alongside structured knowledge

2. **Mutual Indexing** between KG and text chunks
   - Structured knowledge and raw text are complementary, not alternatives
   - The graph structure serves as an inverted index for text retrieval

3. **Logical-Form-Guided Hybrid Reasoning**
   - LLM reasoning alone is insufficient for complex multi-hop and numerical tasks
   - Logical forms bridge natural language and symbolic execution

4. **Knowledge Alignment via Semantic Reasoning**
   - Raw extraction (OpenIE) produces noise — concept graphs provide normalization
   - Semantic alignment happens in both offline (build) and online (query) phases

5. **Model Capability Enhancement for KAG**
   - General LLMs need domain adaptation for KAG-specific tasks
   - Fine-tuning for NLU, NLI, and NLG improves performance significantly

### 19.3 SPG White Paper

For a detailed introduction to the SPG framework and its design philosophy, refer to the **SPG White Paper** jointly released by Ant Group and OpenKG:
- URL: https://openspg.github.io/v2/blog/design_philosophy/white_paper/openspg
- Topics: SPG semantics, knowledge levels, business application patterns

---

## 20. Contributing & Community

### 20.1 How to Contribute

1. **Fork the repository**: https://github.com/OpenSPG/KAG
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Follow coding standards** (PEP 8 for Python)
4. **Write tests** for new functionality
5. **Submit a Pull Request** with detailed description
6. **Review guidelines**: https://openspg.yuque.com/ndx6g9/docs_en/contribution-guidelines

### 20.2 Repository Structure

```
KAG/
├── kag/
│   ├── builder/          # KAG-Builder components
│   │   ├── component/    # Readers, splitters, extractors, writers
│   │   ├── prompt/       # LLM prompts for extraction
│   │   └── runner.py     # Builder chain runner
│   ├── solver/           # KAG-Solver components
│   │   ├── plan/         # LF planners
│   │   ├── execute/      # LF executors
│   │   ├── retriever/    # Exact, fuzzy, chunk retrievers
│   │   └── implementation/ # Reasoner, memory, generator
│   ├── examples/         # Built-in examples (2wiki, hotpot, musique, etc.)
│   ├── common/           # Shared utilities, config, registry
│   └── schema/           # Schema management tools
├── open_benchmark/       # Standardized benchmark comparisons
├── dev/                  # Docker, deployment scripts
└── _static/              # Documentation images
```

### 20.3 Community Channels

| Channel | Link |
|---|---|
| **GitHub (KAG)** | https://github.com/OpenSPG/KAG |
| **GitHub (OpenSPG)** | https://github.com/OpenSPG/openspg |
| **Discord** | https://discord.gg/PURG77zhQ7 |
| **WeChat Official Account** | OpenSPG (scan QR code on GitHub) |
| **Discussions** | https://github.com/orgs/OpenSPG/discussions |
| **User Guide** | https://openspg.yuque.com/ndx6g9/docs_en |

### 20.4 License

**Apache License 2.0** — Open source, free for commercial and non-commercial use.

---

## 21. Citation & References

### 21.1 Primary Research Paper

**KAG: Boosting LLMs in Professional Domains via Knowledge Augmented Generation**
- Authors: Lei Liang, Mengshu Sun, Zhengke Gui, Zhongshu Zhu, Zhouyu Jiang, Ling Zhong, Peilong Zhao, Zhongpu Bo, Jin Yang, Huaidong Xiong, Lin Yuan, Jun Xu, Zaoyang Wang, Zhiqiang Zhang, Wen Zhang, Huajun Chen, Wenguang Chen, Jun Zhou
- Institutions: Ant Group Knowledge Graph Team, Zhejiang University
- ArXiv: https://arxiv.org/abs/2409.13731
- Date: September 26, 2024

### 21.2 Secondary Paper

**KGFabric: A Scalable Knowledge Graph Warehouse for Enterprise Data Interconnection**
- Authors: Yi, Peng; Liang, Lei; Da Zhang; Yong Chen; Zhu, Jinye; Liu, Xiangyu; Tang, Kun; Chen, Jialin; Lin, Hao; Qiu, Leijie; Zhou, Jun

### 21.3 BibTeX Entries

```bibtex
@article{liang2024kag,
  title={KAG: Boosting LLMs in Professional Domains via Knowledge Augmented Generation},
  author={Liang, Lei and Sun, Mengshu and Gui, Zhengke and Zhu, Zhongshu and Jiang, Zhouyu
          and Zhong, Ling and Zhao, Peilong and Bo, Zhongpu and Yang, Jin and others},
  journal={arXiv preprint arXiv:2409.13731},
  year={2024}
}

@article{yikgfabric,
  title={KGFabric: A Scalable Knowledge Graph Warehouse for Enterprise Data Interconnection},
  author={Yi, Peng and Liang, Lei and Da Zhang and Yong Chen and Zhu, Jinye and Liu, Xiangyu
          and Tang, Kun and Chen, Jialin and Lin, Hao and Qiu, Leijie and Zhou, Jun}
}
```

### 21.4 Core Team

| Name | Role |
|---|---|
| Lei Liang | Principal Researcher, KAG Architecture |
| Mengshu Sun | Knowledge Representation |
| Zhengke Gui | KAG-Builder |
| Zhongshu Zhu | KAG-Solver |
| Zhouyu Jiang | KAG-Solver |
| Ling Zhong | Evaluation |
| Peilong Zhao | Knowledge Alignment |
| Zhongpu Bo | Knowledge Representation |
| Jin Yang | Engineering |
| Huaidong Xiong | Engineering |
| Lin Yuan | Engineering |
| Jun Xu | Engineering |
| Zaoyang Wang | Engineering |
| Zhiqiang Zhang | Graph Storage |
| Wen Zhang | Zhejiang University |
| Huajun Chen | Zhejiang University |
| Wenguang Chen | Engineering Lead |
| Jun Zhou | Principal Investigator (Corresponding Author) |
| Haofen Wang | Academic Advisor |

---

## 22. FAQ

### 22.1 Installation & Setup

**Q: Docker is required — can I run KAG without Docker?**
A: The OpenSPG server (which provides Neo4j, metadata management, and graph storage) is distributed as a Docker container. The KAG Python package can be installed separately (`pip install -e .`), but the server components require Docker. For minimal setups, you can point to an existing Neo4j instance.

**Q: Which Python version is required?**
A: Python 3.10 is recommended. Python 3.8.10 or later is supported on Windows.

**Q: Can I use KAG with a local (offline) LLM?**
A: Yes. KAG supports vLLM and Ollama as local LLM backends. Example configuration:
```yaml
chat_llm:
  type: vllm
  base_url: http://localhost:8000/v1
  model: llama3-70b
  api_key: EMPTY
```

**Q: What is the minimum hardware requirement?**
A: 8GB+ RAM recommended for basic operation. For GPU-accelerated local models: 16GB+ VRAM recommended. Production deployments typically use 32GB+ RAM.

### 22.2 Knowledge Building

**Q: What document formats are supported?**
A: TXT, PDF, Word (.docx), JSON. CSV and structured data formats are also supported via the `StructuredBuilderChain`.

**Q: How do I handle very large document collections?**
A: Use `num_chains: 16` (or higher) in the builder configuration for parallel processing. The checkpoint system automatically handles resumption after interruptions.

**Q: What should I do when the build task fails?**
A: Check the checkpoint file at `./builder/ckpt/kag_checkpoint_0_1.ckpt`. KAG supports checkpoint-based resumption — simply re-run `indexer.py` and it will continue from where it stopped.

**Q: Can I mix structured and unstructured data in the same knowledge base?**
A: Yes. KAG v0.8 explicitly supports this in Private Knowledge Base mode. Use different builder chains for different data types pointing to the same project namespace.

### 22.3 Reasoning & Q&A

**Q: Why is the answer quality poor for my domain?**
A: Consider:
1. **Define a domain schema** — schema-constrained extraction is much more accurate than pure OpenIE for professional domains
2. **Inject domain concepts** — add a concept tree with domain terminology
3. **Customize prompts** — modify NER, standardization, and triple extraction prompts for your domain
4. **Use Deep Reasoning mode** — for complex questions

**Q: How do I enable multi-hop reasoning?**
A: Multi-hop reasoning is enabled by default in the KAG-Solver. Use the `default_reasoner` with `max_iterations: 3` or higher. In the UI, select "Deep Reasoning" mode.

**Q: What is the difference between exact_kg_retriever and fuzzy_kg_retriever?**

| Retriever | Method | Use Case |
|---|---|---|
| `exact_kg_retriever` | Precise entity lookup via entity linking | Known entity names, exact facts |
| `fuzzy_kg_retriever` | Vector similarity on graph nodes | Approximate matches, synonyms |
| `chunk_retriever` | Vector similarity on text chunks | Contextual text retrieval |

**Q: Can I integrate KAG into an existing LangChain or LlamaIndex pipeline?**
A: Yes, via the HTTP API or the KAG MCP server. Direct Python integration is also possible by importing KAG modules. Native LangChain and LlamaIndex adapters are planned for future releases.

### 22.4 Performance & Scaling

**Q: How do I reduce knowledge construction costs?**
A: Use the **Lightweight Build mode** (introduced in v0.7) which reduces token costs by 89% with minimal accuracy loss:
```yaml
kag_builder_pipeline:
  chain:
    type: lightweight_builder_chain
```

**Q: How do I scale KAG for production?**
A: 
1. Use a production Neo4j cluster instead of the embedded instance
2. Use Milvus for vector storage
3. Scale `num_chains` in the builder pipeline
4. Use cloud LLM APIs (DeepSeek, OpenAI) with concurrent call settings
5. Deploy OpenSPG server with load balancing

**Q: Can the embedding model be changed after building the knowledge base?**
A: **No.** The embedding model is fixed at knowledge base creation. Vectors from different models cannot be mixed. To change the model, create a new knowledge base and rebuild.

---

*Document generated: 2026-04-06*
*Sources: https://openspg.yuque.com/ndx6g9/docs_en | https://github.com/OpenSPG/KAG | https://arxiv.org/abs/2409.13731*
*Knowledge base optimized for LLM retrieval and reasoning.*