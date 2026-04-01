/* ══════════════════════════════════════════
   ARCHIVE.PS — FORENSIC CONTENT DATABASE
   data.js
════════════════════════════════════════════ */

const FORENSIC_DATA = {
  siege: {
    lines: ['> ACCESSING COGAT SERVER...', '> LOG_ID: BLOCKADE_MANIFEST_v4', '> [DATA]: BREAD_FLOUR_QUOTA: 2,210 TONS/WEEK', '> [DATA]: STATUS: BELOW_SUBSISTENCE_THRESHOLD', '> WARNING: HUMANITARIAN_LIMIT_REACHED'],
    color: 'var(--red)'
  },
  maps: {
    lines: ['> PINGING GEOSPATIAL NODE...', '> COORDS: 31°30\'25.8"N 34°28\'10.5"E', '> SITE: OUTPOST_VULCAN_EXPANSION', '> [!] ALERT: BUFFER_ZONE_INCREMENT +240m', '> ANALYSIS: ILLEGAL_STRUCTURE_CONFIRMED'],
    color: 'var(--green-light)'
  },
  media: {
    lines: ['> INTERCEPTING ISP PACKETS...', '> [LOG]: SIGNAL_SEVERANCE_AT_0400_UTC', '> [LOG]: JAMMING_FREQ: 433MHz ACTIVE', '> SOURCE: ELECTRONIC_WARFARE_UNIT_8200'],
    color: 'var(--amber)'
  },
  arms: {
    lines: ['> SCANNING AIR_TRAFFIC_LOGS...', '> FLIGHT: C-17_GLOBEMASTER_III', '> CARGO: GBU-31_GUIDANCE_KITS', '> TOTAL_TONNAGE: 44.2t', '> [!] COMPLICITY_INDEX: HIGH'],
    color: 'var(--red)'
  },
  un: {
    lines: ['> ARCHIVE_QUERY: RES_ES-10/24', '> RESOLUTION: ENFORCEMENT_MANDATORY', '> [!] COMPLIANCE_STATUS: ZERO', '> ACTION: REFERRAL_TO_ICC_PROSECUTOR'],
    color: 'var(--green-light)'
  },
  medical: {
    lines: ['> SCANNING HOSPITAL POWER LOGS...', '> NODE: AL-SHIFA_GEN_01', '> [!] STATUS: TOTAL_INFRASTRUCTURE_COLLAPSE', '> [DATA]: OXYGEN_RESERVES: 0.04%', '> CAUSE: TARGETED_FUEL_BLOCKADE'],
    color: 'var(--red)'
  },
  culture: {
    lines: ['> RETRIEVING ARCHIVE TELEMETRY...', '> NODE: GAZA_CENTRAL_ARCHIVE', '> [!] ALERT: THERMAL_DESTRUCTION_DETECTED', '> DATA_LOSS: 150_YEARS_HISTORY', '> STATUS: IRREVERSIBLE_SCHOLASTICIDE'],
    color: 'var(--amber)'
  },
  detention: {
    lines: ['> ACCESSING PRISON_SERVICE_DB...', '> FACILITY: SDE_TEIMAN', '> [DATA]: CAPACITY_OVERAGE: 400%', '> [!] WARNING: SYSTEMIC_UNCAT_VIOLATIONS', '> STATUS: UNCONSTITUTIONAL_HOLDING_ZONE'],
    color: 'var(--red)'
  },
  icc: {
    lines: ['> ICC_DOCKET_QUERY: 01/18', '> STATUS: WARRANT_APPLICATIONS_FILED', '> SIGNATORY_VERIFICATION: 124_NATIONS', '> [!] NOTICE: REASONABLE_GROUNDS_CONFIRMED', '> ACTION: AWAITING_JUDICIAL_CHAMBER_ISSUE'],
    color: 'var(--green-light)'
  },
  hr: {
    lines: ['> VERIFYING REPORT_HASHES...', '> ENTITY: AMNESTY_INT_2022', '> [DATA]: APARTHEID_FINDINGS_VERIFIED', '> STATUS: PERMANENT_EVIDENTIARY_RECORD'],
    color: 'var(--green-light)'
  },
  infrastructure: {
    lines: ['> SCANNING SAT_LAYER_CIV_01', '> NODE: WATER_GRID_GAZA', '> [!] ALERT: SEWAGE_PUMP_STATION_DECIMATED', '> STATUS: MANUFACTURED_EPIDEMIOLOGICAL_RISK'],
    color: 'var(--amber)'
  },
  surveillance: {
    lines: ['> INTERCEPTING BIOMETRIC PACKETS...', '> NODE: BLUE_WOLF_HUB_C', '> [DATA]: FACIAL_RECOGNITION_CONFIDENCE: 98%', '> [!] ALERT: UNAUTHORIZED_MALWARE_TRACE_v7'],
    color: 'var(--amber)'
  },
  movement: {
    lines: ['> ACCESSING COGAT PERMIT_DB...', '> QUERY: EXIT_REQUEST_LOGS', '> [DATA]: 12,400_REQUESTS_PENDING', '> [!] STATUS: INDEFINITE_BUREAUCRATIC_STALL'],
    color: 'var(--muted)'
  },
  compliance: {
    lines: ['> MONITORING STATE_EXPORT_LOGS...', '> NODE: HAGUE_TRANSCRIPT_REF_99', '> [DATA]: EXPORT_LICENSE_REVOKED: F-35_COMPONENTS', '> STATUS: LEGAL_COMPLIANCE_ESTABLISHED'],
    color: 'var(--green-light)'
  },
  testimonies: {
    lines: ['> DECRYPTING AFFIDAVIT_BATCH_14...', '> NGO_VERIFY: WITNESS_HASH_CONFIRMED', '> [DATA]: CROSS_REFERENCE: ICJ_EXHIBIT_C', '> STATUS: ADMITTED_INTO_EVIDENCE'],
    color: 'var(--amber)'
  },
  geneva: {
    lines: ['> PARSING IHL_TREATY_DB...', '> ARTICLE: IV_GENEVA_PROTOCOL_49', '> [!] BREACH_COUNT: 217_VERIFIED_INSTANCES', '> STATUS: REFERRAL_LOGGED'],
    color: 'var(--red)'
  },
  nakba: {
    lines: ['> LOADING HISTORICAL_RECORD_DB...', '> YEAR_RANGE: 1947-1949', '> [DATA]: VILLAGES_DEPOPULATED: 531', '> [DATA]: DISPLACED_PERSONS: 700,000+', '> STATUS: PERMANENT_ARCHIVAL_RECORD'],
    color: 'var(--amber)'
  },
  registry: {
    lines: ['> SCANNING ARCHIVE_NODE_REGISTRY...', '> TOTAL_DOCUMENTS: 1,402,880', '> [DATA]: DECLASSIFIED_BATCH: 98,221', '> STATUS: SYNC_OPERATIONAL'],
    color: 'var(--green-light)'
  },
  british: {
    lines: ['> ACCESSING IMPERIAL_ARCHIVES...', '> CLASSIFICATION: MANDATE_ERA', '> [DATA]: BALFOUR_DECLARATION_1917', '> STATUS: HISTORICAL_ORIGIN_NODE_UNLOCKED'],
    color: 'var(--amber)'
  },
  census: {
    lines: ['> QUERYING 1948_DEMOGRAPHIC_LEDGER...', '> VILLAGES_SCANNED: 531', '> [!] ALERT: MASS_DEPOPULATION_VERIFIED', '> STATUS: ARCHIVAL_EVIDENCE_SECURED'],
    color: 'var(--amber)'
  },
  legal: {
    lines: ['> ESTABLISHING JURISDICTION...', '> PROTOCOL: UNIVERSAL_JURISDICTION_ACTIVE', '> GPG_KEY_VERIFICATION: SUCCESS', '> STATUS: SECURE_TUNNEL_ESTABLISHED'],
    color: 'var(--green-light)'
  }
};

