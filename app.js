// app.js (People page only) — Modal -> Inbox redirect, no side chat panel

const $ = (id) => document.getElementById(id);

// Mobile performance detection
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                  window.innerWidth <= 768;

const state = {
  page: 0,
  pageSize: 9,
  all: [],
  filtered: [],
  activeProfile: null,
  likes: {},
  gender: "women",
  nearIds: [],
  nearReady: false,
  nearCity: ""
};

const STATUS_KEY = "dateme_active_profile_ids";
const STATUS_NEXT_KEY = "dateme_status_next_ts";
const STATUS_MIN_MS = 60 * 60 * 1000;
const STATUS_MAX_MS = 3 * 60 * 60 * 1000;
const LAST_SEEN_KEY = "dateme_last_seen_map";
const LIKE_KEY = "dateme_like_counts";
const GENDER_KEY = "dateme_gender";
const API_BASE = window.API_BASE || "";
const REMOTE_CACHE_KEY = "dateme_remote_profiles";

// demo profiles (unique images via randomuser ids)
const DEMO = [
  { name:"Emily Johnson", age:27, country:"India", city:"Kolkata", online:false, tags:["Coffee","Movies","Poetry"], img:"assets/profile-01.jpg" },
  { name:"Sophia Martinez", age:23, country:"India", city:"Mumbai", online:true, tags:["Dance","Travel","Food"], img:"assets/profile-02.jpg" },
  { name:"Olivia Brown", age:22, country:"India", city:"Bengaluru", online:true, tags:["Yoga","Books","Music"], img:"assets/profile-03.jpg" },

  { name:"Ava Williams", age:22, country:"Nepal", city:"Kathmandu", online:true, tags:["Books","Art","Hiking"], img:"assets/profile-04.jpg" },
  { name:"Isabella Garcia", age:24, country:"Nepal", city:"Pokhara", online:false, tags:["Nature","Coffee","Photography"], img:"assets/profile-05.jpg" },

  { name:"Mia Rodriguez", age:29, country:"Malaysia", city:"Kuala Lumpur", online:false, tags:["Food","Fitness","Travel"], img:"assets/profile-06.jpg" },
  { name:"Charlotte Miller", age:26, country:"Malaysia", city:"Penang", online:true, tags:["Cooking","Movies","Beach"], img:"assets/profile-07.jpg" },

  { name:"Amelia Davis", age:26, country:"Thailand", city:"Bangkok", online:true, tags:["Beach","Fashion","Anime"], img:"assets/profile-08.jpg" },
  { name:"Harper Wilson", age:23, country:"Thailand", city:"Chiang Mai", online:false, tags:["Nature","Cafe","Music"], img:"assets/profile-09.jpg" },

  { name:"Evelyn Anderson", age:24, country:"Japan", city:"Osaka", online:true, tags:["Anime","Music","Citywalk"], img:"assets/profile-10.jpg" },
  { name:"Abigail Taylor", age:22, country:"China", city:"Shanghai", online:false, tags:["Art","Coffee","Study"], img:"assets/profile-11.jpg" },
  { name:"Ella Thomas", age:23, country:"South Korea", city:"Seoul", online:true, tags:["K-drama","Dance","Cafe"], img:"https://randomuser.me/api/portraits/women/18.jpg" },

  { name:"Scarlett Moore", age:28, country:"UK", city:"London", online:true, tags:["Tech","Design","Coffee"], img:"https://randomuser.me/api/portraits/women/21.jpg" },
  { name:"Grace Jackson", age:26, country:"France", city:"Paris", online:false, tags:["Art","Fashion","Cafe"], img:"https://randomuser.me/api/portraits/women/22.jpg" },
  { name:"Lily White", age:25, country:"Italy", city:"Milan", online:true, tags:["Cooking","Fashion","Travel"], img:"https://randomuser.me/api/portraits/women/23.jpg" },
  { name:"Victoria Harris", age:27, country:"Spain", city:"Barcelona", online:true, tags:["Beach","Dance","Food"], img:"https://randomuser.me/api/portraits/women/24.jpg" },

  { name:"Aria Martin", age:25, country:"USA", city:"New York", online:false, tags:["Gym","Travel","Movies"], img:"https://randomuser.me/api/portraits/women/30.jpg" },
  { name:"Zoey Thompson", age:24, country:"USA", city:"Los Angeles", online:true, tags:["Music","Beach","Photography"], img:"https://randomuser.me/api/portraits/women/31.jpg" },
  { name:"Natalie Lopez", age:26, country:"USA", city:"Chicago", online:true, tags:["Design","Coffee","Books"], img:"https://randomuser.me/api/portraits/women/32.jpg" },

  { name:"Hannah Lee", age:24, country:"Canada", city:"Toronto", online:true, tags:["Nature","Cooking","Hiking"], img:"https://randomuser.me/api/portraits/women/33.jpg" },
  { name:"Brooklyn Perez", age:28, country:"Canada", city:"Vancouver", online:false, tags:["Hiking","Coffee","Movies"], img:"https://randomuser.me/api/portraits/women/34.jpg" }
];

