// Discover structure without requiring a document category or predefined schema.
const validLabel=value=>/^[\p{L}][\p{L}\p{N} ()/.'&%_*+-]{0,70}$/u.test(value)&&value.split(/\s+/).length<=9;
const cells=row=>row.split(/\s*\|\s*|\t+| {2,}/).map(value=>value.trim()).filter(Boolean);
export function discoverFields(source, knownLabels=[]){
 const rows=source.split(/\r?\n/).map(row=>row.trim()).filter(Boolean);
 const escaped=knownLabels.map(label=>label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const known=escaped?new RegExp('^('+escaped+')(?:\\s+|$)(.*)$','i'):null;
 const standalone = row => !/^(?:demo|sample|test)[ -]/i.test(row) && validLabel(row) && /(?:voter|epic|constituency|state|district|city|country|pincode|holder|class|name|dob|gender|number|no|id|code|registration|date|address|amount|balance|reference|status|period|department|occupation|nationality|qualification|group|result|marks|plaza|debit|credit)(?:\s+(?:inr|usd|eur))?$/i.test(row);
 function pair(row){
  const testId=row.match(/^test[ _-]*id\b\s*(?::|=|#|-)?\s*(.*)$/i);
  if(testId)return ['Test ID',testId[1].trim()];
  if(standalone(row))return [row,''];
  const explicit=row.match(/^(.{1,71}?)\s*(?::|=|\s[–—-]\s)\s*(.*)$/u);
  if(explicit&&validLabel(explicit[1].trim()))return [explicit[1].trim(),explicit[2].trim()];
  const columns=cells(row);
  if(columns.length===2&&validLabel(columns[0]))return columns;
  const match=known&&row.match(known);
  if(match)return [match[1],match[2].trim()];
  // OCR often collapses a label/value column gap to one space. Recognize
  // structural label endings independently of the document's category.
  const inferred=row.match(/^(.{1,55}?\b(?:number|no\.?|id|code|name|registration|type|from|until|date|address|amount|balance|status|period|department|occupation|nationality|qualification|group|result|marks|score|total|quantity|weight|height|reference|description|purpose|duration|location))\s+(.+)$/i);
  if(inferred&&validLabel(inferred[1]))return [inferred[1],inferred[2].trim()];
  return null;
 }
 const result=[];
 for(let i=0;i<rows.length;i++){
  const row=rows[i];if(!row)continue;
  const header=cells(row);
  // Repeated column structure identifies a table, including unfamiliar subjects/tests.
  const columnHeading=value=>/^(?:score|marks?|maximum|minimum|max|min|result|value|units?|reference(?: range)?|quantity|qty|price|amount|total|grade|credits?|description|date|balance)$/i.test(value);
  if(header.length>=2&&header.every(validLabel)&&header.slice(1).every(columnHeading)&&cells(rows[i+1]||'').length===header.length){
   const table=[];
   let end=i+1;
   while(end<rows.length&&cells(rows[end]).length===header.length){table.push(cells(rows[end]));end++;}
   if(table.length&&table.some(values=>values.some(value=>/\d/.test(value)))){
    for(const values of table){
     for(let col=1;col<header.length;col++)result.push({label:values[0]+' '+header[col],value:values[col],table:true});
    }
    i=end-1;continue;
   }
  }
  let entry=pair(row);
  // Unfamiliar uppercase form labels followed by mixed-case or numeric values.
  if(!entry && validLabel(row) && /^[A-Z][A-Z &/()_-]{1,49}$/.test(row) && rows[i+1] && !pair(rows[i+1]) && !/^[A-Z &/()_-]+$/.test(rows[i+1])) entry=[row,''];
  // A standalone short label followed by a value is common in PDF forms.
  if(!entry&&i>0&&validLabel(row)&&rows[i+1]&&!pair(rows[i+1])&&
    /(?:name|number|code|date|address|amount|balance|reference|status|period|department|occupation|nationality|qualification|group|result|marks)$/i.test(row))entry=[row,''];
  if(!entry)continue;
  const [label,initial]=entry;
  if(/^(?:https?|fictional|synthetic|disclaimer|demo only|front|back)\b|not an official|for software/i.test(label))continue;
  const parts=initial?[initial]:[];
  let end=i+1;
  while(end<rows.length&&rows[end]&&!pair(rows[end])&&cells(rows[end]).length<2){
   // Keep continuation lines for explicit labels; stop at short section headings.
   if(parts.length&&(/^[A-Z\s&]{3,}$/.test(rows[end])||/^(?:Employee|Student|Charges|Transactions|Earnings & Deductions)$/i.test(rows[end])))break;
   if(!/[:=]/.test(row)&&parts.length)break;
   parts.push(rows[end]);end++;
  }
  if(parts.length)result.push({label,value:parts.join('\n')});i=end-1;
 }
 return result;
}
