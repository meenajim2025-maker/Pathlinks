#!/usr/bin/env node
/**
 * Parses MP3 filenames from a USB drive (or folder) and generates
 * clinical_topics_learning.json for the PathLinks Learning section.
 * Usage: node scripts/parse-mp3-topics.js "/Volumes/NO NAME"
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || '/Volumes/NO NAME';
const OUT_PATH = path.join(__dirname, '..', 'data', 'clinical_topics_learning.json');

// Keywords to assign topics to clinical sections (order matters for multi-match)
const SECTION_KEYWORDS = [
  {
    id: 'cardiovascular',
    name: 'Cardiovascular & Cardiac',
    keywords: ['heart', 'cardiac', 'hypertension', 'qrisk', 'cvd', 'palpitation', 'aortic', 'atrial', 'valve', 'echocardiography', 'bp ', 'blood pressure', 'cardiovascular']
  },
  {
    id: 'dermatology',
    name: 'Dermatology & Skin',
    keywords: ['skin', 'dermatology', 'rash', 'actinic', 'bowen', 'dandruff', 'pityriasis', 'urticaria', 'eczema', 'melanoma', 'keloid', 'dry skin', 'emollient', 'hidradenitis', 'paronychia', 'intertrigo', 'versicolor']
  },
  {
    id: 'mental-health',
    name: 'Mental Health & Wellbeing',
    keywords: ['mental health', 'depression', 'anxiety', 'ocd', 'obsessive', 'ptsd', 'post-traumatic', 'perinatal mental', 'baby blues', 'seasonal affective', 'binge-eating', 'emotional wellbeing', 'digital wellbeing', 'gambling']
  },
  {
    id: 'gastroenterology',
    name: 'Gastroenterology & Liver',
    keywords: ['coeliac', 'diverticular', 'nafld', 'fatty liver', 'bowel', 'ibs', 'peptic ulcer', 'dysphagia', 'pancreatitis', 'cholecystitis', 'colorectal', 'appendicitis', 'barrett', 'galleri']
  },
  {
    id: 'endocrinology',
    name: 'Endocrinology & Diabetes',
    keywords: ['diabetes', 'thyroid', 'hypothyroidism', 'hyperthyroidism', 'testosterone', 'menopause', 'addison', 'adrenal', 'pcos', 'goitre', 'steroid', 'insulin', 'hba1c']
  },
  {
    id: 'musculoskeletal',
    name: 'Musculoskeletal & Joints',
    keywords: ['epicondylitis', 'hip pain', 'rotator cuff', 'carpal tunnel', 'arthritis', 'rheumatoid', 'ankylosing', 'fibromyalgia', 'capsulitis', 'chondromalacia', 'dupuytren', 'baker', 'olecranon', 'ganglion', 'claudication', 'lateral hip', 'morton', 'shin splint', 'tendon']
  },
  {
    id: 'respiratory',
    name: 'Respiratory & Sleep',
    keywords: ['copd', 'asthma', 'oxygen', 'sleep apnoea', 'domiciliary oxygen', 'chest x-ray', 'lung cancer']
  },
  {
    id: 'paediatrics',
    name: 'Paediatrics & Child Health',
    keywords: ['child', 'paediatric', 'baby', 'croup', '6-week', 'infant', 'febrile seizure', 'roseola', 'constipation', 'dietary allergy', 'sexual abuse', 'additional needs', 'parvovirus']
  },
  {
    id: 'renal-urology',
    name: 'Renal, Urology & LUTS',
    keywords: ['kidney', 'ckd', 'haematuria', 'uti', 'urinary', 'bladder', 'prostate', 'bph', 'luts', 'testicular', 'erectile', 'undescended testes']
  },
  {
    id: 'women-health',
    name: 'Women\'s & Reproductive Health',
    keywords: ['pregnancy', 'antenatal', 'postnatal', 'vulvovaginal', 'candidiasis', 'contraception', 'ectopic', 'ovarian', 'mastalgia', 'breast']
  },
  {
    id: 'infectious',
    name: 'Infectious Disease & Screening',
    keywords: ['hiv', 'syphilis', 'hepatitis', 'lyme', 'sepsis', 'vaccine', 'covid', 'varicella', 'rubella']
  },
  {
    id: 'neurology',
    name: 'Neurology & Headache',
    keywords: ['headache', 'cluster', 'migraine', 'vertigo', 'tinnitus', 'trigeminal', 'neuralgia', 'cauda equina', 'post-herpetic', 'tremor', 'paraesthesia', 'loss of consciousness']
  },
  {
    id: 'haematology',
    name: 'Haematology & Anaemia',
    keywords: ['anaemia', 'b12', 'pernicious', 'platelet', 'sickle cell', 'ferritin', 'iron']
  },
  {
    id: 'ent',
    name: 'ENT & Allergy',
    keywords: ['hay fever', 'allergy', 'postnasal', 'drip', 'ear', 'nose']
  },
  {
    id: 'procedures-general',
    name: 'Procedures & General Practice',
    keywords: ['ecg', 'consultation', 'expedition', 'altitude', 'sustainability', 'rcgp', 'innovait', 'rca', 'big gp']
  }
];

function findMp3Files(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findMp3Files(full, list);
    else if (e.name.toLowerCase().endsWith('.mp3')) list.push(full);
  }
  return list;
}

function parseTitle(filePath) {
  const base = path.basename(filePath, '.mp3').trim();
  // "Ep 130 – Croup" or "133 – Syphilis" or "Ep 82 - Pityriasis capitis (dandruff)"
  const dashMatch = base.match(/^(?:Ep\s*)?(\d+)\s*[–\-]\s*(.+)$/i);
  if (dashMatch) {
    return { episode: parseInt(dashMatch[1], 10), title: dashMatch[2].trim() };
  }
  // No episode number: use full name as title
  return { episode: null, title: base };
}

function assignSection(title) {
  const t = title.toLowerCase();
  for (const section of SECTION_KEYWORDS) {
    for (const kw of section.keywords) {
      if (t.includes(kw.toLowerCase())) return section.id;
    }
  }
  return 'other';
}

function main() {
  console.log('Scanning for MP3 files in:', ROOT);
  const files = findMp3Files(ROOT);
  console.log('Found', files.length, 'MP3 files');

  const bySection = {};
  SECTION_KEYWORDS.forEach(s => { bySection[s.id] = []; });
  bySection.other = [];

  const seen = new Set();
  for (const f of files) {
    const { episode, title } = parseTitle(f);
    const key = `${episode || ''}-${title}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const sectionId = assignSection(title);
    bySection[sectionId].push({ episode, title, filename: path.basename(f) });
  }

  // Sort topics within each section by episode number
  Object.keys(bySection).forEach(id => {
    bySection[id].sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
  });

  const sections = SECTION_KEYWORDS.map(s => ({
    id: s.id,
    name: s.name,
    topics: bySection[s.id] || []
  }));

  if (bySection.other.length) {
    sections.push({ id: 'other', name: 'Other clinical topics', topics: bySection.other });
  }

  const output = {
    source: 'Parsed from USB MP3 filenames',
    generated: new Date().toISOString(),
    totalTopics: files.length,
    sections
  };

  const dataDir = path.dirname(OUT_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log('Written to', OUT_PATH);
}

main();
