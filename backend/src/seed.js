import { db } from './db.js';
import bcrypt from 'bcryptjs';
const email='demo@smartdoc.local';
const password='Demo@12345';
if(!db.prepare('SELECT id FROM users WHERE email=?').get(email)){
  db.prepare('INSERT INTO users(name,email,hash) VALUES(?,?,?)').run('Demo User',email,await bcrypt.hash(password,12));
  console.log('Created demo account:',email);
} else console.log('Demo account already exists.');
console.log('Demo password:',password);
db.close();
