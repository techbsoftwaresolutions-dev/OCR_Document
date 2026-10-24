import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDocument} from './analyze.js';
test('Fitness certificate preserves source label order without mistaking values for table headings',()=>{
 const result=analyzeDocument('VEHICLE FITNESS CERTIFICATE\n\nFitness Number                  DEMO-FIT-001\nRegistration Number          TEST-TN-CV-002\nVehicle Class                        Light Goods Vehicle\nInspection Date               2026-06-15\n\nValid Until                       2027-06-14\n\nStatus                                 FIT','auto','fitness_certificate.png');
 assert.deepEqual(Object.keys(result.fields).map(key=>result.labels[key]),['Fitness Number','Registration Number','Vehicle Class','Inspection Date','Valid Until','Status']);
 assert.deepEqual(Object.values(result.fields),['DEMO-FIT-001','TEST-TN-CV-002','Light Goods Vehicle','2026-06-15','2027-06-14','FIT']);
});
test('Known aliases retain document labels and position rather than template order',()=>{
 const result=analyzeDocument('PASSPORT\nNationality: Indian\nName: Mira Shah\nPassport Number: A1234567');
 assert.deepEqual(Object.keys(result.fields).map(key=>result.labels[key]),['Nationality','Name','Passport Number']);
});
test('Actual insurance certificate OCR recovers every field despite collapsed columns and a stale licence category',()=>{
 const text='INSURANCE CERTIFICATE\n\nSYNTHETIC OCR TEST DOCUMENT | NOT VALID\n\nCertificate Number DEMO-CERT-MTR-002\nPolicy Number DEMO-INS-MOTOR-001\nVehicle Registration TEST-TN-VEH-001\nValid From 2026-01-01\n\nValid Until 2026-12-31\nInsurance Type Package Policy\nFICTIONAL DATA « DO NOT USE AS A REAL DOCUMENT\n';
 const result=analyzeDocument(text,'licence','insurance_certificate.png');
 assert.equal(result.type,'vehicleInsurance');
 for(const value of ['DEMO-CERT-MTR-002','DEMO-INS-MOTOR-001','TEST-TN-VEH-001','2026-01-01','2026-12-31','Package Policy'])assert.ok(Object.values(result.fields).includes(value),value);
 assert.equal(Object.keys(result.fields).length,6);
});
test('Unlisted document types extract single-spaced OCR labels without a category template',()=>{
 const result=analyzeDocument('DELIVERY RECORD\nTracking Number PKG-42\nDelivery Type Express\nDestination Address 17 Sample Street\nParcel Weight 4 kg');
 assert.equal(result.fields.trackingNumber,'PKG-42');assert.equal(result.fields.deliveryType,'Express');assert.equal(result.fields.destinationAddress,'17 Sample Street');assert.equal(result.fields.parcelWeight,'4 kg');
});
test('Unfamiliar forms discover dash-separated, multiline and repeated fields',()=>{
 const result=analyzeDocument('SHIPPING FORM\nConsignment Code - PKG-42\nDelivery Address:\n17 Sample Street\nChennai 600001\nParcel Weight: 4 kg\nParcel Weight: 2 kg');
 assert.equal(result.fields.consignmentCode,'PKG-42');
 assert.equal(result.fields.deliveryAddress,'17 Sample Street\nChennai 600001');
 assert.equal(result.fields.parcelWeight,'4 kg');assert.equal(result.fields.parcelWeight2,'2 kg');
});
test('Unknown tables generate fields for every row and column',()=>{
 const result=analyzeDocument('ASSESSMENT\nSubject | Score | Maximum\nMathematics | 95 | 100\nPhysics | 95 | 100');
 assert.deepEqual(result.fields,{mathematicsScore:'95',mathematicsMaximum:'100',physicsScore:'95',physicsMaximum:'100'});
});
test('Unfamiliar labels support values on the next line and preserve equal values',()=>{
 const result=analyzeDocument('CUSTOM RECORD\nDepartment\nAccounts\nFirst Reading: 42\nSecond Reading: 42');
 assert.equal(result.fields.department,'Accounts');assert.equal(result.fields.firstReading,'42');assert.equal(result.fields.secondReading,'42');
});

test('Schema follows fields present in each document rather than a category template',()=>{
 const cases=[
  ['MARKSHEET\nName: Mira Shah\nSemester: VI\nMathematics: 95\nResult: PASS','certificate',{semester:'VI',mathematics:'95',result:'PASS'},'certificateId'],
  ['DRIVING LICENCE\nName: Mira Shah\nDL No: DEMO42\nBlood Group: O+','licence',{licenceNumber:'DEMO42',bloodGroup:'O+'},'expiryDate'],
  ['PASSPORT\nName: Mira Shah\nPlace of Birth: Chennai','passport',{placeOfBirth:'Chennai'},'licenceNumber'],
  ['MEDICAL REPORT\nPatient Name: Mira Shah\nHemoglobin: 12.5 g/dL\nBlood Pressure: 120/80','medical',{hemoglobin:'12.5 g/dL',bloodPressure:'120/80'},'medications']
 ];
 for(const [text,type,values,absent] of cases){const result=analyzeDocument(text);assert.equal(result.type,type);for(const [key,value] of Object.entries(values))assert.equal(result.fields[key],value);assert.equal(result.fields[absent],undefined);assert.deepEqual(result.requiredFields,[]);}
});
test('Two documents of the same type can produce different fields',()=>{
 const first=analyzeDocument('MEDICAL REPORT\nPatient Name: Mira Shah\nBlood Sugar: 90 mg/dL');
 const second=analyzeDocument('MEDICAL REPORT\nPatient Name: Mira Shah\nDiagnosis: Allergy');
 assert.equal(first.fields.bloodSugar,'90 mg/dL');assert.equal(first.fields.diagnosis,undefined);
 assert.equal(second.fields.bloodSugar,undefined);assert.equal(second.fields.diagnosis,'Allergy');
});
test('Unknown documents retain custom labels without generic empty contact fields',()=>{
 const result=analyzeDocument('CUSTOM FORM\nReference Code: A-42\nDepartment: Accounts');
 assert.deepEqual(result.fields,{referenceCode:'A-42',department:'Accounts'});
});
test('Sensitive numbers stay masked in discovered fields and empty OCR reports a warning',()=>{
 const result=analyzeDocument('FORM\nReference: 1234 5678 9012');
 assert.equal(result.fields.reference,'XXXX XXXX 9012');
 assert.deepEqual(analyzeDocument('').fields,{});assert.equal(analyzeDocument('').warnings.length,1);
});