const EXTRA_TARGET = 200;
const MEN_TARGET = 170;
const EXTRA_NAMES = [
  "Nora","Riya","Maya","Anika","Zara","Kiara","Mina","Sana","Lara","Tia",
  "Rosa","Nina","Aria","Meera","Tanya","Alina","Daisy","Reina","Isha","Rina",
  "Kira","Lola","Pia","Sumi","Rhea","Nora","Mina","Lana","Ira","Zoya"
];
const WOMEN_NAMES_100 = [
  "Emily Johnson","Sophia Martinez","Olivia Brown","Ava Williams","Isabella Garcia",
  "Mia Rodriguez","Charlotte Miller","Amelia Davis","Harper Wilson","Evelyn Anderson",
  "Abigail Taylor","Ella Thomas","Scarlett Moore","Grace Jackson","Lily White",
  "Victoria Harris","Aria Martin","Zoey Thompson","Natalie Lopez","Hannah Lee",
  "Brooklyn Perez","Layla Clark","Nora Lewis","Stella Walker","Aurora Hall",
  "Penelope Young","Lucy King","Anna Wright","Savannah Scott","Madison Green",
  "Chloe Adams","Eleanor Baker","Leah Gonzalez","Hazel Nelson","Violet Carter",
  "Naomi Mitchell","Alice Ramirez","Julia Roberts","Camila Turner","Sofia Phillips",
  "Maya Campbell","Ivy Parker","Ariana Evans","Peyton Edwards","Reese Collins",
  "Claire Stewart","Luna Morris","Eliza Rogers","Faith Reed","Kayla Cook",
  "Jasmine Morgan","Alexa Bell","Brianna Murphy","Caroline Bailey","Daniela Rivera",
  "Samantha Cooper","Gabriella Richardson","Hailey Cox","Melanie Howard","Ruby Ward",
  "Vanessa Torres","Paige Peterson","Audrey Gray","Kiara Ramirez","Autumn James",
  "Diana Watson","Fiona Brooks","Juliana Kelly","Makayla Sanders","Serena Price",
  "Talia Bennett","Michelle Wood","Ariana Barnes","Nicole Ross","Valentina Henderson",
  "Allison Coleman","Kelsey Jenkins","Rachael Perry","Bianca Long","Lauren Powell",
  "Destiny Patterson","Brooke Hughes","Daniela Flores","Megan Washington","Cynthia Butler",
  "Angela Simmons","Naomi Foster","Sabrina Gonzales","Monica Bryant","Kristen Alexander",
  "Paula Russell","Adriana Griffin","Joanna Diaz","Veronica Hayes","Kaylee Myers",
  "Selena Ford","Lillian Hamilton","Renee Sullivan","Tessa Wallace","Miranda Stone"
];
const NAME_POOLS_BY_COUNTRY = {
  Canada: ["Emma","Chloe","Grace","Avery","Hannah","Olivia","Lily","Sophie"],
  UK: ["Olivia","Isla","Amelia","Charlotte","Mia","Ella","Sienna","Ruby"],
  France: ["Chloe","Camille","Ines","Lea","Manon","Elise","Juliette","Adele"],
  Italy: ["Giulia","Sofia","Alice","Martina","Chiara","Aurora","Elena","Francesca"],
  Spain: ["Sofia","Lucia","Carmen","Valeria","Alba","Irene","Clara","Noa"],
  "South Korea": ["Minji","Jisoo","Soojin","Hana","Yuna","Jiwon","Seoyeon","Eunji"],
  Japan: ["Hana","Yui","Aiko","Sakura","Miku","Rina","Mei","Nanami"]
};
const EXTRA_PLACES = [
  {city:"New York", country:"USA"},
  {city:"Los Angeles", country:"USA"},
  {city:"Chicago", country:"USA"},
  {city:"Houston", country:"USA"},
  {city:"Miami", country:"USA"},
  {city:"Dallas", country:"USA"},
  {city:"Seattle", country:"USA"},
  {city:"Boston", country:"USA"},
  {city:"San Diego", country:"USA"},
  {city:"San Francisco", country:"USA"},
  {city:"Atlanta", country:"USA"},
  {city:"Austin", country:"USA"},
  {city:"Denver", country:"USA"},
  {city:"Phoenix", country:"USA"},
  {city:"Philadelphia", country:"USA"},
  {city:"Toronto", country:"Canada"},
  {city:"Vancouver", country:"Canada"},
  {city:"London", country:"UK"},
  {city:"Manchester", country:"UK"},
  {city:"Paris", country:"France"},
  {city:"Milan", country:"Italy"},
  {city:"Barcelona", country:"Spain"},
  {city:"Seoul", country:"South Korea"},
  {city:"Tokyo", country:"Japan"}
];
const MEN_PLACES = [
  {city:"New York", country:"USA"},
  {city:"Los Angeles", country:"USA"},
  {city:"Chicago", country:"USA"},
  {city:"Austin", country:"USA"},
  {city:"Seattle", country:"USA"},
  {city:"Boston", country:"USA"},
  {city:"London", country:"UK"},
  {city:"Manchester", country:"UK"},
  {city:"Birmingham", country:"UK"},
  {city:"Edinburgh", country:"UK"},
  {city:"Dublin", country:"Ireland"},
  {city:"Toronto", country:"Canada"},
  {city:"Vancouver", country:"Canada"},
  {city:"Sydney", country:"Australia"},
  {city:"Melbourne", country:"Australia"}
];
const EXTRA_TAGS = [
  ["Coffee","Movies","Travel"],
  ["Food","Books","Music"],
  ["Gym","Nature","Hiking"],
  ["Art","Fashion","Cafe"],
  ["Photography","Beach","Design"],
  ["Cooking","Anime","Citywalk"],
  ["Poetry","Tea","Sunsets"]
];
const EXTRA_NAMES_MEN = [
  "Arman","Rafi","Nabil","Hasan","Siam","Fahim","Rizwan","Imran","Zahid","Tariq",
  "Ayaan","Rohan","Kabir","Rayhan","Faris","Sami","Zayan","Adil","Omar","Saif",
  "Noah","Ethan","Leo","Mason","Liam","Lucas","Jay","Ari","Zane","Kian"
];

