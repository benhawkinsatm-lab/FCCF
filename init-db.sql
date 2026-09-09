-- Family Court Case Intelligence System (FCWA 4344/2023)
-- PostgreSQL Initialization & Schema Definition for Self-Hosted Docker Compose Setup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Master Case Store Table (Stores full structured JSONB with audit versioning)
CREATE TABLE IF NOT EXISTS case_records (
    id VARCHAR(100) PRIMARY KEY,
    case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
    version VARCHAR(20) NOT NULL DEFAULT '2.0.0',
    storage_type VARCHAR(50) NOT NULL DEFAULT 'postgresql',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Individual Normalized Tables for Relational Queries & High Performance Auditing

CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(100) PRIMARY KEY,
    case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
    title TEXT NOT NULL,
    date DATE,
    type VARCHAR(100),
    file_name TEXT,
    file_size VARCHAR(50),
    summary TEXT,
    content TEXT,
    key_quotes JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    admissibility VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id VARCHAR(100) PRIMARY KEY,
    case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
    date DATE NOT NULL,
    time VARCHAR(20),
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    severity VARCHAR(50),
    evidence_ids JSONB DEFAULT '[]'::jsonb,
    disputed BOOLEAN DEFAULT FALSE,
    dispute_details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parenting_orders (
    id VARCHAR(100) PRIMARY KEY,
    case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
    order_number VARCHAR(50),
    date DATE,
    category VARCHAR(100),
    text TEXT NOT NULL,
    compliance_status VARCHAR(50),
    breach_count INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discrepancies (
    id VARCHAR(100) PRIMARY KEY,
    case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    severity VARCHAR(50),
    document_a_id VARCHAR(100),
    quote_a TEXT,
    document_b_id VARCHAR(100),
    quote_b TEXT,
    impact_analysis TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id VARCHAR(100) PRIMARY KEY,
    case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    priority VARCHAR(50),
    status VARCHAR(50),
    action_required TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communication_messages (
    id VARCHAR(100) PRIMARY KEY,
    case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
    timestamp TIMESTAMPTZ,
    sender VARCHAR(100),
    recipient VARCHAR(100),
    medium VARCHAR(50),
    summary TEXT,
    content TEXT,
    tone VARCHAR(50),
    legal_relevance TEXT,
    is_breach_allegation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS response_requirements (
    id VARCHAR(100) PRIMARY KEY,
    case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
    trigger_event TEXT,
    deadline TIMESTAMPTZ,
    status VARCHAR(50),
    response_sent_date TIMESTAMPTZ,
    notes TEXT,
    compliance_rating VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS party_profiles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    role VARCHAR(100),
    relationship VARCHAR(100),
    background TEXT,
    contact_info JSONB,
    behavioral_patterns JSONB,
    credibility_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issues_concerns (
    id VARCHAR(100) PRIMARY KEY,
    category VARCHAR(100),
    description TEXT,
    severity VARCHAR(50),
    status VARCHAR(50),
    evidence_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS court_criteria (
    id VARCHAR(100) PRIMARY KEY,
    section_code VARCHAR(50),
    title TEXT NOT NULL,
    court_consideration TEXT,
    father_position TEXT,
    mother_position TEXT,
    evidence_summary TEXT,
    weight VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proposed_orders (
    id VARCHAR(100) PRIMARY KEY,
    order_type VARCHAR(100),
    title TEXT NOT NULL,
    terms TEXT NOT NULL,
    rationale TEXT,
    best_interests_link TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Snapshot and Disaster Recovery Table
CREATE TABLE IF NOT EXISTS database_snapshots (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    label VARCHAR(100) DEFAULT 'snapshot',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    store_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_case_records_case_number ON case_records(case_number);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(date);
CREATE INDEX IF NOT EXISTS idx_orders_category ON parenting_orders(category);
CREATE INDEX IF NOT EXISTS idx_comm_timestamp ON communication_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON database_snapshots(created_at DESC);
