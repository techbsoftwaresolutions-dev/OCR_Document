import {parseText, classify, scrubAadhaar} from './parse.js';
import {discoverFields} from './discover.js';

// Known parsers supply normalized names; the document supplies the actual schema.
export function analyzeDocument(text, hint='auto', filename='') {
 const source=scrubAadhaar(String(text||''));
 const detected=classify(source,filename);
 const parsed=parseText(source,detected==='generic'?hint:detected,filename);
 const candidates=Object.fromEntries(Object.entries(parsed.fields).filter(([key,value])=>key!=='notes'&&String(value).trim()));
 const fields={};
 const labels={};
 const extras={certificate:['Semester','Year','Result','Subject','Total Marks','Maximum Marks','Percentage','CGPA'],passport:['Surname','Given Names','Place of Birth','Place of Issue','Sex'],licence:['Blood Group','Issuing Authority','Restrictions'],medical:['Blood Group','Patient ID','Hemoglobin','Blood Pressure','Blood Sugar','Test Name','Reference Range']};
 const knownLabels=[...Object.keys(parsed.fields).map(key=>key.replace(/([A-Z])/g,' $1')), ...(extras[parsed.type]||[])].sort((a,b)=>b.length-a.length);
 for(const entry of discoverFields(source,knownLabels)){
  const {label,value}=entry;
  const normalized=label.replace(/[^a-z0-9]/gi,'').toLowerCase();
  let existing=({name:'fullName',dateofbirth:'dob',birthdate:'dob',sex:'gender',holder:'fullName',holdername:'fullName',voter:'fullName',epic:'epicNumber'})[normalized] || Object.keys(parsed.fields).find(key=>key.toLowerCase()===normalized);
  const alias=Object.entries(parsed.fields).find(([key,v])=>v&&value===v&&label.toLowerCase()!==key.replace(/([A-Z])/g,' $1').toLowerCase());
  if(!entry.table&&alias&&!existing&&/name|holder|employee|salary|pay|allowance|deduction|\bno\b|number|\bid\b|course|grade|cgpa|merchant|vendor|customer|valid until/i.test(label))existing=alias[0];
  if(/aadhaar|uidai/i.test(label))continue;
  const words=label.match(/[A-Za-z0-9]+/g)||[];
  let key=existing||words.map((word,index)=>index?word[0].toUpperCase()+word.slice(1).toLowerCase():word.toLowerCase()).join('').slice(0,50);
  if(!key||! /^[a-z]/i.test(key))key='field'+(Object.keys(fields).length+1);
  if(!/^[a-z][a-z0-9]*$/i.test(key)||['constructor','prototype','__proto__'].includes(key))continue;
  if(Object.hasOwn(fields,key)){
   if(value===fields[key])continue;
   if(value.startsWith(fields[key]+'\n')){fields[key]=value.slice(0,3000);continue;}
   // Preserve different values for a repeated label instead of discarding them.
   let suffix=2;const base=key.slice(0,46);while(Object.hasOwn(fields,key))key=base+suffix++;
  }
  fields[key]=value.slice(0,3000);labels[key]=label;
 }
 // Unlabelled details (for example an email address) remain available after
 // the labelled fields, without taking precedence over the source order.
 for(const [key,value] of Object.entries(candidates)){
  if(!Object.hasOwn(fields,key)&&!Object.values(fields).includes(value))fields[key]=value;
 }
 if(fields.testId && fields.aadhaarLast4 && fields.testId.replace(/\D/g,'').endsWith(fields.aadhaarLast4)) {
  delete fields.aadhaarLast4;
  delete labels.aadhaarLast4;
 }
 // Exclude document decorations and empty values from the editable schema.
 for(const [key,value] of Object.entries(fields)) {
  if(!String(value).trim() || /^(?:sample document for ocr|not valid for (?:official use|identification)|fictional test data|created for .*ocr)/i.test(String(value).trim())) {
   delete fields[key]; delete labels[key];
  }
 }
 const warnings=parsed.warnings.filter(w=>!w.startsWith('Required fields not recognized:')&&!w.startsWith('Few fields were recognized.'));
 if(!Object.keys(fields).length){warnings.push('No structured fields were recognized. Review the extracted text and add fields manually.');}
 return {type:parsed.type,fields,labels,warnings,requiredFields:[]};
}