const LOCAL_WOMEN_IMAGES = [
  "assets/profile-01.jpg",
  "assets/profile-02.jpg",
  "assets/profile-03.jpg",
  "assets/profile-04.jpg",
  "assets/profile-05.jpg",
  "assets/profile-06.jpg",
  "assets/profile-07.jpg",
  "assets/profile-08.jpg",
  "assets/profile-09.jpg",
  "assets/profile-10.jpg",
  "assets/profile-11.jpg",
  "assets/profile-12.jpg",
  "assets/profile-13.jpg",
  "assets/profile-14.jpg",
  "assets/profile-15.jpg",
  "assets/profile-16.jpg",
  "assets/profile-17.jpg",
  "assets/profile-18.jpg",
  "assets/profile-19.jpg",
  "assets/profile-20.jpg",
  "assets/profile-21.jpg",
  "assets/profile-22.jpg",
  "assets/profile-23.jpg",
  "assets/profile-24.jpg",
  "assets/profile-25.jpg",
  "assets/profile-26.jpg",
  "assets/profile-27.jpg",
  "assets/profile-28.jpg",
  "assets/profile-29.jpg",
  "assets/profile-30.jpg",
  "assets/profile-31.jpg",
  "assets/profile-32.jpg",
  "assets/profile-33.jpg",
  "assets/profile-34.jpg",
  "assets/profile-35.jpg"
].slice().reverse();

function generateProfiles(count, startIndex, gender){
  const out = [];
  for (let i = 0; i < count; i++){
    const namePool = gender === "men" ? EXTRA_NAMES_MEN : EXTRA_NAMES;
    const placePool = gender === "men" ? MEN_PLACES : EXTRA_PLACES;
    const nameIndex = startIndex + i;
    const name = (gender !== "men" && WOMEN_NAMES_100[nameIndex])
      ? WOMEN_NAMES_100[nameIndex]
      : namePool[(startIndex + i) % namePool.length];
    const place = placePool[(startIndex + i) % placePool.length];
    const tags = EXTRA_TAGS[(startIndex + i) % EXTRA_TAGS.length];
    const age = 21 + ((startIndex + i) % 9);
    const imgId = (startIndex + i) % 90;
    const localImg =
      gender === "women" && LOCAL_WOMEN_IMAGES[startIndex + i]
        ? LOCAL_WOMEN_IMAGES[startIndex + i]
        : "";
    const isWoman = gender !== "men";
    const countryPool = isWoman ? NAME_POOLS_BY_COUNTRY[place.country] : null;
    const finalName = (isWoman && nameIndex < WOMEN_NAMES_100.length)
      ? name
      : (isWoman && place.country !== "USA" && countryPool && countryPool.length)
        ? countryPool[(startIndex + i) % countryPool.length]
        : name;
    out.push({
      name: finalName,
      age,
      city: place.city,
      country: place.country,
      online: false,
      tags,
      img: localImg || `https://randomuser.me/api/portraits/${gender === "men" ? "men" : "women"}/${imgId}.jpg`
    });
  }
  return out;
}


const WOMEN_PROFILES = DEMO.concat(
  generateProfiles(Math.max(0, EXTRA_TARGET - DEMO.length), DEMO.length, "women")
);
const MEN_PROFILES = generateProfiles(MEN_TARGET, 0, "men");
const WOMEN_LIST = WOMEN_PROFILES.map((x, i) => ({ id: i + 1, ...x }));
const MEN_LIST = MEN_PROFILES.map((x, i) => ({ id: i + 1, ...x }));
const STORIES_KEY = "dateme_stories";
const STORY_TTL_MS = 24 * 60 * 60 * 1000;

function loadStories(){
  let list = [];
  try{ list = JSON.parse(localStorage.getItem(STORIES_KEY) || "[]"); }catch(e){ list = []; }
  const now = Date.now();
  const filtered = Array.isArray(list) ? list.filter(s => (s.expiresAt || 0) > now) : [];
  if (filtered.length !== list.length){
    localStorage.setItem(STORIES_KEY, JSON.stringify(filtered));
  }
  return filtered;
}

function saveStories(list){
  localStorage.setItem(STORIES_KEY, JSON.stringify(list || []));
}

function readRemoteCache(){
  try{ return JSON.parse(localStorage.getItem(REMOTE_CACHE_KEY) || "[]"); }
  catch(e){ return []; }
}

function saveRemoteCache(list){
  localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(list || []));
}

function normalizeGender(value){
  const g = String(value || "").trim().toLowerCase();
  if (g === "men" || g === "male" || g === "m") return "men";
  if (g === "women" || g === "female" || g === "f") return "women";
  return "";
}

