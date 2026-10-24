import test from 'node:test';import assert from 'node:assert/strict';
import {parseText,scrubAadhaar,classify,categories,layouts} from './parse.js';
test('Payslip sample extracts salary details despite repeated employee heading',()=>{
 const result=parseText('PAYSLIP | Demo Technologies\nEmployee\n\nEmployee Arjun Kapoor\nEmployee Code EMP-0042\nPay Month September 2026\nDesignation Software Developer\nEarnings & Deductions\nBasic Salary INR 38000.00\nAllowance INR 12000.00\nDeduction INR 2500.00\nNet Pay INR 47500.00');
 assert.equal(result.type,'payslip');
 assert.deepEqual(result.fields,{fullName:'Arjun Kapoor',employer:'Demo Technologies',employeeCode:'EMP-0042',payMonth:'September 2026',designation:'Software Developer',basicSalary:'INR 38000.00',allowances:'INR 12000.00',deductions:'INR 2500.00',grossPay:'',netPay:'INR 47500.00'});
 assert.deepEqual(result.warnings,[]);
 assert.equal(classify('unreadable text','payslip_sample.pdf'),'payslip');
 assert.equal(classify('Salary Slip\nPAN Number ABCDE1234F'),'payslip');
});
test('Shared label parsing avoids matching prefixes and supports hash separators',()=>{
 const result=parseText('INVOICE\nInvoice Number # INV-42\nVendor: Sample Store\nTotal Tax: 50\nTotal: 550');
 assert.equal(result.fields.invoiceNumber,'INV-42');
 assert.equal(parseText('MEDICAL REPORT\nPatient Name: Test Person\nLaboratory: Demo Lab').fields.hospital,'Demo Lab');
});
test('Specific bill types take precedence over invoice clues and receipt title supplies merchant',()=>{
 assert.equal(classify('ELECTRICITY BILL\nBill Number EB-42'),'utilityBill');
 assert.equal(parseText('PAYMENT RECEIPT | Demo Mart\nReceipt Number R-42').fields.merchant,'Demo Mart');
});
test('PAN recognized',()=>{const r=parseText('INCOME TAX DEPARTMENT\nName: TEST PERSON\nDate of Birth: 01/01/1999\nABCDE1234F');assert.equal(r.fields.panNumber,'ABCDE1234F');assert.equal(r.fields.fullName,'TEST PERSON');});
test('PAN-like OCR label extracts available fields and flags the placeholder number',()=>{const r=parseText('SYNTHETIC SAMPLE - NOT VALID FOR IDENTIFICATION\nFULL NAME Aarav Mehta\nPARENT NAME Kiran Mehta\nDATE OF BIRTH 14/08/1998\nPAN-LIKE ID TESTX0000X\nOCR TEST DATA ONLY');assert.equal(r.type,'pan');assert.equal(r.fields.fullName,'Aarav Mehta');assert.equal(r.fields.parentName,'Kiran Mehta');assert.equal(r.fields.dob,'14/08/1998');assert.equal(r.fields.panNumber,'TESTX0000X');assert.deepEqual(r.warnings,['Review the PAN number.']);});
test('Aadhaar number masked',()=>assert.equal(scrubAadhaar('1234 5678 9012'),'XXXX XXXX 9012'));
test('Resume email extracted',()=>assert.equal(parseText('RESUME\nName: Example Person\nemail test@example.com').fields.fullName,'Example Person'));
test('Generic classification fallback',()=>assert.equal(classify('arbitrary text'),'generic'));
test('Generic documents retain OCR text with Aadhaar masked and keep editable fields',()=>{const result=parseText('UNRECOGNIZED FORM\nReference: 1234 5678 9012');assert.deepEqual(Object.keys(result.fields),layouts.generic);assert.equal(result.fields.fullName,'');assert.equal(result.fields.notes,'UNRECOGNIZED FORM\nReference: XXXX XXXX 9012');});
test('Every supported category keeps its full editable field layout when OCR finds no values',()=>{for(const type of categories.filter(value=>value!=='auto')){const result=parseText('',type);assert.deepEqual(Object.keys(result.fields),layouts[type]);assert.ok(Object.values(result.fields).every(value=>value===''));}});
test('Required fields are distinct by category and missing values are reported',()=>{const result=parseText('INVOICE\nVendor: Sample Store');assert.deepEqual(result.requiredFields,['vendor','invoiceNumber','total']);assert.ok(result.warnings.some(w=>w.includes('Invoice Number, Total')));});
test('Medical report fields are classified and extracted',()=>{const result=parseText('MEDICAL REPORT\nPatient Name: Asha Raman\nAge: 42 years\nGender: Female\nDate of Birth: 12/03/1984\nReport Date: 21/10/2026\nHospital: City General Hospital\nDoctor: Dr Kumar\nDiagnosis: Seasonal allergy\nFindings: Mild inflammation\nMedications: Cetirizine\nRecommendations: Follow up in one week');assert.equal(result.type,'medical');assert.equal(result.fields.patientName,'Asha Raman');assert.equal(result.fields.age,'42 years');assert.equal(result.fields.gender,'Female');assert.equal(result.fields.reportDate,'21/10/2026');assert.equal(result.fields.hospital,'City General Hospital');assert.equal(result.fields.diagnosis,'Seasonal allergy');assert.equal(result.fields.findings,'Mild inflammation');assert.equal(result.fields.medications,'Cetirizine');assert.equal(result.fields.recommendations,'Follow up in one week');assert.deepEqual(result.warnings,[]);});
test('Academic certificates retain roll number but omit year, semester, and result',()=>{const result=parseText('ACADEMIC MARKSHEET | Demo University\nStudent\nName Ishita Verma\nRoll Number DEMO-UNI-2026-008\nCourse B.Sc. Computer Science\nSemester vi\nYear 2026\nResult PASS\nCGPA 8.85','auto','marksheet_sample.pdf');assert.equal(result.type,'certificate');assert.equal(result.fields.fullName,'Ishita Verma');assert.equal(result.fields.qualification,'B.Sc. Computer Science');assert.equal(result.fields.rollNumber,'DEMO-UNI-2026-008');assert.equal(result.fields.grade,'8.85');assert.equal(result.fields.year,undefined);assert.equal(result.fields.semester,undefined);assert.equal(result.fields.result,undefined);assert.deepEqual(result.requiredFields,['fullName','qualification']);});
test('Completion certificate omits irrelevant roll number',()=>{const result=parseText('COURSE COMPLETION | Demo Academy\nCertificate Details\nIssued To Kabir Sethi\nCourse Full Stack Web Development\nCertificate ID CERT-DEMO-114\nCompletion Date 12/10/2026\nGrade Distinction','certificate','certificate_sample.pdf');assert.equal(result.fields.fullName,'Kabir Sethi');assert.equal(result.fields.institution,'Demo Academy');assert.equal(result.fields.qualification,'Full Stack Web Development');assert.equal(result.fields.certificateId,'CERT-DEMO-114');assert.equal(result.fields.completionDate,'12/10/2026');assert.equal(result.fields.grade,'Distinction');assert.equal(result.fields.rollNumber,undefined);assert.equal(result.fields.year,undefined);assert.equal(result.fields.semester,undefined);assert.equal(result.fields.result,undefined);assert.deepEqual(result.requiredFields,['fullName','qualification','certificateId','completionDate']);assert.deepEqual(result.warnings,[]);});
test('Auto detection extracts representative fields for supported document categories',()=>{
 const cases=[
  ['AADHAAR CARD\nName: Ravi Kumar\nYear of Birth: 1990\nAddress: Sample Road','aadhaar','fullName','Ravi Kumar'],
  ['DRIVING LICENCE\nName: Reena Das\nDL No: KA0120220001234','licence','licenceNumber','KA0120220001234'],
  ['VOTER ID\nName: Meera Sen\nEPIC No: ABC1234567','voter','epicNumber','ABC1234567'],
  ['PASSPORT\nName: Dev Shah\nPassport No: A1234567\nNationality: Indian','passport','passportNumber','A1234567'],
  ['UNIVERSITY CERTIFICATE\nName: Tara Rao\nUniversity: Sample University\nDegree: Science','certificate','institution','Sample University'],
  ['INVOICE\nVendor: Sample Store\nInvoice No: INV-1042\nTotal: 500','invoice','invoiceNumber','INV-1042'],
  ['RESUME\nName: Noor Ali\nemail noor@example.com','resume','email','noor@example.com'],
    ['MEDICAL REPORT\nPatient Name: Asha Raman\nDiagnosis: Seasonal allergy','medical','diagnosis','Seasonal allergy'],
    ['RC INSURANCE POLICY\nOwner Name: Rohan Iyer\nRegistration No: KA01AB1234\nPolicy No: POL-2026-0042\nInsurance Company: Safe Motor Cover\nMake and Model: Sample Hatchback\nVehicle Class: Private Car\nEngine No: ENG-1234\nChassis No: CHA-5678\nPolicy Period: 01/04/2025 to 31/03/2026\nIDV: 450000\nTotal Premium: 12000','vehicleInsurance','policyNumber','POL-2026-0042'],
    ['RC SMART CARD\nOwner Name: Rohan Iyer\nRegistration No: KA01AB1234\nDate of Registration: 15/06/2023\nRegistration Authority: RTO Chennai\nMaker’s Name: Sample Motors\nModel Name: City Hatchback\nClass of Vehicle: Motor Car\nFuel Type: Petrol\nYear of Manufacture: 2023\nEngine No: ENG-1234\nChassis No: CHA-5678\nColor: Blue\nSeating Capacity: 5','registrationCertificate','registrationNumber','KA01AB1234'],
    ['ELECTRICITY BILL | Demo Energy\nService Details\nCustomer Priya Menon\nService Number DEMO-EB-0057\nBilling Address 17 Sample Street, Test City\nBill Month October 2026\nUnits Consumed 256 kWh\nAmount Due INR 1840.00\nDue Date 28/10/2026','utilityBill','accountNumber','DEMO-EB-0057']
 ];
 for(const [text,type,key,value] of cases){const result=parseText(text);assert.equal(result.type,type);assert.equal(result.fields[key],value);}
 const insurance=parseText('RC INSURANCE POLICY\nOwner Name: Rohan Iyer\nRegistration No: KA01AB1234\nPolicy No: POL-2026-0042\nInsurance Company: Safe Motor Cover\nMake and Model: Sample Hatchback\nVehicle Class: Private Car\nEngine No: ENG-1234\nChassis No: CHA-5678\nPolicy Period: 01/04/2025 to 31/03/2026\nIDV: 450000\nTotal Premium: 12000');
 assert.deepEqual(insurance.fields,{ownerName:'Rohan Iyer',registrationNumber:'KA01AB1234',policyNumber:'POL-2026-0042',insurer:'Safe Motor Cover',vehicleMakeModel:'Sample Hatchback',vehicleClass:'Private Car',engineNumber:'ENG-1234',chassisNumber:'CHA-5678',policyStartDate:'01/04/2025',policyExpiryDate:'31/03/2026',insuredDeclaredValue:'450000',premium:'12000'});
 assert.deepEqual(insurance.requiredFields,['ownerName','registrationNumber','policyNumber','policyExpiryDate']);
 assert.deepEqual(insurance.warnings,[]);
 const rc=parseText('RC SMART CARD\nOwner Name: Rohan Iyer\nRegistration No: KA01AB1234\nDate of Registration: 15/06/2023\nRegistration Authority: RTO Chennai\nMaker\'s Name: Sample Motors\nModel Name: City Hatchback\nClass of Vehicle: Motor Car\nFuel Type: Petrol\nYear of Manufacture: 2023\nEngine No: ENG-1234\nChassis No: CHA-5678\nColor: Blue\nSeating Capacity: 5');
 assert.equal(rc.type,'registrationCertificate');
 assert.equal(rc.fields.ownerName,'Rohan Iyer');
 assert.equal(rc.fields.registrationDate,'15/06/2023');
 assert.equal(rc.fields.registeringAuthority,'RTO Chennai');
 assert.equal(rc.fields.manufacturer,'Sample Motors');
 assert.equal(rc.fields.model,'City Hatchback');
 assert.equal(rc.fields.vehicleClass,'Motor Car');
 assert.equal(rc.fields.fuelType,'Petrol');
 assert.equal(rc.fields.manufactureYear,'2023');
 assert.equal(rc.fields.engineNumber,'ENG-1234');
 assert.equal(rc.fields.chassisNumber,'CHA-5678');
 assert.equal(rc.fields.color,'Blue');
 assert.equal(rc.fields.seatingCapacity,'5');
 assert.deepEqual(rc.requiredFields,['ownerName','registrationNumber']);
 assert.equal(rc.fields.policyNumber,undefined);
 const utility=parseText('ELECTRICITY BILL | Demo Energy\nFICTIONAL OCR TEST SAMPLE | NOT AN OFFICIAL DOCUMENT\nService Details\nCustomer Priya Menon\nService Number DEMO-EB-0057\nBilling Address 17 Sample Street, Test City\nBill Month October 2026\nCharges\nUnits Consumed 256 kWh\nAmount Due INR 1840.00\nDue Date 28/10/2026\nDEMO / SYNTHETIC | FOR SOFTWARE TESTING ONLY','auto','electricity_bill_sample.pdf');
 assert.equal(utility.type,'utilityBill');
 assert.deepEqual(utility.fields,{utilityProvider:'Demo Energy',customerName:'Priya Menon',accountNumber:'DEMO-EB-0057',serviceAddress:'17 Sample Street, Test City',billMonth:'October 2026',billingPeriod:'',unitsConsumed:'256 kWh',amountDue:'INR 1840.00',dueDate:'28/10/2026',meterNumber:'',previousReading:'',currentReading:''});
 assert.deepEqual(utility.requiredFields,['customerName','accountNumber','amountDue','dueDate']);
 assert.deepEqual(utility.warnings,[]);
 const receipt=parseText('PAYMENT RECEIPT | Demo Mart\nReceipt Number RCPT-DEMO-0041\nDate 19/10/2026\nMerchant Demo Mart\nitem USB-C Cable\nQuantity 2\nGrand Total INR 798.00\nPayment Method UPI TEST','auto','receipt_sample.pdf');
 assert.equal(receipt.type,'receipt');
 assert.deepEqual(receipt.fields,{receiptNumber:'RCPT-DEMO-0041',date:'19/10/2026',merchant:'Demo Mart',itemDescription:'USB-C Cable',quantity:'2',grandTotal:'INR 798.00',paymentMethod:'UPI TEST'});
 assert.deepEqual(receipt.requiredFields,['receiptNumber','date','merchant','grandTotal']);
 assert.deepEqual(receipt.warnings,[]);
 const bank=parseText('BANK STATEMENT | Sample Bank\nAccount Information\nAccount Holder Maya Nair\nAccount ID DEMO-ACCT-0017\nStatement Period 01/09/2026 - 30/09/2026\nIFSC-like Code DEMO0000000\nTransactions\n02 Sep 2026 Salary Credit | INR 52000.00\n05 Sep 2026 Rent Payment | INR -14000.00\n10 Sep 2026 Grocery Store | INR -1875.50\n30 Sep 2026 Closing Balance | INR 36124.50\nDEMO / SYNTHETIC | FOR SOFTWARE TESTING ONLY','auto','bank_statement_sample.pdf');
 assert.equal(bank.type,'bankStatement');
 assert.deepEqual(bank.fields,{bankName:'Sample Bank',accountHolder:'Maya Nair',accountNumber:'DEMO-ACCT-0017',statementPeriod:'01/09/2026 - 30/09/2026',ifscCode:'DEMO0000000',openingBalance:'',totalCredits:'',totalDebits:'',closingBalance:'INR 36124.50',transactions:'02 Sep 2026 Salary Credit | INR 52000.00\n05 Sep 2026 Rent Payment | INR -14000.00\n10 Sep 2026 Grocery Store | INR -1875.50\n30 Sep 2026 Closing Balance | INR 36124.50'});
 assert.deepEqual(bank.requiredFields,['accountHolder','accountNumber','statementPeriod','closingBalance']);
 assert.deepEqual(bank.warnings,[]);
});
test('OCR label aliases are extracted for voter, certificate, and tax invoice documents',()=>{
 const voter=parseText('VOTER CARD\nHOLDER: Meera Sen\nEPIC ID: ABC1234567');assert.equal(voter.type,'voter');assert.equal(voter.fields.fullName,'Meera Sen');assert.equal(voter.fields.epicNumber,'ABC1234567');
 const certificate=parseText('DEGREE CERTIFICATE\nApplicant Name: Tara Rao\nSchool: Sample Institute\nQualification: Bachelor of Science\nRegistration Number: REG-42');assert.equal(certificate.type,'certificate');assert.equal(certificate.fields.fullName,'Tara Rao');assert.equal(certificate.fields.institution,'Sample Institute');assert.equal(certificate.fields.qualification,'Bachelor of Science');assert.equal(certificate.fields.rollNumber,'REG-42');
 const invoice=parseText('TAX INVOICE\nSupplier: Sample Store\nBill No: INV-1042\nBill To: Example Buyer\nAmount Due: 500');assert.equal(invoice.type,'invoice');assert.equal(invoice.fields.vendor,'Sample Store');assert.equal(invoice.fields.invoiceNumber,'INV-1042');assert.equal(invoice.fields.customer,'Example Buyer');assert.equal(invoice.fields.total,'500');
});
test('Aadhaar mock labels use DOB without a duplicate birth-year field',()=>{const result=parseText('SYNTHETIC SAMPLE - NOT VALID FOR IDENTIFICATION\nFULL NAME Diya Sharma\nDATE OF BIRTH 02/11/2001\nYEAR OF BIRTH 2001\nGENDER Female\nADDRESS 42 Sample Lane, Test City\nDEMO ID XXXX XXXX 0000\nOCR TEST DATA ONLY');assert.equal(result.type,'aadhaar');assert.equal(result.fields.fullName,'Diya Sharma');assert.equal(result.fields.dob,'02/11/2001');assert.equal(result.fields.birthYear,undefined);assert.equal(result.fields.gender,'Female');assert.equal(result.fields.address,'42 Sample Lane, Test City');assert.equal(result.fields.aadhaarLast4,'0000');});
test('Resident ID samples auto-detect as Aadhaar and populate every available detail',()=>{const result=parseText('RESIDENT ID - DEMO\n\nSYNTHETIC SAMPLE - NOT VALID FOR IDENTIFICATION\nFULL NAME Diya Sharma\n\nDATE OF BIRTH 02/11/2001\n\nGENDER Female\n\nADDRESS 42 Sample Lane, Test City\nDEMO ID XXXX XXXX 0000\n\nOCR TEST DATA ONLY | FICTIONAL PERSON AND DETAILS');assert.equal(result.type,'aadhaar');assert.equal(result.fields.fullName,'Diya Sharma');assert.equal(result.fields.dob,'02/11/2001');assert.equal(result.fields.gender,'Female');assert.equal(result.fields.address,'42 Sample Lane, Test City');assert.equal(result.fields.aadhaarLast4,'0000');});
test('Passport filename fallback maps travel-ID fields when OCR misses the heading',()=>{const result=parseText('SYNTHETIC SAMPLE - NOT VALID FOR IDENTIFICATION\nNAME Nisha Rao\nNATIONALITY Exampleland\nDATE OF BIRTH 09/09/1997\nDOCUMENT NO DEMO-P00042\nEXPIRY 15/01/2032\nOCR TEST DATA ONLY | FICTIONAL PERSON AND DETAILS','auto','passport_mock.png');assert.equal(result.type,'passport');assert.equal(result.fields.fullName,'Nisha Rao');assert.equal(result.fields.passportNumber,'DEMO-P00042');assert.equal(result.fields.nationality,'Exampleland');assert.equal(result.fields.dob,'09/09/1997');assert.equal(result.fields.expiryDate,'15/01/2032');assert.equal(result.fields.issueDate,'');assert.deepEqual(result.warnings,[]);});
test('Filename hints fill classification gaps across supported document categories',()=>{const cases=[['pan_mock.png','pan'],['aadhaar_mock.jpg','aadhaar'],['resume_mock.pdf','resume'],['driving_licence_mock.png','licence'],['rc_registration_certificate.png','registrationCertificate'],['vehicle_insurance_policy.pdf','vehicleInsurance'],['electricity_bill_sample.pdf','utilityBill'],['bank_statement_sample.pdf','bankStatement'],['receipt_sample.pdf','receipt'],['voter_id.png','voter'],['passport_mock.png','passport'],['degree_certificate.pdf','certificate'],['invoice_sample.pdf','invoice'],['medical_report.png','medical'],['unrecognized_upload.png','generic']];for(const [filename,type] of cases)assert.equal(classify('unreadable sample text',filename),type);assert.equal(classify('PASSPORT NUMBER A1234567','invoice_sample.pdf'),'passport');});
test('Licence mock labels classify and extract holder, ID, expiry, and vehicle class',()=>{const result=parseText('SYNTHETIC SAMPLE - NOT VALID FOR IDENTIFICATION\nHOLDER Rohan Iyer\nDOB 23/05/1996\nLICENCE ID DEMO-DL-00042\nVEHICLE CLASS LMV\nVALID UNTIL 31/12/2030\nOCR TEST DATA ONLY');assert.equal(result.type,'licence');assert.equal(result.fields.fullName,'Rohan Iyer');assert.equal(result.fields.dob,'23/05/1996');assert.equal(result.fields.licenceNumber,'DEMO-DL-00042');assert.equal(result.fields.expiryDate,'31/12/2030');assert.equal(result.fields.vehicleClass,'LMV');assert.equal(result.fields.issueDate,'');assert.equal(result.fields.address,'');assert.deepEqual(result.requiredFields,['fullName','dob','licenceNumber','expiryDate']);});
