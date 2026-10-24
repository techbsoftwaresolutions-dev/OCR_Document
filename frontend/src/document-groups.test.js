import test from 'node:test';
import assert from 'node:assert/strict';
import {groupDocuments,mergeDocumentFields} from './document-groups.js';
const doc = (id,filename,fields={},category='medical',fieldLabels={}) => ({id,filename,fields,category,fieldLabels});

test('medical report pages form one ordered review with all extracted fields', () => {
  const docs=[doc(2,'25_Medical_Report_Page_2.png',{patient:'Rohit Sample',findings:'Normal'}),doc(1,'25_Medical_Report_Page_1.png',{patient:'Rohit Sample',reportNo:'MED-TEST-101',collectionDate:'18/10/2026'})];
  const groups=groupDocuments(docs);
  assert.deepEqual(groups.map(g=>g.map(d=>d.id)),[[1,2]]);
  assert.deepEqual(mergeDocumentFields(groups[0]).fields,{patient:'Rohit Sample',reportNo:'MED-TEST-101',collectionDate:'18/10/2026',findings:'Normal'});
});
test('supports more than two pages and unknown document types',()=>{
  assert.equal(groupDocuments([1,2,3].map(i=>doc(i,`Application_Page_${i}.pdf`,{},'generic'))).length,1);
});
test('front and back fill missing values and deduplicate equivalent labels',()=>{
  const docs=[doc(1,'Card_front.jpg',{fullName:'Rohit',dob:'01/01/1990',address:''},'aadhaar'),doc(2,'Card_back.jpg',{name:'Rohit',dateOfBirth:'01/01/1990',address:'Chennai'},'aadhaar')];
  assert.equal(groupDocuments(docs).length,1);
  assert.deepEqual(mergeDocumentFields(docs).fields,{fullName:'Rohit',dob:'01/01/1990',address:'Chennai'});
});
test('different types never merge despite matching names and filename stems',()=>{
  assert.equal(groupDocuments([doc(1,'Card_front.jpg',{fullName:'Rohit'},'aadhaar'),doc(2,'Card_back.jpg',{fullName:'Rohit'},'ration')]).length,2);
  assert.equal(groupDocuments([doc(1,'Aadhaar_front.jpg',{fullName:'Rohit'},'aadhaar'),doc(2,'Ration_card_back.jpg',{fullName:'Rohit'},'generic')]).length,2);
});
test('conflicting identities stay separate even with matching page filenames',()=>{
  assert.equal(groupDocuments([doc(1,'Report_Page_1.png',{reportNo:'A'}),doc(2,'Report_Page_2.png',{reportNumber:'B'})]).length,2);
});
test('same name alone does not join separate records',()=>{
  assert.equal(groupDocuments([doc(1,'scan1.png',{patientName:'Rohit'}),doc(2,'scan2.png',{patientName:'Rohit'})]).length,2);
});
test('matching record identifiers join scans without side filenames',()=>{
  assert.equal(groupDocuments([doc(1,'scan1.png',{reportNo:'A'}),doc(2,'scan2.png',{reportNumber:'A'})]).length,1);
});
test('front and back with different filenames can match by holder and type',()=>{
  assert.equal(groupDocuments([doc(1,'Photo_front.png',{fullName:'Rohit'},'aadhaar'),doc(2,'Scan_back.png',{fullName:'Rohit',address:'Chennai'},'aadhaar')]).length,1);
});
test('complementary repeated fields retain all distinct values',()=>{
  assert.deepEqual(mergeDocumentFields([doc(1,'a',{findings:'Normal\nStable'}),doc(2,'b',{findings:'Stable\nFollow up'})]).fields,{findings:'Normal\nStable\nFollow up'});
});
