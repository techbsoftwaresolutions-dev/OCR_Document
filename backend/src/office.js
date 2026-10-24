import JSZip from 'jszip';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import {Document,Paragraph,TextRun,Packer} from 'docx';
import PDFDocument from 'pdfkit';

export const officeMimes={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
export async function officeType(bytes){
 if(bytes.subarray(0,2).toString()!=='PK')return null;
 const zip=await JSZip.loadAsync(bytes);
 const entries=Object.values(zip.files);
 if(entries.length>10000||entries.reduce((sum,file)=>sum+(file._data?.uncompressedSize||0),0)>50*1024*1024)throw Error('Office document is too large when expanded.');
 if(!zip.file('[Content_Types].xml'))return null;
 if(zip.file('word/document.xml'))return officeMimes.docx;
 if(zip.file('xl/workbook.xml'))return officeMimes.xlsx;
 return null;
}
export async function extractOffice(bytes,mime){
 if(mime===officeMimes.docx){
  const {value}=await mammoth.convertToHtml({buffer:bytes});
  // Convert Word table cells to columns, paragraphs to lines; never render imported HTML.
  const text=value.replace(/<td[^>]*>([\s\S]*?)<\/td>/g,(_,cell)=>'<td>'+cell.replace(/<\/p>/g,' ').trim()+'</td>').replace(/<\/t[dh]>\s*<t[dh][^>]*>/g,'  ').replace(/<\/(?:p|tr|h[1-6])>/g,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
  return {text,confidence:null};
 }
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);
 const lines=[];let count=0;
 workbook.eachSheet(sheet=>{lines.push(sheet.name);sheet.eachRow(row=>{
  if(++count>10000)throw Error('Workbook exceeds 10,000 rows.');
  const cells=[];row.eachCell({includeEmpty:true},cell=>cells.push(cell.text.replace(/\r?\n/g,' ')));
  lines.push(cells.join('  '));
 });lines.push('');});
 return {text:lines.join('\n'),confidence:null};
}
export async function exportFields(format,title,fields,labels={}){
 const rows=Object.entries(fields).map(([key,value])=>[labels[key]||key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()),String(value)]);
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const asText=(text,mime)=>({bytes:Buffer.from(text,'utf8'),mime});
 if(format==='json')return asText(JSON.stringify({title,fields:rows.map(([label,value])=>({label,value}))},null,2),'application/json');
 if(format==='txt')return asText(title+'\n\n'+rows.map(([label,value])=>label+': '+value).join('\n\n'),'text/plain; charset=utf-8');
 if(format==='csv'||format==='tsv'){
  const delimiter=format==='csv'?',':'\t';
  const cell=value=>'"'+String(value).replace(/^[\s]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
  return asText('\uFEFF'+[['Field','Value'],...rows].map(row=>row.map(cell).join(delimiter)).join('\r\n'),format==='csv'?'text/csv; charset=utf-8':'text/tab-separated-values; charset=utf-8');
 }
 if(format==='xml')return asText('<?xml version="1.0" encoding="UTF-8"?>\n<document><title>'+escape(title)+'</title>'+rows.map(([label,value])=>'<field><label>'+escape(label)+'</label><value>'+escape(value)+'</value></field>').join('')+'</document>','application/xml');
 if(format==='html')return asText('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+escape(title)+'</title><style>body{font:16px Arial;max-width:900px;margin:40px auto;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:12px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>'+escape(title)+'</h1><table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>'+rows.map(([label,value])=>'<tr><th>'+escape(label)+'</th><td>'+escape(value)+'</td></tr>').join('')+'</tbody></table></body></html>','text/html; charset=utf-8');
 if(format==='md'){
  const markdown=value=>escape(value).replace(/[\\`*_{}\[\]()#+.!|~-]/g,'\\$&').replace(/\r?\n/g,'<br>');
  return asText('# '+markdown(title)+'\n\n| Field | Value |\n| --- | --- |\n'+rows.map(([label,value])=>'| '+markdown(label)+' | '+markdown(value)+' |').join('\n'),'text/markdown; charset=utf-8');
 }
 if(format==='xlsx'){
  const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Extracted details');sheet.columns=[{header:'Field',key:'field',width:32},{header:'Value',key:'value',width:70}];
  for(const [field,value] of rows)sheet.addRow({field,value});sheet.getRow(1).font={bold:true};sheet.eachRow(row=>{row.alignment={vertical:'top',wrapText:true};});
  return {bytes:Buffer.from(await book.xlsx.writeBuffer()),mime:officeMimes.xlsx};
 }
 if(format==='docx'){
  const doc=new Document({sections:[{children:[new Paragraph({text:title,heading:'Title'}),...rows.map(([label,value])=>new Paragraph({children:[new TextRun({text:label+': ',bold:true}),...value.split('\n').map((line,i)=>new TextRun({text:line,break:i?1:0}))],spacing:{after:160}}))]}]});
  return {bytes:await Packer.toBuffer(doc),mime:officeMimes.docx};
 }
 if(format==='pdf'){
  const pdf=new PDFDocument({size:'A4',margin:48});const chunks=[];
  const done=new Promise((resolve,reject)=>{pdf.on('data',chunk=>chunks.push(chunk));pdf.on('end',()=>resolve(Buffer.concat(chunks)));pdf.on('error',reject);});
  pdf.fontSize(18).text(title).moveDown();
  for(const [label,value] of rows){pdf.font('Helvetica-Bold').fontSize(11).text(label);pdf.font('Helvetica').text(value||'—').moveDown();}
  pdf.end();return {bytes:await done,mime:'application/pdf'};
 }
 throw Error('Unsupported export format.');
}
