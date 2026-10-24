import test from 'node:test';
import assert from 'node:assert/strict';
import {renderStructuredPage} from './pdf-text.js';
import {analyzeDocument} from './analyze.js';
test('PDF columns retain structure even if text items arrive out of reading order',async()=>{
 const item=(str,x,y,width=50)=>({str,transform:[10,0,0,10,x,y],width});
 const text=await renderStructuredPage({getTextContent:async()=>({items:[item('95',200,80),item('Subject',20,100),item('Physics',20,80),item('Score',200,100)]})});
 assert.equal(text,'Subject  Score\nPhysics  95');
 assert.equal(analyzeDocument(text).fields.physicsScore,'95');
});
