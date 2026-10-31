/* Concept screens are intentionally separate from the device shell.
   To replace a mockup, set its URL in SCREEN_ASSETS below (PNG/WebP, portrait).
   The shell, transitions and enlargement continue to work. */
const SCREEN_ASSETS = { en: { pantry: "", dinner: "", shopping: "" }, it: { pantry: "", dinner: "", shopping: "" } };
let language = "en";
try { language = localStorage.getItem("mangio-language") === "it" ? "it" : "en"; } catch {}
const t = (en, it) => language === "it" ? it : en;
const leaf = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 32C2 12 19 5 33 7c1 16-8 27-25 25Z" fill="#5e8251"/><path d="m8 33 18-19" stroke="#365536" stroke-width="2"/></svg>';
function dish() {
 let pasta = "";
 for(let i=0;i<22;i++){const a=i*2.4;const r=20+(i%5)*11;const x=160+Math.cos(a)*r,y=100+Math.sin(a)*r*.8;pasta+='<ellipse cx="'+x+'" cy="'+y+'" rx="13" ry="6" transform="rotate('+(i*29)+' '+x+' '+y+')" fill="'+(i%2?'#e7ba65':'#efcb85')+'" stroke="#d0a358" stroke-width="1"/>';}
 return '<svg viewBox="0 0 320 200" role="img" aria-label="'+t('Illustrative pasta dish','Piatto di pasta illustrativo')+'"><rect width="320" height="200" fill="#e8edf3"/><ellipse cx="164" cy="111" rx="99" ry="77" fill="#cdd5df"/><ellipse cx="160" cy="100" rx="98" ry="77" fill="#fafcfe"/><ellipse cx="160" cy="100" rx="78" ry="60" fill="#f1f3f5"/>'+pasta+'<g fill="#54724a"><path d="M115 70q25-25 33 0-25 15-33 0"/><path d="M175 120q25-25 33 0-25 15-33 0"/><path d="M145 145q-25-25 0-33 15 25 0 33"/><path d="M188 65q-25 0-15 22 24 0 15-22"/></g><g fill="#ce6549"><circle cx="123" cy="112" r="9"/><circle cx="191" cy="91" r="10"/><circle cx="160" cy="131" r="8"/></g><g fill="#fff"><circle cx="151" cy="75" r="5"/><circle cx="144" cy="115" r="6"/><circle cx="179" cy="109" r="5"/></g></svg>';
}
function row(name,sub,end,icon=leaf){return '<div class="grocery"><span class="food-icon">'+icon+'</span><div><b>'+name+'</b><small>'+sub+'</small></div><span class="item-end">'+end+'</span></div>';}
function screen(kind){
 const asset=SCREEN_ASSETS[language][kind];
 if(asset) return '<div class="screen"><img src="'+asset+'" alt="'+t('Mangio app screen','Schermata Mangio')+'" style="width:100%;height:100%;object-fit:cover"></div>';
 const top='<div class="screen"><div class="island"></div><div class="statusbar"><span>9:41</span><span>▴ ▰</span></div><div class="app-content"><div class="app-header"><span class="app-logo">mangio</span><span class="app-avatar">M</span></div>';
 const bottom='</div><div class="app-bottom"><span>'+t('Kitchen','Cucina')+'</span><span>'+t('Recipes','Ricette')+'</span><span>'+t('Week','Settimana')+'</span><span>'+t('Shop','Spesa')+'</span></div><div class="home-bar"></div></div>';
 let content="";
 if(kind==="pantry"){
 content='<h3>'+t('Your kitchen','La tua cucina')+'</h3><p class="app-caption">'+t('Good things, waiting to be dinner.','Cose buone, in attesa della cena.')+'</p><div class="app-chips"><span class="active">'+t('Fridge','Frigo')+'</span><span>Freezer</span><span>'+t('Pantry','Dispensa')+'</span></div>'+
 row(t('Spinach','Spinaci'),'150 g',t('Today','Oggi'))+
 row('Ricotta','250 g',t('Tomorrow','Domani'),'<span>◒</span>')+
 row(t('Tomatoes','Pomodori'),'6',t('3 days','3 giorni'),'<span style="color:#c9624a;font-size:28px">●</span>')+
 row(t('Eggs','Uova'),'4',t('5 days','5 giorni'),'<span>◯</span>')+
 '';
 }else if(kind==="dinner"){
 content='<h3>'+t('Dinner, sorted.','La cena è risolta.')+'</h3><p class="app-caption">'+t('Three ideas. Already in your kitchen.','Tre idee. Già nella tua cucina.')+'</p><div class="app-meal"><div class="food-art">'+dish()+'</div><div class="app-meal-copy"><span class="ready">'+t('✓ Uses your spinach & ricotta','✓ Usa i tuoi spinaci e la ricotta')+'</span><h4>'+t('Your tonight pasta','La pasta di stasera')+'</h4><p>25 min · '+t('Ready to cook','Pronta da cucinare')+'</p></div></div><div class="app-mini">'+t('Green frittata','Frittata verde')+'<small>20 min · '+t('One pan','Una padella')+'</small></div><div class="app-mini">'+t('Tomato & ricotta toast','Toast pomodoro e ricotta')+'<small>12 min · '+t('Just add bread','Manca solo il pane')+'</small></div>';
 }else{
 content='<h3>'+t('Just the missing bits.','Solo quello che manca.')+'</h3><p class="app-caption">'+t('A shorter list. A smarter shop.','Una lista più corta. Una spesa più furba.')+'</p><div class="app-chips"><span class="active">'+t('Shopping list','Lista della spesa')+'</span><span>'+t('Share ↗','Condividi ↗')+'</span></div>'+
 row(t('Sourdough bread','Pane a lievitazione naturale'),t('Bakery','Panetteria'),'○','<span>≋</span>')+
 row(t('Lemon','Limone'),t('Fruit & vegetables','Frutta e verdura'),'○','<span>◒</span>')+
 '<div class="app-mini" style="margin-top:18px"><span class="ready">'+t('✓ Already at home','✓ Già in casa')+'</span><small>'+t('Spinach · Ricotta · Tomatoes','Spinaci · Ricotta · Pomodori')+'</small></div>';
 }
 return top+content+bottom;
}
let currentDemo="pantry";
function drawPhones(){document.querySelectorAll("[data-screen]").forEach(el=>{el.innerHTML=screen(el.dataset.screen);});document.querySelectorAll("[data-food]").forEach(el=>{el.innerHTML=dish();});}
function setLanguage(lang){
 language=lang;
 document.documentElement.lang=lang;
 document.querySelectorAll("[data-en]").forEach(el=>{el.textContent=el.dataset[lang];});
 document.querySelectorAll("[data-lang]").forEach(el=>el.setAttribute("aria-pressed",String(el.dataset.lang===lang)));
 document.title=t("Mangio — Eat well for less","Mangio — Mangia bene. Spendi meno.");
 document.querySelector('meta[name="description"]').content=t("Dinner from what you already have. Join the Mangio waitlist.","La cena con quello che hai già. Iscriviti alla lista d’attesa di Mangio.");
 try{localStorage.setItem("mangio-language",lang);}catch{}
 drawPhones();updatePlayLabel();updateTimerLabel();
}
document.querySelectorAll("[data-lang]").forEach(el=>el.addEventListener("click",()=>setLanguage(el.dataset.lang)));
function selectDemo(kind){
 currentDemo=kind;
 document.querySelectorAll("[data-demo]").forEach(el=>{const selected=el.dataset.demo===kind;el.setAttribute("aria-selected",String(selected));el.tabIndex=selected?0:-1;});
 const phone=document.querySelector("#demo-phone");phone.dataset.screen=kind;phone.innerHTML=screen(kind);phone.classList.remove("screen-changing");void phone.offsetWidth;phone.classList.add("screen-changing");
 document.querySelector("#demo-panel").setAttribute("aria-labelledby","tab-"+kind);
}
const kinds=["pantry","dinner","shopping"];
let playInterval=null;
function updatePlayLabel(){const btn=document.querySelector("#play-demo");btn.textContent=playInterval?t("Ⅱ Pause demo","Ⅱ Pausa demo"):t("▶ Play demo","▶ Avvia la demo");btn.setAttribute("aria-pressed",String(!!playInterval));}
function pauseDemo(){clearInterval(playInterval);playInterval=null;updatePlayLabel();}
document.querySelectorAll("[data-demo]").forEach(el=>{
 el.addEventListener("click",()=>{pauseDemo();selectDemo(el.dataset.demo);});
 el.addEventListener("keydown",e=>{if(!["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Home","End"].includes(e.key))return;e.preventDefault();pauseDemo();let i=kinds.indexOf(currentDemo);i=e.key==="Home"?0:e.key==="End"?2:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:2))%3;selectDemo(kinds[i]);document.querySelector("#tab-"+kinds[i]).focus();});
});
document.querySelector("#play-demo").addEventListener("click",()=>{if(playInterval)pauseDemo();else{selectDemo(kinds[(kinds.indexOf(currentDemo)+1)%3]);playInterval=setInterval(()=>selectDemo(kinds[(kinds.indexOf(currentDemo)+1)%3]),3200);updatePlayLabel();}});
const dialog=document.querySelector("#preview-dialog");
document.querySelector("#expand-demo").addEventListener("click",()=>{pauseDemo();document.querySelector("#modal-phone").innerHTML=screen(currentDemo);dialog.showModal();});
document.querySelector("#close-preview").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
let remaining=480,timerInterval=null;
function updateTimerLabel(){document.querySelector("#timer-toggle").textContent=timerInterval?t("Pause","Pausa"):remaining===480?t("Try the timer","Prova il timer"):t("Resume","Riprendi");}
document.querySelector("#timer-toggle").addEventListener("click",()=>{if(timerInterval){clearInterval(timerInterval);timerInterval=null;}else{timerInterval=setInterval(()=>{remaining=Math.max(0,remaining-1);document.querySelector("#timer-display").textContent=String(Math.floor(remaining/60)).padStart(2,"0")+":"+String(remaining%60).padStart(2,"0");if(!remaining){clearInterval(timerInterval);timerInterval=null;updateTimerLabel();}},1000);}updateTimerLabel();});
document.addEventListener("visibilitychange",()=>{if(document.hidden){pauseDemo();if(timerInterval){clearInterval(timerInterval);timerInterval=null;updateTimerLabel();}}});
document.querySelector("#waitlist-form").addEventListener("submit",e=>{e.preventDefault();document.querySelector("#form-message").textContent=t("This is a design preview. Your email has not been sent or saved.","Questa è un’anteprima. La tua email non è stata inviata né salvata.");});
setLanguage(language);
if("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches){
 document.body.classList.add("motion-ready");
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target);}}),{threshold:.08});
 document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
}