function hashString(value){
  let hash = 0;
  const str = String(value || "");
  for (let i = 0; i < str.length; i++){
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickFallbackImage(seed, gender){
  const idx = hashString(seed);
  if (gender === "men"){
    const pick = (idx % 90) + 1;
    return `https://randomuser.me/api/portraits/men/${pick}.jpg`;
  }
  if (LOCAL_WOMEN_IMAGES.length){
    return LOCAL_WOMEN_IMAGES[idx % LOCAL_WOMEN_IMAGES.length];
  }
  const pick = (idx % 90) + 1;
  return `https://randomuser.me/api/portraits/women/${pick}.jpg`;
}

function mapRemoteUser(u){
  const gender = normalizeGender(u.gender);
  const seed = u.email || u.username || u.name || u.id || "user";
  return {
    id: `db-${u.id || hashString(seed)}`,
    name: u.name || u.username || "New User",
    username: u.username || "",
    age: Number(u.age) || 22,
    country: u.country || "",
    city: u.city || "",
    email: u.email || "",
    gender,
    online: false,
    tags: ["New"],
    img: u.photo || pickFallbackImage(seed, gender)
  };
}

function normalizeRemoteProfiles(list){
  const seen = new Set();
  const out = [];
  list.map(mapRemoteUser).forEach((p) => {
    const key = String(p.email || p.id).trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(p);
  });
  return out;
}

function filterProfilesByGender(list, gender){
  return list.filter(p => !p.gender || p.gender === gender);
}

async function loadRemoteUsers(){
  let list = readRemoteCache();
  try{
    const res = await fetch(`${API_BASE}/get_users.php`);
    const data = await res.json();
    if (Array.isArray(data.users)){
      list = data.users;
      saveRemoteCache(list);
      return list;
    }
  }catch(e){
    console.error("Error fetching remote users:", e);
  }
  return Array.isArray(list) ? list : [];
}

function stripCurrentUser(list){
  const currentEmail = getCurrentEmail();
  if (!currentEmail) return list;
  return list.filter(
    (p) => String(p.email || "").trim().toLowerCase() !== String(currentEmail).trim().toLowerCase()
  );
}

function restoreDefaultProfiles(){
  // Initialize localStorage with default profiles
  localStorage.setItem("dateme_profiles_women", JSON.stringify(WOMEN_LIST));
  localStorage.setItem("dateme_profiles_men", JSON.stringify(MEN_LIST));
  state.all = WOMEN_LIST;
  localStorage.setItem("dateme_profiles", JSON.stringify(state.all));
}

async function syncRemoteProfiles(gender){
  const users = await loadRemoteUsers();
  if (!users.length) {
    // If no remote users, restore from default profiles
    const cacheKey = gender === "men" ? "dateme_profiles_men" : "dateme_profiles_women";
    let cached = [];
    try {
      cached = JSON.parse(localStorage.getItem(cacheKey) || "[]");
    } catch(e) {
      cached = [];
    }
    // If cache is empty, use defaults
    if (!cached.length) {
      restoreDefaultProfiles();
      setGender(gender);
    }
    return;
  }
  const allProfiles = normalizeRemoteProfiles(users);
  const menList = filterProfilesByGender(allProfiles, "men");
  const womenList = filterProfilesByGender(allProfiles, "women");
  const genderList = gender === "men" ? menList : womenList;
  state.all = stripCurrentUser(genderList);
  localStorage.setItem("dateme_profiles_all", JSON.stringify(allProfiles));
  localStorage.setItem("dateme_profiles_men", JSON.stringify(menList));
  localStorage.setItem("dateme_profiles_women", JSON.stringify(womenList));
  localStorage.setItem("dateme_profiles", JSON.stringify(state.all));
  renderStories();
  applyFilters();
}

function init(){
  syncUserAvatar();
  showWelcome();
  showUserWelcome();
  showUpgradeCongrats();
  updateNotificationBadge();

  const savedGender = localStorage.getItem(GENDER_KEY);
  if (savedGender === "men") state.gender = "men";
  setGender(state.gender);

  // ✅ save profiles for inbox page
  localStorage.setItem("dateme_profiles", JSON.stringify(state.all));

  initLikeCounts();

  renderStories();

  initRandomOnlineStatus();

  applyFilters();
  
  // ✅ Sync remote profiles immediately
  syncRemoteProfiles(state.gender);
  
  // ❌ Auto-refresh disabled - was causing page refresh every 30 seconds
  // Users can manually refresh if needed
  // setInterval(() => {
  //   syncRemoteProfiles(state.gender);
  // }, 30000);

  const menToggle = $("menToggle");
  if (menToggle){
    menToggle.onclick = () => {
      const next = state.gender === "women" ? "men" : "women";
      setGender(next);
      initLikeCounts();
      initRandomOnlineStatus();
      applyFilters();
      syncRemoteProfiles(next);
    };
  }

  // filters
  if ($("applyBtn")) $("applyBtn").onclick = applyFilters;
  if ($("resetBtn")) $("resetBtn").onclick = () => {
    if ($("q")) $("q").value = "";
    if ($("minAge")) $("minAge").value = 18;
    if ($("maxAge")) $("maxAge").value = 35;
    if ($("online")) $("online").value = "all";
    if ($("sort")) $("sort").value = "new";
    applyFilters();
  };

  if ($("loadMoreBtn")) $("loadMoreBtn").onclick = () => loadMore(false);

  // modal close
  if ($("modalClose")) $("modalClose").onclick = closeModal;
  if ($("modalX")) $("modalX").onclick = closeModal;

  // story modal (locked)
  if ($("storyModalClose")) $("storyModalClose").onclick = closeStoryModal;
  if ($("storyModalX")) $("storyModalX").onclick = closeStoryModal;

  const storyInput = $("storyInput");
  if (storyInput){
    storyInput.addEventListener("change", () => {
      const file = storyInput.files && storyInput.files[0];
      if (!file) return;
      
      const isImage = String(file.type || "").startsWith("image/");
      const isVideo = String(file.type || "").startsWith("video/");
      
      if (!isImage && !isVideo){
        alert("Only images and videos are allowed for stories.");
        storyInput.value = "";
        return;
      }
      
      const maxSize = 50 * 1024 * 1024; // 50MB for video
      if (file.size > maxSize){
        alert("File too large. Please use under 50MB.");
        storyInput.value = "";
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const profile = readActiveProfile();
        const email = getActiveEmail() || String(profile.email || "").trim().toLowerCase();
        
        // Get current user ID
        const currentUser = (() => {
          try {
            const u = localStorage.getItem("dateme_current_user");
            return u ? JSON.parse(u) : null;
          } catch(e) { return null; }
        })();
        
        if (!email){
          alert("Please complete your profile before adding a story.");
          return;
        }
        const list = loadStories();
        const next = list.filter(s => s.id !== email);
        
        const isImage = String(file.type || "").startsWith("image/");
        const isVideo = String(file.type || "").startsWith("video/");
        
        next.unshift({
          id: email,
          uploadedBy: currentUser?.id || email, // Store who uploaded this
          name: profile.name || "Story",
          media: dataUrl, // Use 'media' instead of 'img'
          type: isVideo ? "video" : "image", // Store type
          createdAt: Date.now(),
          expiresAt: Date.now() + STORY_TTL_MS,
          reactions: {} // Store reactions: { userId: '👍' }
        });
        saveStories(next);
        renderStories();
        storyInput.value = "";
      };
      reader.readAsDataURL(file);
    });
  }

  // theme toggle
  const themeBtn = $("themeBtn");
  if (themeBtn){
    themeBtn.onclick = () => {
      const cur = document.body.getAttribute("data-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      if (next === "light") document.body.setAttribute("data-theme","light");
      else document.body.removeAttribute("data-theme");
    };
  }

  const menuBtn = $("menuBtn");
  const sideMenu = document.getElementById("sideMenu");
  const sideMenuClose = document.getElementById("sideMenuClose");
  if (menuBtn && sideMenu){
    menuBtn.onclick = () => {
      sideMenu.classList.add("show");
      sideMenu.setAttribute("aria-hidden","false");
    };
  }
  if (sideMenuClose && sideMenu){
    sideMenuClose.onclick = () => {
      sideMenu.classList.remove("show");
      sideMenu.setAttribute("aria-hidden","true");
    };
  }
  const aboutBtn = document.getElementById("aboutUsBtn");
  const aboutOverlay = document.getElementById("aboutOverlay");
  const aboutClose = document.getElementById("aboutClose");
  if (aboutBtn && aboutOverlay){
    aboutBtn.onclick = () => {
      aboutOverlay.classList.add("show");
      aboutOverlay.setAttribute("aria-hidden","false");
      if (sideMenu){
        sideMenu.classList.remove("show");
        sideMenu.setAttribute("aria-hidden","true");
      }
    };
  }
  if (aboutClose && aboutOverlay){
    aboutClose.onclick = () => {
      aboutOverlay.classList.remove("show");
      aboutOverlay.setAttribute("aria-hidden","true");
    };
  }
  if (aboutOverlay){
    aboutOverlay.addEventListener("click", (e) => {
      if (e.target === aboutOverlay){
        aboutOverlay.classList.remove("show");
        aboutOverlay.setAttribute("aria-hidden","true");
      }
    });
  }

}

function getActiveEmail(){
  return String(localStorage.getItem("dateme_active_user") || "").trim().toLowerCase();
}

function readActiveProfile(){
  const email = getActiveEmail();
  if (email){
    try{
      return JSON.parse(localStorage.getItem(`dateme_profile_${email}`) || "{}");
    }catch(e){
      return {};
    }
  }
  try{
    return JSON.parse(localStorage.getItem("dateme_profile") || "{}");
  }catch(e){
    return {};
  }
}

function showWelcome(){
  const modal = document.getElementById("welcomeModal");
  const msg = document.getElementById("welcomeMsg");
  const nameEl = document.getElementById("welcomeName");
  const ok = document.getElementById("welcomeOk");
  const close = document.getElementById("welcomeClose");
  const name = localStorage.getItem("dateme_signup_welcome");
  const customMsg = localStorage.getItem("dateme_welcome_message");
  const adminEmail = String(window.DATEME_ADMIN_EMAIL || "").toLowerCase();
  const profile = readActiveProfile();
  const userEmail = getActiveEmail() || String(profile?.email || "").toLowerCase();
  if (!modal || !name) return;
  if (!adminEmail || userEmail !== adminEmail){
    localStorage.removeItem("dateme_signup_welcome");
    localStorage.removeItem("dateme_welcome_message");
    return;
  }
  if (!customMsg || name !== "Toki"){
    localStorage.removeItem("dateme_signup_welcome");
    localStorage.removeItem("dateme_welcome_message");
    return;
  }
  if (nameEl) nameEl.textContent = name;
  if (msg){
    msg.textContent = customMsg || `Welcome ${name}! Your profile is ready.`;
  }
  modal.classList.add("show");
  const hide = () => {
    modal.classList.remove("show");
    localStorage.removeItem("dateme_signup_welcome");
    localStorage.removeItem("dateme_welcome_message");
  };
  if (ok) ok.onclick = hide;
  if (close) close.onclick = hide;
}

function showUserWelcome(){
  const modal = document.getElementById("userWelcomeModal");
  if (!modal) return;
  const adminEmail = String(window.DATEME_ADMIN_EMAIL || "").toLowerCase();
  const profile = readActiveProfile();
  const userEmail = getActiveEmail() || String(profile?.email || "").toLowerCase();
  if (adminEmail && userEmail === adminEmail) return;
  if (localStorage.getItem("dateme_user_welcome_notice") !== "true") return;
  const closeBtn = document.getElementById("userWelcomeClose");
  const exploreBtn = document.getElementById("userWelcomeExplore");
  const hide = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");
    localStorage.removeItem("dateme_user_welcome_notice");
  };
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  if (closeBtn) closeBtn.onclick = hide;
  if (exploreBtn) exploreBtn.onclick = hide;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) hide();
  });
}

