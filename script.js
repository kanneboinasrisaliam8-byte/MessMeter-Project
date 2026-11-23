const $ = id => document.getElementById(id);
const API = '/api';
let token = sessionStorage.getItem('messmeter_token') || '';
let currentUser = null;
let wasteChart = null;
const meals = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
const weekly = [
 ['Monday','Idli & sambar','Rice, dal & vegetable curry','Fruit & tea','Chapati & paneer curry'],
 ['Tuesday','Dosa & chutney','Rice, sambar & potato fry','Banana & milk','Vegetable rice & raita'],
 ['Wednesday','Upma','Rice, dal & beans curry','Biscuits & tea','Chapati & mixed vegetable curry'],
 ['Thursday','Poori & potato curry','Rice, rasam & vegetable fry','Fruit & milk','Fried rice & manchurian'],
 ['Friday','Pongal & chutney','Rice, dal & cabbage curry','Tea & biscuits','Chapati & dal fry'],
 ['Saturday','Pesarattu','Rice, sambar & egg curry','Samosa & tea','Vegetable pulao & raita'],
 ['Sunday','Poori & chutney','Special veg meals','Ice cream','Tomato rice & curd']
];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateString = (d = new Date()) => { const x = new Date(d.getTime() - d.getTimezoneOffset()*60000); return x.toISOString().slice(0,10); };
const tomorrowAt = () => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(12,0,0,0); return d.toISOString(); };
async function request(path, options = {}) {
 const response = await fetch(API + path, { ...options, headers: { 'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(options.headers||{}) } });
 const data = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
 return data;
}
function message(id, text) { if ($(id)) $(id).textContent = text; }
function roleUI(user) {
 currentUser = user; document.body.dataset.role = user.role;
 $('loginStatusTitle').textContent = `Welcome, ${user.name} — ${user.role === 'admin' ? 'Admin' : 'Student'} Portal`;
 $('loginStatusText').textContent = user.role === 'admin' ? 'Admin access is verified by the server.' : 'Your meal choices and ratings are saved to the shared database.';
 $('logoutButton').hidden = false;
 if (user.role === 'student') $('studentName').value = user.name;
 $('loginStatus').scrollIntoView({behavior:'smooth',block:'center'});
 refreshDashboard().catch(e => console.warn(e.message));
}
function logout() { token=''; currentUser=null; sessionStorage.removeItem('messmeter_token'); delete document.body.dataset.role; $('logoutButton').hidden=true; $('loginStatusTitle').textContent='You are browsing as a guest'; $('loginStatusText').textContent='Log in to access the student or admin portal.'; }
$('weeklyMenu').innerHTML = weekly.map(d=>`<article class="day-card"><h3>${d[0]}</h3><p><b>Breakfast:</b> ${d[1]}</p><p><b>Lunch:</b> ${d[2]}</p><p><b>Snacks:</b> ${d[3]}</p><p><b>Dinner:</b> ${d[4]}</p></article>`).join('');
$('todayDate').textContent = new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short',year:'numeric'});
$('wasteDate').value = dateString();
$('studentLoginForm').addEventListener('submit', async e => {
 e.preventDefault(); const name=$('loginStudentName').value.trim(), studentId=$('studentId').value.trim(), email=$('studentEmail').value.trim(), password=$('studentPassword').value;
 try { let result; try { result=await request('/auth/register',{method:'POST',body:JSON.stringify({name,studentId,email,password})}); message('loginStatusText','New student account created.'); } catch(err) { if (!err.message.toLowerCase().includes('already exists')) throw err; result=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password,role:'student'})}); }
 token=result.token; sessionStorage.setItem('messmeter_token',token); roleUI(result.user); $('studentPassword').value='';
 } catch(err) { message('loginStatusText',err.message); }
});
$('adminLoginForm').addEventListener('submit', async e => { e.preventDefault(); try { const result=await request('/auth/login',{method:'POST',body:JSON.stringify({email:$('adminEmail').value.trim(),password:$('adminPassword').value,role:'admin'})}); token=result.token; sessionStorage.setItem('messmeter_token',token); roleUI(result.user); $('adminPassword').value=''; } catch(err) { message('loginStatusText',err.message); } });
$('logoutButton').addEventListener('click',logout);
$('submitMeals').addEventListener('click',async()=>{
 if (!currentUser || currentUser.role!=='student') return message('mealMessage','Please log in with a student account first.');
 const chosen=[...document.querySelectorAll('.meal-check:checked')].map(x=>x.value);
 try { const result=await request('/meals',{method:'POST',body:JSON.stringify({meals:chosen,serviceAt:tomorrowAt()})}); message('mealMessage',result.message); await refreshDashboard(); }
 catch(e){message('mealMessage',e.message);}
});
$('calculateHeadcount').addEventListener('click',async()=>{
 if (!currentUser || currentUser.role!=='admin') return message('headcountResult','Admin login required');
 const meal=$('headcountMeal')?.value || 'Lunch';
 try { const result=await request(`/meals/headcount?serviceAt=${encodeURIComponent(tomorrowAt())}&meal=${meal}`); $('totalStudents').value=result.totalStudents; $('optedOut').value=result.optedOutCount; $('headcountResult').textContent=result.expectedHeadcount; }
 catch(e){message('headcountResult',e.message);}
});
$('saveWaste').addEventListener('click',async()=>{
 if (!currentUser || currentUser.role!=='admin') return message('wasteMessage','Admin login required.');
 const kg=Number($('wasteKg').value), date=$('wasteDate').value, note=$('wasteNote').value.trim();
 if ($('wasteKg').value==='' || !Number.isFinite(kg) || kg<0) return message('wasteMessage','Enter a valid non-negative waste amount.');
 try { const result=await request('/waste',{method:'POST',body:JSON.stringify({date,kg,note})}); message('wasteMessage',result.message); $('wasteKg').value=''; $('wasteNote').value=''; await refreshDashboard(); }
 catch(e){message('wasteMessage',e.message);}
});
$('submitRating').addEventListener('click',async()=>{
 if (!currentUser || currentUser.role!=='student') return message('ratingMessage','Please log in with a student account first.');
 const dish=$('dishName').value.trim(), rating=Number($('dishRating').value), feedback=$('dishFeedback').value.trim();
 try { const result=await request('/ratings',{method:'POST',body:JSON.stringify({dish,rating,feedback})}); message('ratingMessage',result.message); $('dishName').value=''; $('dishFeedback').value=''; await refreshDashboard(); }
 catch(e){message('ratingMessage',e.message);}
});
function drawDashboard(data) {
 $('totalWaste').textContent=`${Number(data.totalWaste).toFixed(1)} kg`; $('averageRating').textContent=data.averageRating==null?'—':`${data.averageRating.toFixed(1)} / 5`;
 $('dashboardResponses').textContent=data.mealResponses; $('responseCount').textContent=data.mealResponses; $('optedInTotal').textContent=data.optedInMeals; $('enrolledCount').textContent=data.totalStudents;
 $('wasteRows').innerHTML=data.waste.length?data.waste.map(r=>`<tr><td>${esc(r.date)}</td><td>${Number(r.kg).toFixed(1)} kg</td><td>${esc(r.note||'—')}</td></tr>`).join(''):'<tr><td colspan="3">No records yet.</td></tr>';
 const dishes=data.dishRatings||[]; $('ratingSummary').innerHTML=dishes.length?dishes.map(d=>`<p><b>${esc(d.dish)}</b> — ${d.average.toFixed(1)} / 5 (${d.count} ratings)</p>`).join(''):'No ratings submitted yet.';
 $('topDishes').innerHTML=dishes.filter(d=>d.average>=3.5).slice(0,5).map(d=>`<p>${esc(d.dish)} — ${d.average.toFixed(1)} ★</p>`).join('')||'No top-rated dishes yet.';
 $('lowDishes').innerHTML=dishes.filter(d=>d.average<3.5).sort((a,b)=>a.average-b.average).slice(0,5).map(d=>`<p>${esc(d.dish)} — ${d.average.toFixed(1)} ★</p>`).join('')||'No dishes flagged for improvement.';
 const daily={}; data.waste.forEach(r=>daily[r.date]=(daily[r.date]||0)+r.kg); const labels=Object.keys(daily).sort(); $('chartFallback').style.display=labels.length?'none':'block';
 if(window.Chart){ if(wasteChart)wasteChart.destroy(); wasteChart=new Chart($('wasteChart'),{type:'bar',data:{labels,datasets:[{label:'Food waste (kg)',data:labels.map(d=>daily[d]),backgroundColor:'#77b78d',borderRadius:7}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}}); }
}
async function refreshDashboard(){ if(!currentUser || currentUser.role!=='admin') return; try { drawDashboard(await request('/dashboard')); } catch(e){ console.warn(e.message); } }
$('exportData').addEventListener('click',async()=>{ if(!currentUser||currentUser.role!=='admin')return alert('Admin login required.'); try{const data=await request('/dashboard');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='messmeter-dashboard-export.json';a.click();URL.revokeObjectURL(url);}catch(e){alert(e.message);} });
if(token) request('/me').then(({user})=>roleUI(user)).catch(()=>logout());
