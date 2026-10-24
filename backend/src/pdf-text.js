// Keep visible column gaps so field discovery can distinguish labels and tables.
export async function renderStructuredPage(page){
 const {items}=await page.getTextContent({normalizeWhitespace:false});
 const lines=[];
 for(const item of items){
  if(!item.str?.trim())continue;
  const x=item.transform[4],y=item.transform[5];
  let line=lines.find(row=>Math.abs(row.y-y)<2);
  if(!line){line={y,items:[]};lines.push(line);}
  line.items.push({x,text:item.str,width:item.width||0,height:Math.abs(item.transform[3])||10});
 }
 return lines.sort((a,b)=>b.y-a.y).map(line=>{
  let text='',previous;
  for(const item of line.items.sort((a,b)=>a.x-b.x)){
   if(previous){const gap=item.x-(previous.x+previous.width);text+=gap>Math.max(8,item.height)?'  ':gap>1?' ':'';}
   text+=item.text;previous=item;
  }
  return text;
 }).join('\n');
}