function hasUpgrade(){
  return localStorage.getItem("dateme_upgrade_verified") === "true";
}

function showUpgradeCongrats(){
  const modal = document.getElementById("upgradeCongratsModal");
  if (!modal) return;
  if (localStorage.getItem("dateme_upgrade_just_activated") !== "true") return;
  const closeBtn = document.getElementById("upgradeCongratsClose");
  const okBtn = document.getElementById("upgradeCongratsOk");
  const hide = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");
    localStorage.removeItem("dateme_upgrade_just_activated");
  };
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
  if (closeBtn) closeBtn.onclick = hide;
  if (okBtn) okBtn.onclick = hide;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) hide();
  });
}

function syncUserAvatar(){
  const avatar = document.querySelector(".avatar");
  const img = document.querySelector(".avatar__img");
  if (!avatar || !img) return;
  const data = readActiveProfile();
  if (data.photo){
    img.src = data.photo;
    avatar.classList.add("has-img");
  }else{
    img.removeAttribute("src");
    avatar.classList.remove("has-img");
  }
}

function getCurrentEmail(){
  const profile = readActiveProfile();
  return getActiveEmail() || String(profile?.email || "").trim().toLowerCase();
}

function setGender(gender){
  state.gender = gender;
  localStorage.setItem(GENDER_KEY, gender);
  const cacheKey = gender === "men" ? "dateme_profiles_men" : "dateme_profiles_women";
  let cached = [];
  try{
    cached = JSON.parse(localStorage.getItem(cacheKey) || "[]");
  }catch(e){
    cached = [];
  }
  const cleaned = Array.isArray(cached)
    ? cached.filter(p => String(p.email || "").trim())
    : [];
  
  // If cache is empty, use default profiles
  if (cleaned.length === 0) {
    const defaultProfiles = gender === "men" ? MEN_LIST : WOMEN_LIST;
    state.all = stripCurrentUser(defaultProfiles);
  } else {
    state.all = stripCurrentUser(cleaned);
  }
  
  localStorage.setItem("dateme_profiles", JSON.stringify(state.all));
  const menToggle = $("menToggle");
  if (menToggle) menToggle.textContent = gender === "men" ? "For Women" : "For Men";
  renderStories();
  setRandomOnline();
  initNearLine();
}

