const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const aliases = {name:'fullName',fullname:'fullName',holdername:'fullName',dob:'dob',dateofbirth:'dob',birthdate:'dob',sex:'gender',patient:'patientName',patientname:'patientName',reportno:'reportNumber',reportnumber:'reportNumber'};
const canonical = (key, label) => aliases[normalize(key)] || aliases[normalize(label)] || normalize(label || key);
const identity = /^(?:fullName|patientName|dob)$|(?:number|last4|Id|Code)$|^(?:payMonth|statementPeriod|billingPeriod|collectionDate|reportDate)$/i;

function pageInfo(doc) {
  const name = String(doc.filename || '').replace(/\.[^.]+$/, '').replace(/[_ .-]+/g, ' ').trim();
  const marker = /\b(front|back|reverse|page\s*\d+|pg\s*\d+|side\s*[ab12])\b/ig;
  const matches = [...name.matchAll(marker)];
  const token = matches.at(-1)?.[0].toLowerCase() || '';
  return {stem: normalize(name.replace(marker, '')), marked: !!token, side: /^(?:front|side\s*[a1])$/.test(token) ? 'front' : /^(?:back|reverse|side\s*[b2])$/.test(token) ? 'back' : '',
    order: /back|reverse|side\s*[b2]/.test(token) ? 2 : Number(token.match(/\d+/)?.[0] || 1)};
}

function type(doc) {
  // Ration cards can be classified as generic, or contain an Aadhaar reference.
  if (/\bration\s*card\b/i.test((doc.filename || '').replace(/[_-]/g, ' ') + '\n' + (doc.text || ''))) return 'ration';
  return doc.category || 'generic';
}

function identities(doc) {
  return Object.fromEntries(Object.entries(doc.fields || {}).map(([key,value]) => [canonical(key,doc.fieldLabels?.[key]),normalize(value)]).filter(([key,value]) => identity.test(key) && value));
}

function compatible(a, b) {
  const at = type(a), bt = type(b);
  if (at !== bt && at !== 'generic' && bt !== 'generic') return false;
  const ai = identities(a), bi = identities(b);
  if (Object.keys(ai).some(key => bi[key] && ai[key] !== bi[key])) return false;
  return true;
}

function related(a, b) {
  const ap = pageInfo(a), bp = pageInfo(b);
  if (ap.stem && ap.stem === bp.stem && (ap.marked || bp.marked)) return true;
  if (type(a) !== type(b) || type(a) === 'generic') return false;
  const ai = identities(a), bi = identities(b);
  const shared = Object.keys(ai).filter(key => bi[key] === ai[key]);
  // A name alone does not establish that two reports or bills are the same record.
  return shared.some(key => !/^(?:fullname|patientname|dob)$/i.test(key)) ||
    (ap.side && bp.side && ap.side !== bp.side && shared.some(key => /^(?:fullname|patientname)$/i.test(key))) ||
    (ap.marked && bp.marked && shared.length >= 2);
}

export function groupDocuments(documents) {
  const groups = [];
  for (const doc of documents) {
    const group = groups.find(items => items.every(item => compatible(item,doc)) && items.some(item => related(item,doc)));
    if (group) group.push(doc); else groups.push([doc]);
  }
  return groups.map(group => group.sort((a,b) => pageInfo(a).order - pageInfo(b).order || Number(a.id)-Number(b.id)));
}

export function mergeDocumentFields(documents) {
  const fields = {}, labels = {}, keys = new Map();
  for (const doc of documents) for (const [key,raw] of Object.entries(doc.fields || {})) {
    const value = String(raw ?? '').trim();
    if (!value || /^(?:sample document for ocr|not valid for (?:official use|identification)|fictional test data|created for .*ocr)/i.test(value)) continue;
    const label = doc.fieldLabels?.[key];
    const canonicalKey = canonical(key,label);
    const target = keys.get(canonicalKey) || key;
    keys.set(canonicalKey,target);
    if (!Object.hasOwn(fields,target)) {fields[target]=value;if(label) labels[target]=label;continue;}
    if (normalize(fields[target]) === normalize(value)) continue;
    // Preserve complementary lines and differing values for review, without duplicates.
    const lines = fields[target].split('\n');
    for (const line of value.split('\n')) if (!lines.some(existing => normalize(existing) === normalize(line))) lines.push(line);
    fields[target]=lines.join('\n');
  }
  if (fields.testId && fields.aadhaarLast4 && fields.testId.replace(/\D/g,'').endsWith(fields.aadhaarLast4)) {delete fields.aadhaarLast4;delete labels.aadhaarLast4;}
  return {fields,labels};
}
