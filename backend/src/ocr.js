import {officeMimes,extractOffice} from './office.js';
import sharp from 'sharp';
import {createWorker} from 'tesseract.js';
import pdfParse from 'pdf-parse';
import {pdf} from 'pdf-to-img';
import {scrubAadhaar} from './parse.js';
import {renderStructuredPage} from './pdf-text.js';
let sharedWorker; let queue=Promise.resolve();
function serialized(work){const result=queue.then(work);queue=result.catch(()=>{});return result;}
async function worker(){if(!sharedWorker){sharedWorker=await createWorker('eng');await sharedWorker.setParameters({preserve_interword_spaces:'1'});}return sharedWorker;}
async function ocrImage(bytes){
 const processed=await sharp(bytes,{limitInputPixels:30_000_000}).rotate().resize({width:1800,withoutEnlargement:true}).normalize().sharpen().png().toBuffer();
 const result=await (await worker()).recognize(processed);
 return {text:result.data.text,confidence:Math.round(result.data.confidence)};
}
export async function extract(bytes,mime,maxPages=5){
 return serialized(async()=>{
  if(Object.values(officeMimes).includes(mime))return extractOffice(bytes,mime);
  if(mime!=='application/pdf')return ocrImage(bytes);
  let text='';
  try{const parsed=await pdfParse(new Uint8Array(bytes),{max:maxPages,pagerender:renderStructuredPage});text=parsed.text||'';}catch{/* PDF may be scanned */}
  if(text.trim().length>35)return {text,confidence:null};
  const pieces=[];const confidences=[];
  try{
   const pages=await pdf(bytes,{scale:1.4});let count=0;
   for await(const png of pages){if(count++>=maxPages)break;const result=await ocrImage(png);pieces.push(result.text);confidences.push(result.confidence);}
  }catch(e){throw Error('Unable to render scanned PDF: '+e.message);}
  return {text:pieces.join('\n\n'),confidence:confidences.length?Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length):null};
 });
}
export function safeText(t){return scrubAadhaar(String(t||'')).slice(0,60000);}