function mergeCustomProfiles(list, gender){
  let custom = [];
  try{
    custom = JSON.parse(localStorage.getItem("dateme_custom_profiles") || "[]");
  }catch(e){
    custom = [];
  }
  if (!Array.isArray(custom) || !custom.length) return list;
  const filtered = custom.filter(p => (p.gender || "women") === gender);
  if (!filtered.length) return list;
  const mapped = filtered.map((p) => ({
    id: p.id || `u-${Date.now()}`,
    name: p.name || "New User",
    age: Number(p.age) || 22,
    country: p.country || "",
    city: p.city || "",
    email: p.email || "",
    online: true,
    tags: Array.isArray(p.tags) && p.tags.length ? p.tags : ["New"],
    img: p.img || "https://via.placeholder.com/80?text=User"
  }));
  return mapped.concat(list);
}

function renderStories(){
  const stories = $("stories");
  if (!stories) return;
  const list = loadStories();
  
  // Get current user
  const currentUser = (() => {
    try {
      const u = localStorage.getItem("dateme_current_user");
      return u ? JSON.parse(u) : null;
    } catch(e) { return null; }
  })();
  
  const addStory = `
    <div class="story story--add" data-add-story="1">
      <div class="story__ring"><span class="story__plus">＋</span></div>
      <div class="story__name">Your Story</div>
    </div>
  `;
  
  // Filter out current user's own story and show only other users' uploaded stories
  const otherUsersStories = list.filter(s => {
    // Show story if it's not from current user
    return !currentUser || s.uploadedBy !== currentUser.id;
  });
  
  const customStories = otherUsersStories.map(s => `
    <div class="story" data-story-type="custom" data-story-id="${s.id}">
      <div class="story__ring"><img src="${s.media || s.img}" alt="${s.name}" loading="lazy"/></div>
      <div class="story__name">${s.name}</div>
    </div>
  `);
  
  stories.innerHTML = [addStory, ...customStories].join("");
  stories.querySelectorAll(".story").forEach(el => {
    if (el.getAttribute("data-add-story") === "1"){
      el.onclick = () => {
        const input = $("storyInput");
        if (input) input.click();
      };
      return;
    }
    const type = el.getAttribute("data-story-type");
    if (type === "custom"){
      el.onclick = () => {
        const id = el.getAttribute("data-story-id");
        const item = list.find(s => s.id === id);
        if (item) openStoryModal({ 
          name: item.name, 
          media: item.media || item.img,
          type: item.type || "image",
          uploadedBy: item.uploadedBy,
          storyId: item.id,
          reactions: item.reactions || {}
        });
      };
      return;
    }
  });
}

function initRandomOnlineStatus(){
  const now = Date.now();
  const nextTs = Number(localStorage.getItem(`${STATUS_NEXT_KEY}_${state.gender}`) || "0");
  if (!nextTs || now >= nextTs){
    setRandomOnline();
  } else {
    const activeIds = safeParse(localStorage.getItem(`${STATUS_KEY}_${state.gender}`)) || [];
    if (activeIds.length) {
      state.all.forEach(p => { p.online = activeIds.includes(p.id); });
    } else {
      setRandomOnline();
    }
  }
  scheduleNextStatusChange();
}

function setRandomOnline(){
  if (!state.all.length) return;
  const prevIds = safeParse(localStorage.getItem(`${STATUS_KEY}_${state.gender}`)) || [];
  const count = Math.max(1, Math.round(state.all.length * 0.65));
  const picks = pickRandomIds(state.all.map(p => p.id), count);
  state.all.forEach(p => { p.online = picks.includes(p.id); });
  localStorage.setItem(`${STATUS_KEY}_${state.gender}`, JSON.stringify(picks));
  updateLastSeen(prevIds, picks);
  const next = Date.now() + randMs(STATUS_MIN_MS, STATUS_MAX_MS);
  localStorage.setItem(`${STATUS_NEXT_KEY}_${state.gender}`, String(next));
}

function scheduleNextStatusChange(){
  const now = Date.now();
  const nextTs = Number(localStorage.getItem(`${STATUS_NEXT_KEY}_${state.gender}`) || "0");
  const wait = Math.max(1000, nextTs - now);
  setTimeout(() => {
    setRandomOnline();
    applyFilters();
    scheduleNextStatusChange();
  }, wait);
}