test('FASTag PDF labels on separate lines retain identifiers and currency values',()=>{
 const result=analyzeDocument('Tag Id\nDEMO-TAG-001\nVehicle Registration\nTEST-TN-VEH-001\nWallet Name\nSample Tag Wallet\nStatement Period\n2026-09-01 to 2026-09-30\nToll Plaza\nDemo Toll Plaza\nDebit Inr\n120\nClosing Balance Inr\n880\nDEMO ONLY: NOT VALID FOR OFFICIAL USE');
 assert.equal(result.fields.tagId,'DEMO-TAG-001');
 assert.equal(result.fields.vehicleRegistration,'TEST-TN-VEH-001');
 assert.equal(result.fields.debitInr,'120');
 assert.equal(result.fields.closingBalanceInr,'880');
 assert.equal(result.fields.demoOnly,undefined);
});

test('Aadhaar separate-line labels fill one canonical field without page headings',()=>{
 const result=analyzeDocument('AADHAAR\nFront | SAMPLE DOCUMENT FOR OCR\nNAME\nAarav Example\nDOB\n15/08/1998\nGENDER\nMale\nXXXX XXXX 1234','aadhaar');
 assert.equal(result.fields.fullName,'Aarav Example');
 assert.equal(result.fields.dob,'15/08/1998');
 assert.equal(result.fields.gender,'Male');
 assert.equal(result.fields.name,undefined);
 assert.equal(result.fields.front,undefined);
});

test('Test ID is extracted automatically from inline and separate-line labels',()=>{
 for(const line of ['Test ID: TEST-001','TEST ID\n\nTEST-001','Test ID TEST-001','Test-ID = TEST-001']) {
  const result=analyzeDocument('AADHAAR\nNAME\nAarav Example\n'+line+'\nDOB\n15/08/1998','aadhaar');
  assert.equal(result.fields.testId,'TEST-001');
  assert.equal(result.labels.testId,'Test ID');
  assert.equal(result.fields.dob,'15/08/1998');
 }
});

test('Test ID already containing the Aadhaar suffix does not create a duplicate last-four field',()=>{
 const result=analyzeDocument('AADHAAR\nNAME\nAarav Example\nTest ID\n1234 5678 9012\nADDRESS\n14 Sample Street, Tamil Nadu 600000','aadhaar');
 assert.equal(result.fields.testId,'XXXX XXXX 9012');
 assert.equal(result.fields.aadhaarLast4,undefined);
 assert.ok(result.fields.address.includes('14 Sample Street'));
});

test('Decorative notices and unstructured prose do not create editable fields',()=>{
 const result=analyzeDocument('CUSTOM FORM\nReference Code: A-42\nNotice: SAMPLE DOCUMENT FOR OCR\nDisclaimer: NOT VALID FOR OFFICIAL USE');
 assert.deepEqual(result.fields,{referenceCode:'A-42'});
 assert.deepEqual(analyzeDocument('This is an unstructured passage without labelled information.').fields,{});
});

test('Voter front and back retain every labelled detail',()=>{
 const front=analyzeDocument('VOTER ID\nFront | SAMPLE DOCUMENT FOR OCR\nVOTER\nVikram Test\nEPIC\nABC1234567\nGENDER\nMale\nDOB\n09/09/1999','voter');
 assert.equal(front.fields.fullName,'Vikram Test');
 assert.equal(front.fields.epicNumber,'ABC1234567');
 assert.equal(front.fields.gender,'Male');
 assert.equal(front.fields.dob,'09/09/1999');
 const back=analyzeDocument('VOTER ID\nBack | SAMPLE DOCUMENT FOR OCR\nADDRESS\n55 Mock Lane, Test City\nCONSTITUENCY\nSample Assembly\nSTATE\nTamil Nadu','voter');
 assert.equal(back.fields.address,'55 Mock Lane, Test City');
 assert.equal(back.fields.constituency,'Sample Assembly');
 assert.equal(back.fields.state,'Tamil Nadu');
});
test('Unfamiliar uppercase labels retain their values',()=>{
 const result=analyzeDocument('CUSTOM FORM\nFAVOURITE COLOUR\nBlue\nSECOND COLOUR\nBlue');
 assert.equal(result.fields.favouriteColour,'Blue');
 assert.equal(result.fields.secondColour,'Blue');
});
