import test from 'node:test';
import assert from 'node:assert/strict';
import {exportFields,officeType,extractOffice,officeMimes} from './office.js';
import pdfParse from 'pdf-parse';
test('Word and Excel exports are genuine files that can be imported with field order and values intact',async()=>{
 for(const format of ['docx','xlsx']){
  const output=await exportFields(format,'Test details',{fitnessNumber:'FIT-42',registrationNumber:'REG-10'},{fitnessNumber:'Fitness Number',registrationNumber:'Registration Number'});
  assert.equal(await officeType(output.bytes),officeMimes[format]);
  const imported=await extractOffice(output.bytes,output.mime);
  assert.ok(imported.text.includes('FIT-42'));assert.ok(imported.text.includes('REG-10'));
  assert.ok(imported.text.indexOf('Fitness Number')<imported.text.indexOf('Registration Number'));
 }
});
test('PDF export contains labels and multiline values',async()=>{
 const output=await exportFields('pdf','Test details',{address:'First line\nSecond line'});
 assert.equal(output.bytes.subarray(0,4).toString(),'%PDF');
 const result=await pdfParse(new Uint8Array(output.bytes));assert.match(result.text,/First line/);assert.match(result.text,/Second line/);
});
test('Arbitrary bytes are not identified as Office documents',async()=>assert.equal(await officeType(Buffer.from('not office')),null));
test('Additional download formats preserve text and escape markup and spreadsheet formulas',async()=>{
 const fields={name:'A & B',notes:'<script>alert(1)</script>\nSecond line',amount:'=1+1'};
 for(const format of ['csv','tsv','json','txt','html','xml','md']){
  const {bytes,mime}=await exportFields(format,'Details',fields);const text=bytes.toString('utf8');assert.ok(mime);assert.match(text,/Second line/);
  if(format==='json')assert.deepEqual(JSON.parse(text).fields.map(row=>row.value),Object.values(fields));
  if(['html','xml','md'].includes(format)){assert.ok(!text.includes('<script>'));assert.ok(text.includes('&amp;'));}
  if(['csv','tsv'].includes(format))assert.ok(text.includes("'=1+1"));
 }
});
