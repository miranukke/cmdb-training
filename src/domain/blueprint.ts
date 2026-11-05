import type { DomainKey, Question } from './types';

/** CIS-DF exam blueprint (KB0012913, updated Nov 2025): 75 questions, 90 minutes. */
export const EXAM_QUESTION_COUNT = 75;
export const EXAM_DURATION_MIN = 90;
/** The real cut score isn't published; 70% is the commonly used target. */
export const PASS_MARK = 70;

export interface DomainInfo {
  key: DomainKey;
  label: string;
  short: string;
  weight: number;
  blurb: string;
}

export const DOMAINS: readonly DomainInfo[] = [
  { key: 'configuration', label: 'Configuration', short: 'Config', weight: 15, blurb: 'CI Class Manager, IRE, CMDB 360' },
  { key: 'ingest', label: 'Ingest', short: 'Ingest', weight: 19, blurb: 'Discovery, SGC, IH ETL, import sets, Asset–CI' },
  { key: 'govern', label: 'Govern', short: 'Govern', weight: 35, blurb: 'Health, Data Manager, de-dup, workspace, life cycle' },
  { key: 'insight', label: 'Insight', short: 'Insight', weight: 20, blurb: 'Query Builder, Unified Map, dashboards, playbooks' },
  { key: 'csdm', label: 'CSDM Fundamentals', short: 'CSDM', weight: 11, blurb: 'Domains, stages, services, information objects' },
];

export const DOMAIN_BY_KEY: Record<DomainKey, DomainInfo> = Object.fromEntries(
  DOMAINS.map((d) => [d.key, d]),
) as Record<DomainKey, DomainInfo>;

export function isDomainKey(value: unknown): value is DomainKey {
  return typeof value === 'string' && value in DOMAIN_BY_KEY;
}

type Rule = readonly [DomainKey, RegExp];

/**
 * Keyword rules mapping a question to a blueprint domain. Within a tier the first match wins,
 * so the most specific signals come first.
 */
const STRONG_RULES: readonly Rule[] = [
  // "Which CSDM stage…" is a CSDM question even when it talks about groups or offerings.
  ['csdm', /what (csdm )?stage|which (csdm )?stage|stage of csdm|csdm stage/],
  // Govern signals that would otherwise be caught by broader Insight/CSDM wording.
  [
    'govern',
    /principal class|duplicate ci remediator|de-?duplication task|cmdb data manager|data manager polic|life ?cycle (field )?mapping|life cycle stage|legacy (cmdb )?status|life cycle sync/,
  ],
  // Insight: querying, maps, dashboards/playbooks and outcomes in other products.
  [
    'insight',
    /query builder|cmdb query|unified map|natural language|\bnlq\b|intelligent search|saved quer|data foundations? dashboard|playbook|dependency view|relationship map|how cis are connected|connected to each other|change management process|benefit[^.?]*change management|as part of change management|incident management|incident form|change (request )?form|event management|security operations|business values? of|value of (using )?the cmdb|aligned to business process/,
  ],
  // Ingest: populating non-discoverable group data (the course's "Populate foundation group data").
  [
    'ingest',
    /(support|change|managed by) groups?\b[^.?]*(synchroni|populat|maintain)|group data|groups? (are|is) (automatically )?(synced|synchronized)|which group values/,
  ],
  // CSDM: model, domains, stages, service/application concepts.
  [
    'csdm',
    /\bcsdm\b|crawl|\bwalk\b|\bfly\b|information object|business capabilit|business application|service offering|business service|technology management|technical service|platform host|(design (and|&) planning|service consumption|service delivery|build (and|&) integrat|ideation|foundation) (\(.*?\) )?domain|sell\/consume/,
  ],
  // Govern: health, Data Manager, duplicates, workspace, life cycle, governance.
  [
    'govern',
    /data manager|attestation|certification|de-?duplication|health inclusion|health dashboard|health preference|staleness|\bstale\b|orphan|completeness|correctness|compliance|\bretir|archiv|delete polic|life ?cycle|cmdb workspace|governance/,
  ],
  // Configuration rules that mention ingestion sources (SCCM, Discovery) but test IRE config.
  ['configuration', /reconciliation rule|dynamic reconciliation|identification rule|cmdb 360|multisource|reclassif|data refresh/],
  // Ingest: ingestion tools.
  [
    'ingest',
    /service graph connector|\bsgc\b|integrationhub|integration hub|\betl\b|import set|import (external )?data|transform (map|script)|cmdbtransformutil|agent client collector|discovery|service mapping|third-party|\bsccm\b|non-discoverable|asset|warranty|automatic(ally)? (create )?relationships|create relationships|ingest/,
  ],
  // Configuration: class model and IRE.
  [
    'configuration',
    /class manager|ci class|identification|reconciliation|\bire\b|class (upgrade|switch|downgrade)|custom (cmdb )?(class|table)|u_cmdb_ci|attribute|relationship between an application/,
  ],
];

const WEAK_RULES: readonly Rule[] = [
  ['govern', /duplicate|health|configuration manager|\broles?\b|audit|data quality|operationaliz|\btasks?\b/],
  ['csdm', /\bdomains?\b|\bstages?\b|\bservices?\b/],
  ['insight', /report|\bmaps?\b|dashboard|value/],
];

function firstMatch(rules: readonly Rule[], text: string): DomainKey | null {
  for (const [domain, re] of rules) if (re.test(text)) return domain;
  return null;
}

export function classifyQuestion(q: Question): DomainKey | null {
  const stem = [q.question, ...(q.tags ?? [])].join(' ').toLowerCase();
  const answers = [
    ...(q.choices ?? []).map((c) => c.text),
    ...(q.items ?? []).map((i) => i.text),
    ...(q.targets ?? []).map((t) => t.label),
  ]
    .join(' \n ')
    .toLowerCase();
  const all = `${stem} \n ${answers}`;
  // Strong signals beat weak ones; within a tier the stem beats the answer options.
  return firstMatch(STRONG_RULES, stem) ?? firstMatch(STRONG_RULES, all) ?? firstMatch(WEAK_RULES, stem) ?? firstMatch(WEAK_RULES, all);
}

const cache = new WeakMap<Question, DomainKey | null>();

/** Explicit `domain` field wins; otherwise the keyword classifier (memoized per question object). */
export function domainOf(q: Question): DomainKey | null {
  if (isDomainKey(q.domain)) return q.domain;
  if (!cache.has(q)) cache.set(q, classifyQuestion(q));
  return cache.get(q) ?? null;
}