const EXHIBIT_DATA = {
  'A.12': ['> SCANNING SAT_LAYER_012', '> SECTOR: NORTH_GAZA', '> FINDING: RESIDENTIAL_DEMOLITION_88%', '> TIMESTAMP: NOV_2023_ANALYSIS'],
  'B.04': ['> BALLISTIC_SCAN_NODE_4', '> FRAGMENT_MATCH: GBU-31_MK84', '> ORIGIN: BOEING_DEFENSE_US', '> IMPACT_STATUS: CIVILIAN_CENTER'],
  'C.88': ['> PARSING DIRECTIVE_ALPHA', '> CLASSIFICATION: TOP_SECRET_REDACTED', '> KEYWORD_HIT: STARVATION_TACTIC', '> ORIGIN: CABINET_LEVEL_MEMO'],
  'D.01': ['> GEOLOCATING DEPLOYMENT_CAMP', '> CROSS_REF: HUMAN_RIGHTS_WATCH', '> FINDING: BEYOND_DECLARED_ZONE', '> STATUS: UNDISCLOSED_FACILITY'],
  'E.33': ['> SPECTROGRAPHIC_ANALYSIS', '> WHITE_PHOSPHORUS: CONFIRMED', '> GENEVA_ART_51_BREACH: CONFIRMED', '> ORIGIN: MK77_INCENDIARY_CANISTER'],
  'F.19': ['> HYDRAULIC_INFRASTRUCTURE_SCAN', '> WATER_LINES_SEVERED: 14', '> REPAIR_BLOCKED_BY: PERMIT_DENIAL', '> POPULATION_AFFECTED: 140,000'],
  'G.02': ['> PARSING_FIELD_LOG_NODE_7', '> SUBJECT: BORDER_PERIMETER_PROTOCOL', '> RULE_OF_ENGAGEMENT_MATCH: THRESHOLD_0m', '> STATUS: SHOOT_TO_KILL_UNARMED'],
  'H.99': ['> DECRYPTING_COMMS_ARCHIVE', '> CLASSIFICATION: EYES_ONLY', '> [!] WARNING: SOURCE_SENSITIVE', '> PARTIAL DATA: COMMAND_CHAIN_EXPOSED']
};

