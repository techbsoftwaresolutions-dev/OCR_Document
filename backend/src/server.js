import {randomUUID} from 'node:crypto';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {rateLimit} from 'express-rate-limit';
import {z} from 'zod';
import {db,audit} from './db.js';
import {categories,scrubAadhaar} from './parse.js';
import {analyzeDocument as parseText} from './analyze.js';
import {extract,safeText} from './ocr.js';
import {officeType,officeMimes,exportFields} from './office.js';
const app=express();const PORT=Number(process.env.PORT||5000);
const SECRET=process.env.JWT_SECRET;
if(!SECRET||SECRET.length<32)throw Error('Set JWT_SECRET (at least 32 characters) in backend/.env');
app.use(helmet());app.use(cors({origin:(process.env.CLIENT_ORIGIN||'http://localhost:5173').split(',')}));app.use(express.json({limit:'200kb'}));
app.use('/api',rateLimit({windowMs:15*60*1000,limit:250,standardHeaders:'draft-7',legacyHeaders:false}));
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const fail=(status,message)=>Object.assign(new Error(message),{status});
const ok=(res,data,status=200)=>res.status(status).json({success:true,data});
const auth=(req,res,next)=>{try{const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const payload=jwt.verify(token,SECRET);req.user=Number(payload.sub);next();}catch{next(fail(401,'Please sign in again.'));}};
const userPublic=id=>db.prepare('SELECT id,name,email,created_at FROM users WHERE id=?').get(id);
const userSchema=z.object({name:z.string().trim().min(2).max(80),email:z.string().email().max(150),password:z.string().min(8).max(100)});
app.get('/api/health',(req,res)=>ok(res,{status:'ok',service:'SmartDoc OCR API'}));
app.post('/api/auth/register',wrap(async(req,res)=>{
 const result=userSchema.safeParse(req.body);if(!result.success)throw fail(400,'Enter a valid name, email and password (8+ characters).');
 const {name,password}=result.data,email=result.data.email.toLowerCase();
 if(db.prepare('SELECT id FROM users WHERE email=?').get(email))throw fail(409,'Email already registered.');
 const record=db.prepare('INSERT INTO users(name,email,hash) VALUES(?,?,?)').run(name,email,await bcrypt.hash(password,12));
 const id=Number(record.lastInsertRowid);ok(res,{user:userPublic(id),token:jwt.sign({sub:String(id)},SECRET,{expiresIn:'12h'})},201);
}));
app.post('/api/auth/login',wrap(async(req,res)=>{
 const email=String(req.body?.email||'').trim().toLowerCase();const password=String(req.body?.password||'');
 const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(!user||!(await bcrypt.compare(password,user.hash)))throw fail(401,'Invalid email or password.');
 ok(res,{user:userPublic(user.id),token:jwt.sign({sub:String(user.id)},SECRET,{expiresIn:'12h'})});
}));
app.get('/api/auth/me',auth,(req,res)=>ok(res,userPublic(req.user)));
app.post('/api/auth/logout',auth,(req,res)=>ok(res,{message:'Delete local session token to sign out.'}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:Number(process.env.MAX_UPLOAD_MB||10)*1024*1024,files:5}});
function signature(bytes){
 if(bytes.length>=4&&bytes.subarray(0,4).toString()==='%PDF')return 'application/pdf';
 if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return 'image/webp';
 return null;
}
const uploads=new Map();let seq=0;
const originalsDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../storage/originals');
const extensionByMime={[officeMimes.docx]:'docx',[officeMimes.xlsx]:'xlsx','application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
function originalPath(id,mime){return path.join(originalsDir,`${id}.${extensionByMime[mime]||'bin'}`);}
function getDoc(req){const d=db.prepare('SELECT * FROM documents WHERE id=? AND user_id=?').get(Number(req.params.id||req.params.documentId),req.user);if(!d)throw fail(404,'Document not found.');return d;}
function expose(d){const text=d.text||'';return {...d,fields:JSON.parse(d.fields||'{}'),warnings:JSON.parse(d.warnings||'[]'),requiredFields:[],fieldLabels:parseText(text,d.category,d.filename).labels,text};}
function reparseUnreviewedDocuments(){
 const pending=db.prepare("SELECT id,text,category,filename FROM documents WHERE status='review' AND text<>''").all();
 const update=db.prepare('UPDATE documents SET category=?,fields=?,warnings=?,updated_at=CURRENT_TIMESTAMP WHERE id=?');
 for(const document of pending){const parsed=parseText(document.text,document.category==='generic'?'auto':document.category,document.filename);update.run(parsed.type,JSON.stringify(parsed.fields),JSON.stringify(parsed.warnings),document.id);}
}
reparseUnreviewedDocuments();
app.post('/api/documents/upload',auth,upload.array('files',5),wrap(async(req,res)=>{
 if(!req.files?.length)throw fail(400,'Choose at least one document.');
 const type=categories.includes(req.body.category)?req.body.category:'auto';
 const out=[]; const batchId=randomUUID();
 for(const file of req.files){
  const mime=signature(file.buffer)||await officeType(file.buffer);
  if(!mime)throw fail(415,'Unsupported or invalid file signature: '+file.originalname);
  const id=Number(db.prepare('INSERT INTO documents(user_id,filename,mime,category,upload_batch) VALUES(?,?,?,?,?)').run(req.user,file.originalname.slice(0,180),mime,type,batchId).lastInsertRowid);
    try{await fs.mkdir(originalsDir,{recursive:true});await fs.writeFile(originalPath(id,mime),file.buffer,{flag:'wx'});}catch(e){db.prepare('DELETE FROM documents WHERE id=?').run(id);throw e;}
  uploads.set(`${req.user}:${id}`,{bytes:file.buffer,at:Date.now()});out.push({id,filename:file.originalname,mime,status:'uploaded'});audit(req.user,'upload',id);
 }
 ok(res,out,201);
}));
app.post('/api/documents/:id/process',auth,wrap(async(req,res)=>{
 const d=getDoc(req);const key=`${req.user}:${d.id}`;let bytes=uploads.get(key)?.bytes;
 if(!bytes){try{bytes=await fs.readFile(originalPath(d.id,d.mime));}catch(e){if(e.code==='ENOENT')throw fail(409,'Original file is unavailable. Please upload the document again.');throw e;}}
 db.prepare("UPDATE documents SET status='processing',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(d.id);
 try{
    const result=await extract(bytes,d.mime,Number(process.env.MAX_PDF_PAGES||5));
  const parsed=parseText(result.text,d.category,d.filename);
  const sanitized=safeText(result.text);
  const fields=parsed.fields;
  db.prepare("UPDATE documents SET status='review',category=?,text=?,fields=?,warnings=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(parsed.type,sanitized,JSON.stringify(fields),JSON.stringify(parsed.warnings),d.id);
  uploads.delete(key);
  audit(req.user,'process',d.id);
  ok(res,{...expose(getDoc(req)),confidence:result.confidence});
 }catch(e){db.prepare("UPDATE documents SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(d.id);throw fail(422,'OCR could not process this file: '+e.message);}
}));
app.get('/api/documents',auth,(req,res)=>ok(res,db.prepare('SELECT id,filename,mime,category,status,created_at,updated_at,upload_batch FROM documents WHERE user_id=? ORDER BY id DESC LIMIT 300').all(req.user)));
app.get('/api/documents/:id/original',auth,wrap(async(req,res)=>{const d=getDoc(req);let bytes;try{bytes=await fs.readFile(originalPath(d.id,d.mime));}catch(e){if(e.code==='ENOENT')throw fail(404,'Original file is unavailable. Re-upload this document to view its preview.');throw e;}res.setHeader('Content-Disposition','inline');res.setHeader('Cache-Control','private, no-store');res.type(d.mime).send(bytes);}));
app.post('/api/documents/:id/export/:format',auth,wrap(async(req,res)=>{
 const d=getDoc(req);const format=req.params.format;if(!['pdf','xlsx','docx','csv','tsv','json','txt','html','xml','md'].includes(format))throw fail(400,'Choose a supported download format.');
 const fields=req.body?.fields||JSON.parse(d.fields);if(!fields||Array.isArray(fields)||typeof fields!=='object'||Object.keys(fields).length>500||Object.entries(fields).some(([k,v])=>! /^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(k)||typeof v!=='string'||v.length>3000))throw fail(400,'Invalid fields.');
 const safe=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,scrubAadhaar(v)]));
 const output=await exportFields(format,d.filename,safe,parseText(d.text,d.category,d.filename).labels);
 res.setHeader('Content-Disposition','attachment; filename="document-'+d.id+'.'+format+'"');res.type(output.mime).send(output.bytes);
}));
app.get('/api/documents/:id',auth,(req,res)=>ok(res,expose(getDoc(req))));
function updateFields(req,res){const d=getDoc(req);if(!req.body?.fields||typeof req.body.fields!=='object'||Array.isArray(req.body.fields))throw fail(400,'Provide fields object.');
 const fields={};for(const [k,v] of Object.entries(req.body.fields)){if(!/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(k)||typeof v!=='string'||v.length>3000)throw fail(400,'Invalid field value.');fields[k]=k.toLowerCase().includes('aadhaar')?String(v).replace(/\D/g,'').slice(-4):v;}
 const missing=parseText(d.text||'',d.category,d.filename).requiredFields.filter(key=>!String(fields[key]||'').trim());if(missing.length)throw fail(400,'Complete required fields: '+missing.map(key=>key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())).join(', ')+'.');
 db.prepare("UPDATE documents SET fields=?,status='reviewed',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(JSON.stringify(fields),d.id);audit(req.user,'save',d.id);ok(res,expose(getDoc(req)));
}
app.patch('/api/documents/:id',auth,wrap(updateFields));
app.get('/api/extractions/:documentId',auth,(req,res)=>ok(res,expose(getDoc(req))));
app.patch('/api/extractions/:documentId',auth,wrap(updateFields));
app.post('/api/extractions/:documentId/reprocess',auth,(req,res,next)=>next(fail(409,'Reprocessing requires uploading the original file again; raw documents are deleted after OCR.')));
app.delete('/api/documents/:id',auth,wrap(async(req,res)=>{const d=getDoc(req);uploads.delete(`${req.user}:${d.id}`);await fs.rm(originalPath(d.id,d.mime),{force:true});db.prepare('DELETE FROM documents WHERE id=?').run(d.id);audit(req.user,'delete',d.id);ok(res,{deleted:true});}));
app.get('/api/dashboard/stats',auth,(req,res)=>{
 const docs=db.prepare('SELECT category,status,created_at FROM documents WHERE user_id=?').all(req.user);
 const counts={};for(const d of docs)counts[d.category]=(counts[d.category]||0)+1;
 ok(res,{total:docs.length,processed:docs.filter(d=>['review','reviewed'].includes(d.status)).length,reviewed:docs.filter(d=>d.status==='reviewed').length,failed:docs.filter(d=>d.status==='failed').length,byType:counts});
});
const profileSchema=z.object({name:z.string().min(1).max(100).optional(),fields:z.record(z.string().max(3000)).optional()});
function getProfile(req){const p=db.prepare('SELECT * FROM profiles WHERE id=? AND user_id=?').get(Number(req.params.id),req.user);if(!p)throw fail(404,'Profile not found.');return p;}
function exposeProfile(p){return {...p,fields:JSON.parse(p.fields),sources:JSON.parse(p.sources)};}
app.post('/api/profiles',auth,(req,res)=>{const p=profileSchema.safeParse(req.body);if(!p.success)throw fail(400,'Invalid profile.');const id=Number(db.prepare('INSERT INTO profiles(user_id,name,fields) VALUES(?,?,?)').run(req.user,p.data.name||'New applicant',JSON.stringify(p.data.fields||{})).lastInsertRowid);ok(res,exposeProfile(db.prepare('SELECT * FROM profiles WHERE id=?').get(id)),201);});
app.get('/api/profiles',auth,(req,res)=>ok(res,db.prepare('SELECT id,name,created_at FROM profiles WHERE user_id=? ORDER BY id DESC').all(req.user)));
app.get('/api/profiles/:id',auth,(req,res)=>ok(res,exposeProfile(getProfile(req))));
app.patch('/api/profiles/:id',auth,(req,res)=>{const p=getProfile(req);const v=profileSchema.safeParse(req.body);if(!v.success)throw fail(400,'Invalid profile.');const fields=v.data.fields||JSON.parse(p.fields);if(fields.aadhaarLast4)fields.aadhaarLast4=fields.aadhaarLast4.replace(/\D/g,'').slice(-4);db.prepare('UPDATE profiles SET name=?,fields=? WHERE id=?').run(v.data.name||p.name,JSON.stringify(fields),p.id);ok(res,exposeProfile(getProfile(req)));});
app.post('/api/profiles/:id/merge-documents',auth,(req,res)=>{
 const p=getProfile(req);const ids=req.body?.documentIds;
 if(!Array.isArray(ids)||ids.length>20||ids.some(x=>!Number.isInteger(x)))throw fail(400,'Provide documentIds array.');
 const combined={...JSON.parse(p.fields)},sources={...JSON.parse(p.sources)},conflicts=[];
 for(const id of ids){const d=db.prepare('SELECT * FROM documents WHERE id=? AND user_id=?').get(id,req.user);if(!d)throw fail(404,'One or more documents not found.');
  for(const [k,v] of Object.entries(JSON.parse(d.fields))){if(!v)continue;const candidate=k==='aadhaarLast4'?String(v).slice(-4):String(v);
   if(combined[k]&&combined[k]!==candidate){conflicts.push({field:k,current:combined[k],incoming:candidate,documentId:id});continue;}
   combined[k]=candidate;sources[k]=id;
  }
 }
 db.prepare('UPDATE profiles SET fields=?,sources=? WHERE id=?').run(JSON.stringify(combined),JSON.stringify(sources),p.id);
 ok(res,{profile:exposeProfile(getProfile(req)),conflicts});
});
function exportProfile(req,res,format){const p=exposeProfile(getProfile(req));const fields={...p.fields};if(fields.aadhaarLast4)fields.aadhaarLast4=String(fields.aadhaarLast4).slice(-4);
 res.setHeader('Content-Disposition',`attachment; filename="profile-${p.id}.${format}"`);
 if(format==='json'){res.type('json').send(JSON.stringify({name:p.name,fields,sources:p.sources},null,2));return;}
 const csvCell=s=>'"'+String(s??'').replace(/^[=+\-@]/,"'$&").replace(/"/g,'""')+'"';res.type('text/csv').send('Field,Value,Document ID\r\n'+Object.entries(fields).map(([k,v])=>[k,v,p.sources[k]||''].map(csvCell).join(',')).join('\r\n'));
}
app.get('/api/profiles/:id/export/json',auth,(req,res)=>exportProfile(req,res,'json'));
app.get('/api/profiles/:id/export/csv',auth,(req,res)=>exportProfile(req,res,'csv'));
app.use((err,req,res,next)=>{const status=err.status||(err.code==='LIMIT_FILE_SIZE'?413:500);if(status>=500)console.error(err.name,err.message);res.status(status).json({success:false,error:{message:status>=500?'Unexpected server error.':err.message}});});
app.listen(PORT,()=>console.log(`SmartDoc API → http://localhost:${PORT}`));
