export const categories = ['auto','pan','aadhaar','resume','licence','registrationCertificate','vehicleInsurance','utilityBill','bankStatement','payslip','receipt','voter','passport','certificate','invoice','medical','generic'];
export const layouts = {
 payslip:['fullName','employer','employeeCode','payMonth','designation','basicSalary','allowances','deductions','grossPay','netPay'],
 pan:['fullName','parentName','dob','panNumber'],
 aadhaar:['fullName','dob','gender','address','aadhaarLast4'],
 resume:['fullName','email','phone','location','skills','education','experience','linkedin','github'],
 licence:['fullName','dob','licenceNumber','issueDate','expiryDate','vehicleClass','address'],
 registrationCertificate:['ownerName','registrationNumber','registrationDate','registeringAuthority','manufacturer','model','vehicleClass','fuelType','manufactureYear','engineNumber','chassisNumber','color','seatingCapacity','ownerAddress'],
 vehicleInsurance:['ownerName','registrationNumber','policyNumber','insurer','vehicleMakeModel','vehicleClass','engineNumber','chassisNumber','policyStartDate','policyExpiryDate','insuredDeclaredValue','premium'],
 utilityBill:['utilityProvider','customerName','accountNumber','serviceAddress','billMonth','billingPeriod','unitsConsumed','amountDue','dueDate','meterNumber','previousReading','currentReading'],
 bankStatement:['bankName','accountHolder','accountNumber','statementPeriod','ifscCode','openingBalance','totalCredits','totalDebits','closingBalance','transactions'],
 receipt:['receiptNumber','date','merchant','itemDescription','quantity','grandTotal','paymentMethod'],
 voter:['fullName','epicNumber','gender','dob'],
 passport:['fullName','passportNumber','dob','nationality','issueDate','expiryDate'],
 certificate:['fullName','institution','qualification','rollNumber','certificateId','completionDate','grade'],
 invoice:['vendor','invoiceNumber','invoiceDate','customer','subtotal','tax','total'],
 medical:['patientName','age','gender','dateOfBirth','reportDate','hospital','doctor','diagnosis','findings','medications','recommendations'],
 generic:['fullName','email','phone','notes']
};
export const requiredFields = {
 payslip:['fullName','payMonth','netPay'],
 pan:['fullName','panNumber'],
 aadhaar:['fullName','aadhaarLast4'],
 resume:['fullName','email'],
 licence:['fullName','dob','licenceNumber','expiryDate'],
 registrationCertificate:['ownerName','registrationNumber'],
 vehicleInsurance:['ownerName','registrationNumber','policyNumber','policyExpiryDate'],
 utilityBill:['customerName','accountNumber','amountDue','dueDate'],
 bankStatement:['accountHolder','accountNumber','statementPeriod','closingBalance'],
 receipt:['receiptNumber','date','merchant','grandTotal'],
 voter:['fullName','epicNumber'],
 passport:['fullName','passportNumber'],
 certificate:['fullName','qualification'],
 invoice:['vendor','invoiceNumber','total'],
 medical:['patientName','reportDate'],
 generic:[]
};
const clean=(s)=>String(s||'').replace(/\s+/g,' ').trim();
const find=(text,regex)=>clean(text.match(regex)?.[1]||'');
const lines=(text)=>text.split(/\r?\n/).map(clean).filter(Boolean);
const valueAfter=(text,labels)=>{
 const ls=lines(text);
 for(let i=0;i<ls.length;i++)for(const label of labels){
  const regex=new RegExp('^'+label+'(?=\\s|[:#\\-]|$)\\s*[:#\\-]?\\s*(.*)$','i');
  const m=ls[i].match(regex);
    if(m){const next=ls[i+1]||'';const nextIsLabel=/^[A-Za-z][A-Za-z /.'-]{0,35}\s*[:#]\s*\S+/.test(next);const v=clean(m[1]||(nextIsLabel?'':next)); if(v && v.length<110 && !/^(dob|date|gender|father|name|address|certificate|mark\s*sheet|report|card|invoice|passport|resume|aadhaar|pan)\s*[:\-]?$/i.test(v))return v;}
 }
 return '';
};
export function scrubAadhaar(text){return text.replace(/\b\d{4}[ \-]?\d{4}[ \-]?\d{4}\b/g,m=>'XXXX XXXX '+m.replace(/\D/g,'').slice(-4));}
export function classify(text,filename=''){
 const s=text.toLowerCase();
 if(/\binsurance certificate\b|\b(?:vehicle|motor|rc)\s+(?:insurance|policy)\b|\bpolicy schedule\b/.test(s))return 'vehicleInsurance';
 if(/\b(?:pay\s*slip|salary\s*(?:slip|statement)|earnings statement)\b/.test(s))return 'payslip';
 if(/\b(?:electricity|utility|water|gas|energy)\s+bill\b/.test(s))return 'utilityBill';
 if(/\b(?:bank|account) statement\b/.test(s))return 'bankStatement';
 if(/income tax department|permanent account number|\bpan\s*(?:card|number)\b|\bpan[- ]like(?:\s+id)?\b/.test(s))return 'pan';
 if(/aadhaar|uidai|unique identification authority|\b(?:xxxx[ -]?){2}\d{4}\b|\bresident\s+(?:id|identity)\b/.test(s))return 'aadhaar';
 if(/curriculum vitae|\bresume\b|work experience|professional experience|linkedin\.com/.test(s))return 'resume';
 if(/driving licen[cs]e|\bdl\s*(?:no|number|id)\b|\blicen[cs]e\s*(?:no|number|id)\b|\bvalid\s+(?:till|until)\b/.test(s))return 'licence';
 if(/\b(?:vehicle|motor|rc)\s+(?:insurance|policy)\b|\bmotor insurance\b|\binsurance certificate\b|\bpolicy schedule\b/.test(s))return 'vehicleInsurance';
 if(/\bvehicle registration certificate\b|\bregistration certificate\b|\brc\s+(?:book|smart card|certificate)\b/.test(s))return 'registrationCertificate';
 if(/election commission|elector photo identity|voter\s+(?:id|card|identity)|\bepic\s*(?:no|number|id)\b/.test(s))return 'voter';
 if(/\bpassport\b|republic of india.*passport/.test(s))return 'passport';
 if(/marksheet|mark sheet|university|certificate of completion|completion certificate|course completion|board of examination|degree certificate/.test(s))return 'certificate';
 if(/\binvoice\b|gstin|invoice number|tax invoice|bill\s*(?:no|number)\b/.test(s))return 'invoice';
 if(/\b(?:medical|clinical|laboratory|lab)\s+(?:report|record|test|results?)\b|\bpatient\s+(?:name|id|details)\b|\bdiagnosis\b|\bclinical impression\b/.test(s))return 'medical';
 if(/\b(?:electricity|utility|water|gas|energy)\s+bill\b|\belectricity statement\b/.test(s))return 'utilityBill';
 if(/\bbank statement\b|\baccount statement\b/.test(s))return 'bankStatement';
 if(/\b(?:payment|sales|cash|store)?\s*receipt\b/.test(s))return 'receipt';
 const file=String(filename||'').toLowerCase().replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');
 if(/\b(?:pay\s*slip|salary (?:slip|statement))\b/.test(file))return 'payslip';
 if(/\b(?:vehicle|motor|rc) insurance\b|\binsurance policy\b/.test(file))return 'vehicleInsurance';
 if(/\bregistration certificate\b|\brc (?:smart card|book|mock|sample)\b|\bvehicle rc\b/.test(file))return 'registrationCertificate';
 if(/\bpassport\b/.test(file))return 'passport';
 if(/\baadhaar\b|\bresident id\b/.test(file))return 'aadhaar';
 if(/\bpan\b/.test(file))return 'pan';
 if(/\bresume\b|\bcv\b/.test(file))return 'resume';
 if(/\bdriving licence\b|\bdriving license\b/.test(file))return 'licence';
 if(/\bvoter\b|\belection card\b/.test(file))return 'voter';
 if(/\binvoice\b/.test(file))return 'invoice';
 if(/\b(?:electricity|utility|water|gas|energy)[ _-]+bill\b/.test(file))return 'utilityBill';
 if(/\bbank[ _-]+statement\b|\baccount[ _-]+statement\b/.test(file))return 'bankStatement';
 if(/\breceipt\b/.test(file))return 'receipt';
 if(/\bmedical\b|\blab report\b/.test(file))return 'medical';
 if(/\bcertificate\b|\bmarksheet\b/.test(file))return 'certificate';
 return 'generic';
}
export function parseText(text, kind='auto',filename=''){
 const type=kind==='auto'?classify(text,filename):categories.includes(kind)?kind:'generic';
 const isCompletionCertificate=type==='certificate'&&(/course completion|completion certificate|certificate of completion/i.test(text)||/course[_ -]+completion|completion[_ -]+certificate/i.test(filename));
 const ls=lines(text);
 let fields={};
 const nm=()=>valueAfter(text,['(?:full )?name','name of (?:the )?(?:holder|candidate|student)','candidate name','applicant name','issued to','holder']);
 const dob=()=>find(text,/(?:date of birth|d\.?o\.?b\.?|birth date)\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i);
 if(type==='payslip'){
  // Ignore the standalone section heading; it is not an employee value.
  const employeeText=text.replace(/^\s*Employee\s*$/gim,'');
  fields={fullName:valueAfter(employeeText,['employee name','name of employee','employee(?!\\s+(?:code|id|number|no)\\b)','full name','name']),employer:valueAfter(text,['employer name','company name','employer','company'])||find(text,/(?:pay\s*slip|salary\s*(?:slip|statement))\s*[|:]\s*([^\r\n]+)/i),employeeCode:valueAfter(text,['employee\\s*(?:code|id|number|no\\.?)','emp\\.?\\s*(?:code|id|number|no\\.?)']),payMonth:valueAfter(text,['pay month','salary month','pay period','salary period','month']),designation:valueAfter(text,['designation','job title','position']),basicSalary:valueAfter(text,['basic salary','basic pay','basic']),allowances:valueAfter(text,['total allowances','allowances?']),deductions:valueAfter(text,['total deductions','deductions?']),grossPay:valueAfter(text,['gross salary','gross pay','gross earnings','total earnings']),netPay:valueAfter(text,['net pay','net salary','take home pay','net payable'])};
 } else if(type==='pan'){
  const panText=text.split(/\r?\n/).filter(line=>!/\bpan[- ]like(?:\s+id)?\b/i.test(line)).join('\n');
  const panLikeNumber=(text.match(/\bPAN[- ]like(?:\s+id)?\s*[:#-]?\s*([A-Z0-9-]+)/i)||[])[1]||'';
  fields={fullName:nm(),parentName:valueAfter(text,["father.?s name","mother.?s name","parent.?s name","parent name"]),dob:dob(),panNumber:(panText.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/i)||[])[0]?.toUpperCase()||panLikeNumber.toUpperCase()};
  if(!fields.fullName){const idx=ls.findIndex(x=>/permanent account number/i.test(x));if(idx>=0)fields.fullName=ls.slice(idx+1,idx+5).find(x=>/^[A-Z][A-Z .]{4,}$/.test(x)&&!/income tax|government|department/i.test(x))||'';}
 } else if(type==='aadhaar'){
  const original=text.match(/\b\d{4}[ \-]?\d{4}[ \-]?(\d{4})\b/);
  fields={fullName:nm(),dob:dob(),gender:(text.match(/\b(?:female|male|other)\b/i)||[])[0]||'',address:valueAfter(text,['address']),aadhaarLast4:original?.[1]||find(text,/(?:xxxx[ \-]?){2}([0-9]{4})/i)};
 } else if(type==='resume'){
  fields={fullName:nm()||ls.find(x=>/^[a-z]+(?:\s+[a-z]+){1,3}$/i.test(x)&&!/resume|curriculum vitae|experience|education|profile/i.test(x))||'',email:(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'',phone:(text.match(/(?:\+91[\s\-]?)?[6-9]\d{9}\b/)||[])[0]||'',location:valueAfter(text,['location','city']),skills:valueAfter(text,['(?:technical )?skills']),education:valueAfter(text,['education']),experience:valueAfter(text,['(?:work |professional )?experience']),linkedin:(text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i)||[])[0]||'',github:(text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i)||[])[0]||''};
 } else if(type==='vehicleInsurance'){
  const period=text.match(/(?:policy period|period of insurance)\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\s*(?:to|through|[-–])\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i)||[];
  fields={ownerName:valueAfter(text,['owner name','name of insured','insured name','policy holder','policyholder']),registrationNumber:valueAfter(text,['registration\\s*(?:no\\.?|number)','regn?\\.?\\s*(?:no\\.?|number)','vehicle\\s*(?:registration|regn?)\\s*(?:no\\.?|number)','vehicle number']),policyNumber:valueAfter(text,['policy\\s*(?:no\\.?|number|#)']),insurer:valueAfter(text,['insurance company','insurance provider','insurer']),vehicleMakeModel:valueAfter(text,['vehicle make and model','make and model','vehicle make','model']),vehicleClass:valueAfter(text,['vehicle class','class of vehicle']),engineNumber:valueAfter(text,['engine\\s*(?:no\\.?|number)']),chassisNumber:valueAfter(text,['chassis\\s*(?:no\\.?|number)']),policyStartDate:valueAfter(text,['policy start date','inception date','cover start date'])||period[1]||'',policyExpiryDate:valueAfter(text,['policy expiry date','policy end date','valid until','valid till','expiry date','cover end date'])||period[2]||'',insuredDeclaredValue:valueAfter(text,['insured declared value','\\bIDV\\b','sum insured']),premium:valueAfter(text,['total premium','premium amount','premium'])};
 } else if(type==='registrationCertificate'){
  fields={ownerName:valueAfter(text,['owner name','registered owner','owner']),registrationNumber:valueAfter(text,['registration\\s*(?:no\\.?|number)','regn?\\.?\\s*(?:no\\.?|number)','vehicle\\s*(?:registration|regn?)\\s*(?:no\\.?|number)','vehicle number']),registrationDate:valueAfter(text,['date of registration','registration date']),registeringAuthority:valueAfter(text,['registering authority','registration authority','rto']),manufacturer:valueAfter(text,['maker.?s name','manufacturer','vehicle make']),model:valueAfter(text,['model name','model']),vehicleClass:valueAfter(text,['class of vehicle','vehicle class']),fuelType:valueAfter(text,['fuel type','fuel']),manufactureYear:valueAfter(text,['year of manufacture','manufacturing year','mfg year']),engineNumber:valueAfter(text,['engine\\s*(?:no\\.?|number)']),chassisNumber:valueAfter(text,['chassis\\s*(?:no\\.?|number)']),color:valueAfter(text,['colour','color']),seatingCapacity:valueAfter(text,['seating capacity','seat capacity']),ownerAddress:valueAfter(text,['owner address','address'])};
 } else if(type==='utilityBill'){
  const title=text.match(/(?:electricity|utility|water|gas|energy)\s+bill\s*[|:-]\s*([^\r\n]+)/i)||[];
  fields={utilityProvider:clean(title[1]||valueAfter(text,['utility provider','electricity provider','service provider'])),customerName:valueAfter(text,['customer','consumer name','account holder','name']),accountNumber:valueAfter(text,['service\\s*(?:no\\.?|number)','account\\s*(?:no\\.?|number)','consumer\\s*(?:no\\.?|number)']),serviceAddress:valueAfter(text,['billing address','service address','supply address','address']),billMonth:valueAfter(text,['bill month','billing month','bill period']),billingPeriod:valueAfter(text,['billing period','billing cycle']),unitsConsumed:valueAfter(text,['units consumed','units used','consumption']),amountDue:valueAfter(text,['amount due','total amount due','total due','bill amount']),dueDate:valueAfter(text,['due date','payment due date']),meterNumber:valueAfter(text,['meter\\s*(?:no\\.?|number)']),previousReading:valueAfter(text,['previous reading','last reading']),currentReading:valueAfter(text,['current reading','present reading'])};
 } else if(type==='bankStatement'){
  const title=text.match(/bank\s+statement\s*[|:-]\s*([^\r\n]+)/i)||[];
  const transactions=text.match(/transactions\s*[:\-]?\s*([\s\S]*?)(?=\n(?:demo|synthetic|for software testing)|$)/i)||[];
  const closingTransaction=(transactions[1]||'').match(/closing balance\s*[|:-]?\s*((?:INR|USD|EUR|GBP|₹)?\s*-?[\d,]+(?:\.\d{1,2})?)/i)||[];
  fields={bankName:clean(title[1]||valueAfter(text,['bank name','bank'])),accountHolder:valueAfter(text,['account holder','account name','holder name']),accountNumber:valueAfter(text,['account\\s*(?:id|no\\.?|number)','account number']),statementPeriod:valueAfter(text,['statement period','statement dates','period']),ifscCode:valueAfter(text,['ifsc(?:[- ]like)?\\s*(?:code|no\\.?|number)?']),openingBalance:valueAfter(text,['opening balance','balance brought forward']),totalCredits:valueAfter(text,['total credits','total deposits','credits']),totalDebits:valueAfter(text,['total debits','total withdrawals','debits']),closingBalance:valueAfter(text,['closing balance','available balance','ending balance'])||clean(closingTransaction[1]||''),transactions:(transactions[1]||'').split(/\r?\n/).map(clean).filter(Boolean).join('\n')};
 } else if(type==='receipt'){
  const title=text.match(/(?:payment|sales|cash|store)?\s*receipt\s*[|:-]\s*([^\r\n]+)/i)||[];
  fields={receiptNumber:valueAfter(text,['receipt\\s*(?:no\\.?|number|#)']),date:valueAfter(text,['receipt date','transaction date','date']),merchant:valueAfter(text,['merchant','store','seller','vendor'])||clean(title[1]||''),itemDescription:valueAfter(text,['item description','item','product','description']),quantity:valueAfter(text,['quantity','qty']),grandTotal:valueAfter(text,['grand total','total amount','total']),paymentMethod:valueAfter(text,['payment method','paid by','payment type'])};
 } else if(type==='invoice'){
  fields={vendor:valueAfter(text,['vendor','seller','supplier','from']),invoiceNumber:valueAfter(text,['invoice\\s*(?:no\\.?|number|#)','bill\\s*(?:no\\.?|number)']),invoiceDate:valueAfter(text,['invoice date','date']),customer:valueAfter(text,['bill to','customer','buyer']),subtotal:valueAfter(text,['sub\\s*total','subtotal']),tax:valueAfter(text,['(?:gst|tax)']),total:valueAfter(text,['(?:grand )?total','amount due','balance due'])};
 } else if(type==='passport'){
  fields={fullName:nm(),passportNumber:valueAfter(text,['passport\\s*(?:no\\.?|number|#)','document\\s*(?:no\\.?|number)'])||find(text,/(?:passport\s*(?:no|number)?\s*[:#-]?\s*)([A-Z][0-9]{7})/i),dob:dob(),nationality:valueAfter(text,['nationality']),issueDate:valueAfter(text,['date of issue','issue date']),expiryDate:valueAfter(text,['date of expiry','expiry date','expiry','expires','valid until'])};
 } else if(type==='licence'){
  fields={fullName:nm(),dob:dob(),licenceNumber:valueAfter(text,['dl\\s*(?:no\\.?|number|id)','licen[cs]e\\s*(?:no\\.?|number|id)']),issueDate:valueAfter(text,['issue date','date of issue']),expiryDate:valueAfter(text,['valid till','valid until','expiry date','date of expiry']),vehicleClass:valueAfter(text,['vehicle class','class of vehicle']),address:valueAfter(text,['address'])};
 } else if(type==='voter'){
  fields={fullName:nm(),epicNumber:valueAfter(text,['epic\\s*(?:no\\.?|number|id)','voter\\s*(?:id|card|identity)(?:\\s*(?:no|number))?']),gender:valueAfter(text,['gender','sex']),dob:dob()};
 } else if(type==='certificate'){
  const title=text.match(/(?:academic )?(?:mark\s*sheet|marksheet|transcript|course completion|completion certificate|certificate of completion)\s*[|:-]\s*([^\r\n]+)/i)||[];
  fields={fullName:nm(),institution:valueAfter(text,['institution','college','university','school','academy'])||clean(title[1]||''),qualification:valueAfter(text,['degree','course(?!\\s+completion)','qualification','programme','program']),rollNumber:valueAfter(text,['roll\\s*(?:no\\.?|number)','register\\s*(?:no\\.?|number)','registration\\s*(?:no\\.?|number)']),certificateId:valueAfter(text,['certificate\\s*(?:id|no\\.?|number)']),completionDate:valueAfter(text,['completion date','date of completion','date completed']),grade:valueAfter(text,['grade','percentage','cgpa','marks'])};
 } else if(type==='medical'){
  fields={patientName:valueAfter(text,['patient name','name of patient','patient']),age:find(text,/\bage\s*[:\-]?\s*(\d{1,3}(?:\s*(?:years?|yrs?))?)/i),gender:valueAfter(text,['gender','sex']),dateOfBirth:valueAfter(text,['date of birth','birth date','dob']),reportDate:valueAfter(text,['report date','date of report','collection date','sample date','test date']),hospital:valueAfter(text,['hospital','medical center','clinic','laboratory','lab']),doctor:valueAfter(text,['doctor','physician','consultant','referred by']),diagnosis:valueAfter(text,['diagnosis','clinical impression','impression']),findings:valueAfter(text,['findings','observations','results','interpretation']),medications:valueAfter(text,['medications','medication','prescription','treatment']),recommendations:valueAfter(text,['recommendations','recommendation','advice','plan','follow-up'])};
 } else fields={fullName:nm(),email:(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'',phone:(text.match(/(?:\+91[\s\-]?)?[6-9]\d{9}\b/)||[])[0]||'',notes:''};
 if(isCompletionCertificate)delete fields.rollNumber;
 if(type==='generic')fields.notes=scrubAadhaar(String(text||'')).trim().slice(0,3000);
 for(const key of layouts[type])if(!(isCompletionCertificate&&key==='rollNumber'))fields[key]=fields[key]||'';
 const warnings=[];
 if(Object.values(fields).filter(Boolean).length<2) warnings.push('Few fields were recognized. Check the original document and edit manually.');
 const documentRequiredFields=[...requiredFields[type]];
 if(type==='certificate'&&/\bcertificate\s*(?:id|no\.?|number)\b/i.test(text))documentRequiredFields.push('certificateId');
 if(type==='certificate'&&/\b(?:completion date|date of completion|date completed)\b/i.test(text))documentRequiredFields.push('completionDate');
 const missingRequired=documentRequiredFields.filter(key=>!fields[key]);
 if(missingRequired.length){const labels=missingRequired.map(key=>key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()));warnings.push('Required fields not recognized: '+labels.join(', ')+'.');}
 if(type==='pan'&&fields.panNumber&&(!/^[A-Z]{5}\d{4}[A-Z]$/.test(fields.panNumber)||/\bpan[- ]like\b/i.test(text)))warnings.push('Review the PAN number.');
 if(type==='aadhaar')warnings.push('Aadhaar is not UIDAI-verified. Only the last four digits may be saved.');
 return {type,fields,warnings,requiredFields:documentRequiredFields};
}