function randMs(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomIds(arr, count){
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function updateLastSeen(prevIds, nextIds){
  const map = safeParse(localStorage.getItem(LAST_SEEN_KEY)) || {};
  const nextSet = new Set(nextIds);
  prevIds.forEach(id => {
    if (!nextSet.has(id)) map[profileKey(id)] = Date.now();
  });
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(map));
}

function initLikeCounts(){
  // Initialize empty like map - no auto-likes
  // Like structure: { "userId-profileId-imageIndex": true }
  const map = safeParse(localStorage.getItem(LIKE_KEY)) || {};
  state.likes = map;
}

function profileKey(id){
  return `${state.gender}-${id}`;
}

function applyFilters(){
  const qRaw = ($("q")?.value) || "";
  const q = qRaw.replace(/^@+/, "").trim().toLowerCase();
  const minAge = Number(($("minAge")?.value) || 18);
  const maxAge = Number(($("maxAge")?.value) || 80);
  const online = ($("online")?.value) || "all";
  const sort = ($("sort")?.value) || "new";

  let arr = state.all.filter(p => {
    const uname = (p.username || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    // Search in both username and name
    const matchQ = !q || uname.includes(q) || name.includes(q);
    const matchAge = p.age >= minAge && p.age <= maxAge;
    const matchOnline = online === "all" ? true : p.online === true;
    return matchQ && matchAge && matchOnline;
  });

  if (sort === "ageAsc") arr.sort((a,b)=>a.age-b.age);
  if (sort === "ageDesc") arr.sort((a,b)=>b.age-a.age);

  state.filtered = arr;
  state.page = 0;

  const emptyState = document.getElementById("emptyState");
  const storiesEl = document.getElementById("stories");
  const isEmpty = state.filtered.length === 0;
  if (emptyState){
    const titleEl = emptyState.querySelector(".emptyState__title");
    const bodyEl = emptyState.querySelector(".muted");
    if (titleEl) titleEl.textContent = q ? "No results found" : "No users yet";
    if (bodyEl) bodyEl.textContent = q ? "Try another name." : "Be the first to join and your card will appear here.";
  }
  if (emptyState) emptyState.style.display = isEmpty ? "block" : "none";
  if (storiesEl) storiesEl.style.display = isEmpty ? "none" : "flex";
  renderFirstPage();
}

function initNearLine(){
  const profile = readActiveProfile();
  const country = String(profile.country || "").trim();
  const city = String(profile.city || "").trim();
  if (!country || !city) return;
  const pool = state.all
    .filter(p => String(p.country || "").trim().toLowerCase() === country.toLowerCase())
    .map(p => String(p.city || "").trim())
    .filter(c => c && c.toLowerCase() !== city.toLowerCase());
  if (pool.length){
    state.nearCity = pool[Math.floor(Math.random() * pool.length)];
  } else {
    state.nearCity = city;
  }
  state.nearIds = pickRandomIds(state.all.map(p => p.id), 7);
  state.nearReady = true;
}

function renderFirstPage(){
  const grid = $("grid");
  if (grid) grid.innerHTML = "";
  loadMore(true);
}

function loadMore(reset=false){
  const grid = $("grid");
  if (!grid) return;

  const spinner = $("spinner");
  if (spinner) spinner.style.display = "inline-block";

  setTimeout(()=> {
    const start = state.page * state.pageSize;
    const end = start + state.pageSize;
    const chunk = state.filtered.slice(start, end);

    grid.insertAdjacentHTML("beforeend", chunk.map(cardHTML).join(""));

    state.page += 1;

    // bind open modal
    chunk.forEach(p => {
      const el = document.querySelector(`[data-card="${p.id}"]`);
      if (el) el.onclick = () => openModal(p);
    });

    if (spinner) spinner.style.display = "none";

    const btn = $("loadMoreBtn");
    if (btn) btn.style.display = (end >= state.filtered.length) ? "none" : "inline-block";
  }, reset ? 150 : 350);
}

function cardHTML(p){
  // Count actual likes for this profile (any picture)
  const likeKeyPrefix = profileKey(p.id) + "-";
  const likes = Object.keys(state.likes)
    .filter(k => k.startsWith(likeKeyPrefix))
    .length;
  const displayCity = String(p.city || "").trim() || "Unknown City";
  const displayCountry = String(p.country || "").trim() || "Unknown Country";
  const showNear = state.nearReady && state.nearIds.includes(p.id);
  const km = 10 + randInt(0, 5);
  const nearLine = showNear ? `<div class="pcard__near">📍 Near: ${state.nearCity} (${km} km)</div>` : "";
  return `
    <article class="pcard" data-card="${p.id}">
      <img src="${p.img}" alt="${p.name}" loading="lazy" />
      <div class="pcard__body">
        <div class="pcard__name">
          <span>${p.name}, ${p.age}</span>
          <span class="tag ${p.online ? "online":""}">
            ${p.online ? "Online" : "Offline"}
          </span>
        </div>
        <div class="pcard__likes">❤ ${likes}</div>

        <div class="pcard__sub">${displayCity}, ${displayCountry}</div>
        ${nearLine}

        <div class="pcard__tags">
          ${p.tags.map(t => `<span class="tag">${t}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function openModal(p){
  // go directly to profile view
  location.href = `profile-view.html?gender=${encodeURIComponent(state.gender)}&id=${encodeURIComponent(p.id)}`;
  return;

  if ($("mImg")) $("mImg").src = p.img;
  if ($("mName")) $("mName").textContent = `${p.name}, ${p.age}`;
  if ($("mMeta")) $("mMeta").textContent = `${p.city}, ${p.country} • ${p.online ? "Online now" : "Offline"}`;
  if ($("mChips")) $("mChips").innerHTML = p.tags.map(x => `<span class="chip">${x}</span>`).join("");
  if ($("mBadge")) $("mBadge").classList.toggle("show", !!p.online);

  // ✅ Modal chat button → inbox redirect (thread create, no welcome msg)
  const chatBtn = $("chatBtn");
  if (chatBtn){
    chatBtn.onclick = () => {
      // keep profiles updated
      localStorage.setItem("dateme_profiles", JSON.stringify(state.all));

      const store = safeParse(localStorage.getItem("dateme_store")) || {};
      store.chats = store.chats || {};
      const key = String(p.id);

      if (!store.chats[key]) store.chats[key] = []; // create empty thread
      localStorage.setItem("dateme_store", JSON.stringify(store));

      location.href = `inbox.html?id=${encodeURIComponent(key)}`;
    };
  }

  // like button (pop + animation)
  const likeBtn = $("likeBtn");
  if (likeBtn){
    likeBtn.onclick = (e) => {
      e.stopPropagation();
      likeBtn.classList.add("liked");
      showLikePop();
    };
  }

  const modal = $("modal");
  if (modal) modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal(){
  const modal = $("modal");
  if (modal) modal.classList.remove("show");
  document.body.style.overflow = "";
}

function showLikePop(){
  let pop = document.querySelector(".likePop");
  if (!pop){
    pop = document.createElement("div");
    pop.className = "likePop";
    pop.textContent = "Liked 💗";
    document.body.appendChild(pop);
  }
  pop.classList.remove("show");
  void pop.offsetWidth;
  pop.classList.add("show");
  setTimeout(() => pop.classList.remove("show"), 1400);
}

function openStoryModal(p){
  const imgEl = $("storyModalImg");
  const videoEl = $("storyModalVideo");
  const timerEl = $("storyModalTimer");
  const nameEl = $("storyModalName");
  const lock = document.querySelector(".storyModal__lock");
  const info = document.querySelector(".storyModal__info .muted");
  const reactBtn = $("storyReactBtn");
  const deleteBtn = $("storyDeleteBtn");
  
  // Get current user
  const currentUser = (() => {
    try {
      const u = localStorage.getItem("dateme_current_user");
      return u ? JSON.parse(u) : null;
    } catch(e) { return null; }
  })();
  
  const unlocked = hasUpgrade();
  
  // Set name
  if (nameEl) nameEl.textContent = p ? `${p.name}'s Story` : "Story";
  
  // Handle media display
  if (p?.type === "video" && videoEl) {
    if (imgEl) imgEl.style.display = "none";
    videoEl.style.display = "block";
    videoEl.src = p.media;
    videoEl.controls = false;
    videoEl.muted = true;
    
    // Setup 30 second timer for video
    if (timerEl) {
      timerEl.style.display = "block";
      let remaining = 30;
      timerEl.textContent = `${remaining}s`;
      
      const interval = setInterval(() => {
        remaining--;
        timerEl.textContent = `${remaining}s`;
        if (remaining <= 0) {
          clearInterval(interval);
          closeStoryModal();
        }
      }, 1000);
      
      videoEl.play();
    }
  } else if (p?.media && imgEl) {
    if (videoEl) videoEl.style.display = "none";
    imgEl.style.display = "block";
    imgEl.src = p.media;
    if (timerEl) timerEl.style.display = "none";
  }
  
  // Show/hide lock based on upgrade status
  if (lock) lock.style.display = unlocked ? "none" : "flex";
  if (info) info.textContent = unlocked ? "Enjoy the story." : "Stories are premium-only. Upgrade to view.";
  
  // Show delete button only if current user is owner
  if (deleteBtn) {
    if (currentUser && p?.uploadedBy === currentUser.id) {
      deleteBtn.style.display = "block";
      deleteBtn.onclick = () => {
        if (confirm("Delete this story?")) {
          const list = loadStories();
          const updated = list.filter(s => s.id !== p.storyId);
          saveStories(updated);
          renderStories();
          closeStoryModal();
        }
      };
    } else {
      deleteBtn.style.display = "none";
    }
  }
  
  // Show react button only if user is upgraded AND not owner
  if (reactBtn) {
    if (unlocked && currentUser && p?.uploadedBy !== currentUser.id) {
      reactBtn.style.display = "block";
      const userReaction = p?.reactions?.[currentUser.id];
      reactBtn.textContent = userReaction ? `${userReaction} Reacted` : "👍 React";
      
      reactBtn.onclick = () => {
        const list = loadStories();
        const story = list.find(s => s.id === p.storyId);
        if (story) {
          if (!story.reactions) story.reactions = {};
          if (story.reactions[currentUser.id]) {
            delete story.reactions[currentUser.id];
          } else {
            story.reactions[currentUser.id] = "👍";
          }
          saveStories(list);
          reactBtn.textContent = story.reactions[currentUser.id] ? "👍 Reacted" : "👍 React";
        }
      };
    } else {
      reactBtn.style.display = "none";
    }
  }
  
  const modal = $("storyModal");
  if (modal) modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeStoryModal(){
  const modal = $("storyModal");
  if (modal) modal.classList.remove("show");
  
  // Stop video
  const videoEl = $("storyModalVideo");
  if (videoEl) {
    videoEl.pause();
    videoEl.src = "";
  }
  
  // Clear timer
  const timerEl = $("storyModalTimer");
  if (timerEl) timerEl.style.display = "none";
  
  document.body.style.overflow = "";
}

function safeParse(s){
  try { return JSON.parse(s || ""); } catch(e){ return null; }
}

function getUserKey(){
  const active = getActiveEmail();
  if (active) return active;
  const profile = readActiveProfile();
  const email = String(profile?.email || "").trim().toLowerCase();
  if (email) return email;
  return "guest";
}

function getStoreKey(){
  return `dateme_store_${getUserKey()}`;
}

function getNotificationsKey(){
  return `dateme_notifications_${getUserKey()}`;
}

function getUnreadCount(){
  const store = safeParse(localStorage.getItem(getStoreKey())) || {};
  const chats = store.chats || {};
  const read = store.read || {};
  let total = 0;
  Object.keys(chats).forEach((k) => {
    const msgs = chats[k] || [];
    const lastRead = Number(read[k] || 0);
    msgs.forEach((m) => {
      if (m.from === "me") return;
      const at = Number(m.at || 0);
      if (at > lastRead) total += 1;
    });
  });
  return total;
}

function getUnreadNotificationCount(){
  let items = [];
  try{ items = JSON.parse(localStorage.getItem(getNotificationsKey()) || "[]"); }catch(e){ items = []; }
  return items.filter((n) => !n.read).length;
}

function updateNotificationBadge(){
  const badge = $("notifBadge");
  if (!badge) return;
  const count = getUnreadCount() + getUnreadNotificationCount();
  if (count > 0){
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.add("show");
  } else {
    badge.classList.remove("show");
  }
}

document.addEventListener("DOMContentLoaded", init);