// Unsplash image collections for real images (using public Unsplash source)
// Note: These use the Unsplash Source API (free, no key required)
const REAL_IMAGES = {
  hero: 'https://theintercept.com/wp-content/uploads/2019/01/GettyImages-1077343584-1547140810-e1547141434550.jpg?fit=5000%2C2500?w=1400&q=80&fit=crop', // Middle East landscape
  balfour: 'https://images.unsplash.com/photo-1569937756447-121bb8e7a083?w=400&q=80&fit=crop', // Archive/document
  timeline1: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80&fit=crop', // Historical scene
  timeline2: 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=400&q=80&fit=crop', // Landscape
  satellite: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&q=80&fit=crop', // Satellite/aerial
  documents: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop', // Old documents
  humanitarian: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80&fit=crop', // Humanitarian
  protest: 'https://www.crisisgroup.org/sites/default/files/gaza-briefing-16nov18.jpg', // Protest/gathering
  ruins: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80&fit=crop', // Ruins / destruction
  press: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80&fit=crop', // Press/media
  hospital: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&q=80&fit=crop', // Medical
  university: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&fit=crop', // University
  map1: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80&fit=crop', // Aerial map
  checkpoint: 'https://images.unsplash.com/photo-1519677584237-752f8853252e?w=400&q=80&fit=crop', // Security/border
  blockade: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80&fit=crop', // Port/blockade
  icj: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80&fit=crop', // Court/legal
};
