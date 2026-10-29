import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {pool} from './db.js';
const email=(process.env.ADMIN_EMAIL||'admin@campusbites.local').toLowerCase();
const password=process.env.ADMIN_PASSWORD;
if(!password||password.length<12){console.error('Set ADMIN_PASSWORD (at least 12 characters) in backend/.env first.');process.exit(1)}
try{const hash=await bcrypt.hash(password,12);await pool.execute("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'ADMIN') ON DUPLICATE KEY UPDATE name=VALUES(name),password_hash=VALUES(password_hash),role='ADMIN'",['CampusBites Admin',email,hash]);console.log(`Admin account ready: ${email}`)}catch(e){console.error('Could not create admin:',e.message);process.exitCode=1}finally{await pool.end()}
