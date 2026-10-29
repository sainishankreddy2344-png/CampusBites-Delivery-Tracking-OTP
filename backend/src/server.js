import 'dotenv/config';
import express from 'express';import cors from 'cors';import bcrypt from 'bcryptjs';import jwt from 'jsonwebtoken';
import {pool} from './db.js';import {auth,adminOnly} from './auth.js';
const app=express();app.use(cors({origin:process.env.FRONTEND_ORIGIN||'http://localhost:5173'}));app.use(express.json());
const catalog=[{id:1,name:'Mysore Masala Dosa',category:'Breakfast',price:75},{id:2,name:'Classic Idli Vada (2+1)',category:'Breakfast',price:55},{id:3,name:'Hyderabadi Veg Biryani',category:'Meals',price:120},{id:4,name:'Paneer Tikka Wrap',category:'Snacks',price:95},{id:5,name:'Chicken Dum Biryani',category:'Meals',price:145},{id:6,name:'Chocolate Thick Shake',category:'Beverages',price:80},{id:7,name:'Crispy French Fries',category:'Snacks',price:65},{id:8,name:'South Indian Meals',category:'Meals',price:110},{id:9,name:'Cold Coffee',category:'Beverages',price:70}];
const safeUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role});
function issueToken(u){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw new Error('Set JWT_SECRET to a random secret of at least 32 characters in backend/.env');return jwt.sign({id:u.id,email:u.email,role:u.role,name:u.name},process.env.JWT_SECRET,{expiresIn:'12h'})}
app.get('/api/health',async(_req,res)=>{try{await pool.query('SELECT 1');res.json({status:'ok',database:'connected'})}catch{res.status(503).json({status:'error',database:'unavailable'})}});
app.get('/api/menu',async(_req,res)=>{try{const [rows]=await pool.query('SELECT id,name,category,price,available FROM menu_items WHERE available=1 ORDER BY id');res.json(rows)}catch{res.json(catalog.map(x=>({...x,available:1})))} });
app.post('/api/auth/register',async(req,res)=>{const {name,email,password}=req.body||{};if(!name?.trim()||!email||!/^\S+@\S+\.\S+$/.test(email)||!password||password.length<8)return res.status(400).json({error:'Enter a name, valid email and password with at least 8 characters.'});try{const hash=await bcrypt.hash(password,12);const [r]=await pool.execute("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'STUDENT')",[name.trim(),email.toLowerCase(),hash]);const u={id:r.insertId,name:name.trim(),email:email.toLowerCase(),role:'STUDENT'};res.status(201).json({user:safeUser(u),token:issueToken(u)})}catch(e){res.status(e.code==='ER_DUP_ENTRY'?409:500).json({error:e.code==='ER_DUP_ENTRY'?'That email is already registered.':'Could not create account.'})}});
app.post('/api/auth/login',async(req,res)=>{const {email,password}=req.body||{};try{const [rows]=await pool.execute('SELECT * FROM users WHERE email=? LIMIT 1',[(email||'').toLowerCase()]);const u=rows[0];if(!u||u.role!=='STUDENT'||!await bcrypt.compare(password||'',u.password_hash))return res.status(401).json({error:'Invalid student email or password.'});res.json({user:safeUser(u),token:issueToken(u)})}catch(e){res.status(500).json({error:e.message.includes('JWT_SECRET')?e.message:'Could not sign in. Check database setup.'})}});
app.post('/api/auth/admin/login',async(req,res)=>{const {email,password}=req.body||{};try{const [rows]=await pool.execute("SELECT * FROM users WHERE email=? AND role='ADMIN' LIMIT 1",[(email||'').toLowerCase()]);const u=rows[0];if(!u||!await bcrypt.compare(password||'',u.password_hash))return res.status(401).json({error:'Invalid admin credentials.'});res.json({user:safeUser(u),token:issueToken(u)})}catch(e){res.status(500).json({error:e.message.includes('JWT_SECRET')?e.message:'Could not sign in. Check database setup.'})}});
app.get('/api/orders/my',auth,async(req,res)=>{try{const [rows]=await pool.execute('SELECT id,status,total_amount,fulfillment,delivery_address,delivery_phone,delivery_otp_expires,created_at,delivered_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 50',[req.user.id]);res.json(rows.map(o=>({...o,otp_pending:o.status==='OUT_FOR_DELIVERY'&&!!o.delivery_otp_expires} )))}catch{res.status(500).json({error:'Could not load orders. Run database/migration_delivery_tracking.sql first.'})}});
app.post('/api/orders',auth,async(req,res)=>{const {items,fulfillment='Delivery',deliveryAddress='',deliveryPhone=''}=req.body||{};if(!Array.isArray(items)||!items.length)return res.status(400).json({error:'Cart is empty.'});if(fulfillment==='Delivery'&&(!deliveryAddress.trim()||deliveryAddress.trim().length<8||!/^\+?[0-9]{10,15}$/.test(String(deliveryPhone).replace(/[\s-]/g,''))))return res.status(400).json({error:'Enter a full delivery address and a valid 10–15 digit mobile number.'});const conn=await pool.getConnection();try{await conn.beginTransaction();let total=0;const clean=[];for(const i of items){const item=catalog.find(x=>x.id===Number(i.id));const qty=Math.floor(Number(i.quantity));if(!item||!Number.isInteger(qty)||qty<1||qty>50)throw new Error('Invalid menu item or quantity.');total+=item.price*qty;clean.push({...item,quantity:qty})}const [o]=await conn.execute('INSERT INTO orders(user_id,status,total_amount,fulfillment,delivery_address,delivery_phone) VALUES(?,?,?,?,?,?)',[req.user.id,'PLACED',total,fulfillment,fulfillment==='Delivery'?deliveryAddress.trim():null,fulfillment==='Delivery'?String(deliveryPhone).replace(/[\s-]/g,''):null]);for(const i of clean)await conn.execute('INSERT INTO order_items(order_id,menu_item_id,item_name,quantity,unit_price) VALUES(?,?,?,?,?)',[o.insertId,i.id,i.name,i.quantity,i.price]);await conn.commit();res.status(201).json({order:{id:o.insertId,totalAmount:total,status:'PLACED'},message:'Order placed successfully. Track status in My Orders.'})}catch(e){await conn.rollback();res.status(400).json({error:e.message||'Could not place order.'})}finally{conn.release()}});
app.get('/api/admin/dashboard',auth,adminOnly,async(_req,res)=>{try{const [[stats]]=await pool.query("SELECT (SELECT COUNT(*) FROM users WHERE role='STUDENT') AS students,(SELECT COUNT(*) FROM orders) AS orders,(SELECT COALESCE(SUM(total_amount),0) FROM orders) AS revenue");const [orders]=await pool.query('SELECT id,user_id,status,total_amount,fulfillment,delivery_address,delivery_phone,created_at FROM orders ORDER BY id DESC LIMIT 100');const [menu]=await pool.query('SELECT id,name,category,price,available FROM menu_items ORDER BY id');res.json({stats,orders,menu})}catch{res.status(500).json({error:'Could not load admin dashboard.'})}});
async function sendDeliveryOtp(phone, otp, orderId){
 const sid=process.env.TWILIO_ACCOUNT_SID, token=process.env.TWILIO_AUTH_TOKEN, from=process.env.TWILIO_FROM_NUMBER;
 if(sid&&token&&from){
  const body=new URLSearchParams({To:phone,From:from,Body:`CampusBites: OTP ${otp} confirms delivery for order #${orderId}. Do not share it until you receive your order.`});
  const authHeader='Basic '+Buffer.from(`${sid}:${token}`).toString('base64');
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,{method:'POST',headers:{Authorization:authHeader,'Content-Type':'application/x-www-form-urlencoded'},body});
  if(!response.ok)throw new Error('SMS provider failed to send the delivery OTP.');
  return 'sms';
 }
 console.log(`[DEMO DELIVERY OTP] Order #${orderId} to ${phone}: ${otp} (configure Twilio in backend/.env for real SMS)`);
 return 'demo';
}
app.patch('/api/admin/orders/:id',auth,adminOnly,async(req,res)=>{
 const allowed=['PLACED','PREPARING','ALMOST_DONE','OUT_FOR_DELIVERY','CANCELLED'];
 if(!allowed.includes(req.body.status))return res.status(400).json({error:'Choose a valid status. Delivery is completed only after OTP verification.'});
 try{
  const [rows]=await pool.execute('SELECT id,status,fulfillment,delivery_phone FROM orders WHERE id=?',[req.params.id]);
  const order=rows[0];if(!order)return res.status(404).json({error:'Order not found.'});
  if(req.body.status==='OUT_FOR_DELIVERY'){
   if(order.fulfillment!=='Delivery'||!order.delivery_phone)return res.status(400).json({error:'This order has no delivery mobile number. It cannot use delivery OTP.'});
   const otp=String(Math.floor(100000+Math.random()*900000));
   const hash=await bcrypt.hash(otp,10);const expires=new Date(Date.now()+10*60*1000);
   await pool.execute('UPDATE orders SET status=?,delivery_otp_hash=?,delivery_otp_expires=?,delivery_otp_attempts=0 WHERE id=?',['OUT_FOR_DELIVERY',hash,expires,req.params.id]);
   const mode=await sendDeliveryOtp(order.delivery_phone,otp,order.id);
   return res.json({message:mode==='sms'?'Order is out for delivery. OTP sent to customer mobile.':'Order is out for delivery. Demo OTP is logged in the backend terminal; configure Twilio for SMS.',demoOtp:mode==='demo'&&process.env.NODE_ENV!=='production'?otp:undefined});
  }
  await pool.execute('UPDATE orders SET status=? WHERE id=?',[req.body.status,req.params.id]);
  res.json({message:'Order status updated.'});
 }catch(e){res.status(500).json({error:e.message||'Could not update order.'})}
});
app.post('/api/orders/:id/confirm-delivery',auth,async(req,res)=>{
 const otp=String(req.body?.otp||'').trim();if(!/^\d{6}$/.test(otp))return res.status(400).json({error:'Enter the 6-digit delivery OTP.'});
 try{
  const [rows]=await pool.execute('SELECT id,status,delivery_otp_hash,delivery_otp_expires,delivery_otp_attempts FROM orders WHERE id=? AND user_id=?',[req.params.id,req.user.id]);
  const o=rows[0];if(!o)return res.status(404).json({error:'Order not found.'});if(o.status!=='OUT_FOR_DELIVERY'||!o.delivery_otp_hash)return res.status(400).json({error:'Delivery OTP is not active for this order yet.'});
  if(!o.delivery_otp_expires||new Date(o.delivery_otp_expires).getTime()<Date.now())return res.status(400).json({error:'OTP expired. Ask the admin to resend/set order out for delivery again.'});
  if(Number(o.delivery_otp_attempts)>=5)return res.status(429).json({error:'Too many incorrect attempts. Contact the canteen admin.'});
  if(!await bcrypt.compare(otp,o.delivery_otp_hash)){await pool.execute('UPDATE orders SET delivery_otp_attempts=delivery_otp_attempts+1 WHERE id=?',[o.id]);return res.status(400).json({error:'Incorrect OTP. Try again.'})}
  await pool.execute("UPDATE orders SET status='DELIVERED',delivered_at=NOW(),delivery_otp_hash=NULL,delivery_otp_expires=NULL WHERE id=?",[o.id]);res.json({message:'Delivery confirmed successfully. Thank you!'});
 }catch{res.status(500).json({error:'Could not confirm delivery. Check database migration.'})}
});
app.post('/api/admin/menu',auth,adminOnly,async(req,res)=>{const {name,category,price}=req.body||{};if(!name||!category||!Number.isFinite(Number(price))||Number(price)<=0)return res.status(400).json({error:'Enter valid item details.'});try{const [r]=await pool.execute('INSERT INTO menu_items(name,category,price,available) VALUES(?,?,?,1)',[name,category,Number(price)]);res.status(201).json({id:r.insertId,name,category,price:Number(price),available:1})}catch{res.status(500).json({error:'Could not add menu item.'})}});
app.patch('/api/admin/menu/:id',auth,adminOnly,async(req,res)=>{try{const [r]=await pool.execute('UPDATE menu_items SET available=? WHERE id=?',[req.body.available?1:0,req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Menu item not found.'});res.json({message:'Availability updated.'})}catch{res.status(500).json({error:'Could not update menu.'})}});
const port=Number(process.env.PORT||5000);app.listen(port,()=>console.log(`CampusBites API running at http://localhost:${port}`));
