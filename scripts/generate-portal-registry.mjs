import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'top.html'), 'utf8');

const SECTIONS = {
  'portal-calc': ['card-cp-calc', 'card-dzp-calc', 'card-crcl-psych', 'card-acute-alerts'],
  'portal-scales': [
    'card-schiz-sheets', 'card-anxiety-scales', 'card-phq9-print',
    'card-bprs-detailed', 'card-panss-detailed', 'card-bfcrs', 'card-ymrs', 'card-hamd', 'card-madrs', 'card-phq9',
    'card-schiz-scales', 'card-bprs-guide',
  ],
  'portal-diag': ['card-icd10', 'card-icd11', 'card-icd10mini', 'card-dsm5tr', 'card-dsm5trmini'],
  'portal-tx-overview': [
    'card-schiz-algo', 'card-depression', 'card-bipolar', 'card-delirium', 'card-anxiety',
    'card-schiz-diagnosis', 'card-schiz-early-intervention', 'card-atypical-depression',
    'card-nonpharmacologic', 'card-schiz-psychoedu',
  ],
  'portal-drugs': [
    'card-antipsychotics', 'card-benzodiazepines', 'card-antidepressants', 'card-mood-stabilizers',
    'card-hypnotics', 'card-venlafaxine', 'card-olanzapine', 'card-quetiapine', 'card-brexpiprazole', 'card-vortioxetine',
  ],
  'portal-concepts': [
    'card-schiz-history', 'card-cssrs-memo', 'card-csc-jp', 'card-terminology', 'card-shiteii',
    'card-shitei-overview', 'card-shitei-checklist', 'card-shitei-workspace', 'card-teaching-workspace',
    'card-shitei-wizard', 'card-shitei-case-template', 'card-schiz-highschool',
  ],
  'portal-study': [
    'card-terminology-srs', 'card-icd10-quiz', 'card-mood-suicide-learning', 'card-schiz-fe-learning',
    'card-psychopath-scales-learning', 'card-psychotropics-interactions-learning', 'card-asd-schizophrenia-learning',
    'card-eeg-learning', 'card-eeg-basics', 'card-eeg-waveforms', 'card-eeg-quiz', 'card-eeg-cases',
  ],
  'portal-other': ['card-context', 'card-cursor', 'card-content-verification'],
  'portal-literature': ['card-literature-search'],
};

const SECTION_LABELS = {
  'portal-calc': '計算ツール',
  'portal-scales': '評価スケール',
  'portal-diag': '診断・分類',
  'portal-tx-overview': '治療概要',
  'portal-drugs': '薬剤選択',
  'portal-concepts': '概念・資格',
  'portal-study': '学習・ドリル',
  'portal-other': 'その他',
  'portal-literature': '最新論文',
};

const CASE_REPORT_SECTIONS = new Set([
  'portal-scales', 'portal-diag', 'portal-tx-overview', 'portal-drugs', 'portal-concepts',
]);

const TEACHING_EXCLUDE_IDS = new Set([
  'card-shitei-workspace', 'card-shitei-wizard', 'card-shitei-checklist',
  'card-shitei-case-template', 'card-shitei-overview', 'card-shitei-app',
  'card-shiteii', 'card-seishin-hoken-ho-flow',
]);

const cardIdToSection = {};
for (const [sec, ids] of Object.entries(SECTIONS)) {
  for (const id of ids) cardIdToSection[id] = sec;
}
for (const id of ['card-seishin-hoken-ho-flow', 'card-shitei-app']) {
  cardIdToSection[id] = 'portal-concepts';
}

const allIds = [...new Set([...Object.values(SECTIONS).flat(), 'card-seishin-hoken-ho-flow', 'card-shitei-app'])];
const tools = [];

for (const id of allIds) {
  const anchorRe = new RegExp(`<a\\s+id="${id}"\\s+href="([^"]+)"`, 'i');
  const am = html.match(anchorRe);
  if (!am) {
    console.error('missing anchor:', id);
    continue;
  }
  const start = html.indexOf(am[0]);
  const chunk = html.slice(start, start + 2500);
  const titleM = chunk.match(/<h3[^>]*>([^<]+)<\/h3>/i);
  if (!titleM) {
    console.error('missing title:', id);
    continue;
  }
  const section = cardIdToSection[id] || 'portal-other';
  tools.push({
    id,
    title: titleM[1].trim(),
    href: am[1],
    section,
    sectionLabel: SECTION_LABELS[section] || section,
    caseReportRelevant:
      CASE_REPORT_SECTIONS.has(section)
      || id.startsWith('card-shitei')
      || id === 'card-seishin-hoken-ho-flow'
      || id === 'card-cssrs-memo',
    teachingCaseRelevant:
      (CASE_REPORT_SECTIONS.has(section)
        || id === 'card-cssrs-memo'
        || id === 'card-csc-jp'
        || id === 'card-terminology'
        || id === 'card-teaching-workspace')
      && !TEACHING_EXCLUDE_IDS.has(id),
  });
}

tools.sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title, 'ja'));

const outDir = path.join(root, 'data');
fs.mkdirSync(outDir, { recursive: true });

const portalRegistry = { version: 1, generatedAt: new Date().toISOString(), tools };
fs.writeFileSync(
  path.join(outDir, 'portal-tools-registry.json'),
  JSON.stringify(portalRegistry, null, 2),
);
console.log(`Generated ${tools.length} tools`);

function updateHtmlEmbed(htmlPath, markerName, embedId, jsonObj) {
  if (!fs.existsSync(htmlPath)) {
    console.log(`skip embed ${markerName} (${path.basename(htmlPath)} not found)`);
    return;
  }
  const content = fs.readFileSync(htmlPath, 'utf8');
  const startMarker = `<!-- EMBED:${markerName} START -->`;
  const endMarker = `<!-- EMBED:${markerName} END -->`;
  const embedBlock = `${startMarker}\n<script type="application/json" id="${embedId}">\n${JSON.stringify(jsonObj, null, 2)}\n</script>\n${endMarker}`;
  const re = new RegExp(`${startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  if (!re.test(content)) {
    console.log(`skip embed ${markerName} (markers missing in ${path.basename(htmlPath)})`);
    return;
  }
  fs.writeFileSync(htmlPath, content.replace(re, embedBlock));
}

const checklistPath = path.join(outDir, 'checklist-rules.json');
if (fs.existsSync(checklistPath)) {
  const checklistData = JSON.parse(fs.readFileSync(checklistPath, 'utf8'));
  updateHtmlEmbed(
    path.join(root, 'shitei-report-workspace.html'),
    'portal-tools-registry',
    'portal-tools-registry-embed',
    portalRegistry,
  );
  updateHtmlEmbed(
    path.join(root, 'shitei-report-workspace.html'),
    'checklist-rules',
    'checklist-rules-embed',
    checklistData,
  );
}

const teachingChecklistPath = path.join(outDir, 'teaching-checklist-rules.json');
if (fs.existsSync(teachingChecklistPath)) {
  const teachingChecklistData = JSON.parse(fs.readFileSync(teachingChecklistPath, 'utf8'));
  updateHtmlEmbed(
    path.join(root, 'teaching-case-workspace.html'),
    'portal-tools-registry',
    'portal-tools-registry-embed',
    portalRegistry,
  );
  updateHtmlEmbed(
    path.join(root, 'teaching-case-workspace.html'),
    'teaching-checklist-rules',
    'teaching-checklist-rules-embed',
    teachingChecklistData,
  );
}
