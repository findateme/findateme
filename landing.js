
const $ = (id) => document.getElementById(id);

function rand(min, max){ return Math.random() * (max-min) + min; }

// Detect if device is mobile to avoid heavy animations
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768;
}

const IS_MOBILE = isMobileDevice();

function spawnHearts(){
  // Skip heart animation on mobile for performance
  if (IS_MOBILE) return;
  
  const layer = document.querySelector(".loveLayer");
  if (!layer) return;

  const count = 26;
  for (let i=0; i<count; i++){
    const h = document.createElement("div");
    h.className = "love";
    h.style.left = rand(0, 100) + "vw";
    h.style.setProperty("--s", rand(60, 180) + "px");   // big hearts
    h.style.setProperty("--o", rand(0.08, 0.22));
    h.style.setProperty("--b", rand(0, 1.5) + "px");
    h.style.setProperty("--d", rand(12, 28) + "s");     // different speed
    h.style.animationDelay = (-rand(0, 28)) + "s";      // start at different points
    layer.appendChild(h);
  }
}
spawnHearts();

function getDeadline(){
  const key = "dateme_offer_deadline_v2";
  const saved = localStorage.getItem(key);
  if (saved) return Number(saved);

  const deadline = Date.now() + (3 * 60 * 60 * 1000); // 3 hours
  localStorage.setItem(key, String(deadline));
  return deadline;
}
function pad2(n){ return String(n).padStart(2,"0"); }
function tick(){
  let diff = Math.max(0, getDeadline() - Date.now());
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if ($("hh")) $("hh").textContent = pad2(h);
  if ($("mm")) $("mm").textContent = pad2(m);
  if ($("ss")) $("ss").textContent = pad2(s);

  // restart if ended (keeps "ending soon" vibe)
  if (diff <= 0){
    localStorage.removeItem("dateme_offer_deadline_v2");
  }
}
setInterval(tick, 250);
tick();

const PEOPLE = [
  {name:"Amelia", age:26, city:"London", country:"UK", online:true, tags:["Coffee","Museums","City walks"], img:"https://randomuser.me/api/portraits/women/44.jpg", quote:"“The UI feels premium. Chats are smoother here.”"},
  {name:"Sofia", age:24, city:"Barcelona", country:"Spain", online:false, tags:["Beach","Food","Dance"], img:"https://randomuser.me/api/portraits/women/30.jpg", quote:"“Less noise, more real conversations.”"},
  {name:"Chloe", age:27, city:"Paris", country:"France", online:true, tags:["Art","Fashion","Cafe"], img:"https://randomuser.me/api/portraits/women/22.jpg", quote:"“It feels modern and safe. Love it.”"},
  {name:"Mia", age:25, city:"Berlin", country:"Germany", online:true, tags:["Books","Gym","Tech"], img:"https://randomuser.me/api/portraits/women/65.jpg", quote:"“People are more serious here.”"},
  {name:"Ava", age:23, city:"Amsterdam", country:"Netherlands", online:false, tags:["Design","Nature","Coffee"], img:"https://randomuser.me/api/portraits/women/12.jpg", quote:"“Clean profile layout — looks legit.”"},
  {name:"Nadia", age:28, city:"Kuala Lumpur", country:"Malaysia", online:true, tags:["Food","Travel","Movies"], img:"https://randomuser.me/api/portraits/women/13.jpg", quote:"“Inbox experience is super simple.”"},
  {name:"Sara", age:22, city:"Kathmandu", country:"Nepal", online:true, tags:["Art","Hiking","Books"], img:"https://randomuser.me/api/portraits/women/11.jpg", quote:"“I like the calm vibe.”"},
  {name:"Aisha", age:27, city:"Kolkata", country:"India", online:false, tags:["Poetry","Coffee","Movies"], img:"https://randomuser.me/api/portraits/women/6.jpg", quote:"“Feels premium compared to normal sites.”"},
  {name:"Olivia", age:28, city:"Toronto", country:"Canada", online:true, tags:["Nature","Cooking","Hiking"], img:"https://randomuser.me/api/portraits/women/21.jpg", quote:"“Fast, clean, and easy.”"}
];

function cardHTML(p){
  return `
    <article class="p">
      <img src="${p.img}" alt="${p.name}" loading="lazy"/>
      <div class="pbody">
        <div class="prow">
          <b>${p.name}, ${p.age}</b>
          <span class="pchip">${p.city}, ${p.country}</span>
        </div>
        <p>${p.quote}</p>
      </div>
    </article>
  `;
}

function phoneCardHTML(p){
  return `
    <article class="card">
      <img src="${p.img}" alt="${p.name}" loading="lazy"/>
      <div class="cbody">
        <div class="crow">
          <b>${p.name}, ${p.age}</b>
          <span class="${p.online ? "oline":"offline"}">${p.online ? "Online":"Offline"}</span>
        </div>
        <div class="muted" style="margin-top:4px">${p.city} • ${p.country}</div>
        <div class="ctags">
          ${p.tags.slice(0,3).map(t=>`<span class="ctag">${t}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderLandingProfiles(){
  const grid = $("peopleGrid");
  if (grid){
    grid.innerHTML = PEOPLE.slice(0,6).map(cardHTML).join("");
  }

  const stack = $("profileStack");
  if (stack){
    const pick = [...PEOPLE].sort(()=>Math.random()-0.5).slice(0,3);
    stack.innerHTML = pick.map(phoneCardHTML).join("");
  }
}
renderLandingProfiles();

// Scroll-reveal: reveal elements with class `reveal` as they enter viewport.
(function(){
  if (typeof IntersectionObserver === 'undefined') return; // graceful fallback
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const obs = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -6% 0px'
  });

  items.forEach(el => {
    // ensure hidden initial state (if CSS not yet applied)
    if (!el.classList.contains('active')) el.classList.add('reveal');
    obs.observe(el);
  });
})();