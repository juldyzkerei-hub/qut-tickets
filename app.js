const SUPABASE_URL='https://bsdbkzopylzghywassii.supabase.co';
const SUPABASE_KEY='sb_publishable_Sktu6sRdYMzw0GepkcyJWg_PRwAqcfg';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const events=window.QUT_EVENTS;
const caps={1:6,2:6,3:6,4:4,5:4,6:6,7:4,8:6,9:4,10:4,11:4,12:4,13:6,14:6,15:6,16:6,17:6,18:6,19:6,20:6,21:6,22:6,23:6};
const pos=[[1,11,20],[2,61,26],[3,11,31],[4,21,31],[5,32,33],[6,11,42],[7,21,42],[8,11,53],[9,21,53],[10,32,48],[11,43,53],[12,51,53],[13,62,52],[14,13,67],[15,25,67],[16,38,67],[17,51,67],[18,64,67],[19,13,82],[20,25,82],[21,38,82],[22,51,82],[23,64,82]];
let active=events[0],selected=new Set(),statuses=new Map(),hold=null,timer=null;
const money=n=>new Intl.NumberFormat('kk-KZ').format(n)+' ₸';
const code=(t,s)=>t+'-'+s;
function seatObj(c){const [t,s]=c.split('-').map(Number);return {table_no:t,seat_no:s}}
function renderMap(){
 const map=document.getElementById('hallMap');
 map.querySelectorAll('.table-pin').forEach(x=>x.remove());
 pos.forEach(([t,x,y])=>{
  const b=document.createElement('button');
  b.className='table-pin '+(caps[t]===4?'four':'');
  b.style.left=x+'%';b.style.top=y+'%';
  b.innerHTML=t+'<small>'+caps[t]+' орын</small>';
  b.onclick=()=>document.getElementById('table-'+t)?.scrollIntoView({behavior:'smooth',block:'center'});
  map.appendChild(b);
 });
}
function renderTables(){
 const root=document.getElementById('tables');root.innerHTML='';
 for(let t=1;t<=23;t++){
  const box=document.createElement('div');box.className='table';box.id='table-'+t;
  box.innerHTML='<h4>'+t+'-үстел · '+caps[t]+' орын</h4>';
  const sr=document.createElement('div');sr.className='seats';
  for(let s=1;s<=caps[t];s++){
   const c=code(t,s),st=statuses.get(c)||'available';
   const b=document.createElement('button');b.type='button';b.className='seat';b.textContent=s;
   if(st==='sold'){b.classList.add('sold');b.disabled=true;b.title='Сатылды'}
   else if(st==='held'&&!(hold&&selected.has(c))){b.classList.add('held');b.disabled=true;b.title='Броньда'}
   else if(selected.has(c)){b.classList.add('selected')}
   if(hold)b.disabled=true;
   b.onclick=()=>toggle(c);
   sr.appendChild(b);
  }
  box.appendChild(sr);root.appendChild(box);
 }
 updateSummary();
}
function toggle(c){if(hold)return;selected.has(c)?selected.delete(c):selected.add(c);renderTables()}
function sorted(){return [...selected].sort((a,b)=>{const A=a.split('-').map(Number),B=b.split('-').map(Number);return A[0]-B[0]||A[1]-B[1]})}
function human(c){const [t,s]=c.split('-');return t+'-үстел, '+s+'-орын'}
function updateSummary(){
 const arr=sorted();
 document.getElementById('selection').textContent=arr.length?arr.map(human).join(' • '):'Орын таңдалмады';
 document.getElementById('total').textContent=money(arr.length*active.price);
 document.getElementById('reserveBtn').disabled=!arr.length||!!hold;
}
async function load(){
 const sync=document.getElementById('sync');sync.className='status';sync.textContent='Орындар жаңартылуда...';
 const {data,error}=await sb.rpc('get_seat_statuses',{p_event_code:active.code});
 if(error){sync.className='status error';sync.textContent='Базамен байланыс қатесі';return}
 statuses.clear();(data||[]).forEach(r=>statuses.set(code(r.table_no,r.seat_no),r.status));
 [...selected].forEach(c=>{if((statuses.get(c)||'available')==='sold')selected.delete(c)});
 sync.className='status success';sync.textContent='Орындар синхрондалды';
 renderTables();
}
async function reserve(){
 if(!selected.size||hold)return;
 const {data,error}=await sb.rpc('reserve_seats',{p_event_code:active.code,p_seats:sorted().map(seatObj)});
 if(error){alert(error.message||'Бронь жасалмады');await load();return}
 const row=data&&data[0];hold={token:row.hold_token,expires:new Date(row.expires_at)};
 document.getElementById('holdBox').classList.add('show');renderTables();startTimer();await load();
}
function startTimer(){
 clearInterval(timer);
 const tick=async()=>{
  if(!hold)return;
  const left=Math.max(0,hold.expires-Date.now()),m=Math.floor(left/60000),s=Math.floor((left%60000)/1000);
  document.getElementById('countdown').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  if(left<=0){clearInterval(timer);hold=null;selected.clear();document.getElementById('holdBox').classList.remove('show');await load()}
 };
 tick();timer=setInterval(tick,1000);
}
async function paid(){
 if(!hold)return;
 const name=document.getElementById('name').value.trim(),phone=document.getElementById('phone').value.trim();
 const msg=document.getElementById('requestMsg');
 if(!name||!phone){msg.className='status error';msg.textContent='Атыңыз бен телефонды жазыңыз';return}
 const amount=selected.size*active.price;
 const {data,error}=await sb.rpc('submit_booking_request',{p_hold_token:hold.token,p_event_code:active.code,p_customer_name:name,p_customer_phone:phone,p_amount:amount});
 if(error){msg.className='status error';msg.textContent=error.message;return}
 msg.className='status success';msg.textContent='Төлем растауға жіберілді. Тексерілген соң билет сілтемесі WhatsApp-қа жіберіледі.';
 const text='Сәлеметсіз бе! Төлем жасадым. '+active.name+' — '+sorted().map(human).join(', ')+'. Сома: '+money(amount)+'. Аты: '+name+'. Телефон: '+phone+'. Бронь №: '+data;
 window.open('https://wa.me/77003441472?text='+encodeURIComponent(text),'_blank');
}
function chooseEvent(c){
 const e=events.find(x=>x.code===c);if(!e)return;
 active=e;selected.clear();hold=null;clearInterval(timer);
 document.getElementById('holdBox').classList.remove('show');
 document.getElementById('eventInfo').textContent=e.name+' • '+e.date+' • '+e.time+' • '+money(e.price)+'/орын';
 load();
}
function init(){
 document.getElementById('eventSelect').innerHTML=events.map(e=>'<option value="'+e.code+'">'+e.name+' — '+e.date+', '+e.time+'</option>').join('');
 document.getElementById('eventSelect').onchange=e=>chooseEvent(e.target.value);
 document.getElementById('reserveBtn').onclick=reserve;
 document.getElementById('paidBtn').onclick=paid;
 document.getElementById('eventCards').innerHTML=events.map(e=>'<article class="event-card"><div><img src="'+e.poster+'" alt="'+e.name+'"></div><div class="event-body"><h3>'+e.name+'</h3><p class="muted">'+e.date+' • '+e.time+'<br>'+e.venue+'</p><div class="price">'+money(e.price)+'</div><br><a href="#tickets" class="btn" data-event="'+e.code+'">ОРЫН ТАҢДАУ</a></div></article>').join('');
 document.querySelectorAll('[data-event]').forEach(a=>a.onclick=()=>{document.getElementById('eventSelect').value=a.dataset.event;chooseEvent(a.dataset.event)});
 renderMap();chooseEvent(events[0].code);setInterval(()=>{if(!hold)load()},15000);
}
init();