import jwt from 'jsonwebtoken';
export function auth(req,res,next){const header=req.headers.authorization||'';const token=header.startsWith('Bearer ')?header.slice(7):'';if(!token)return res.status(401).json({error:'Please sign in first.'});try{req.user=jwt.verify(token,process.env.JWT_SECRET);next()}catch{return res.status(401).json({error:'Session expired. Please sign in again.'})}}
export function adminOnly(req,res,next){if(req.user?.role!=='ADMIN')return res.status(403).json({error:'Admin access required.'});next()}
