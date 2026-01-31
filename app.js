
const $ = (id) => document.getElementById(id);

const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                  window.innerWidth <= 768;

// Performance: In-memory cache for localStorage
const memoryCache = {
  profiles: null,
  men: null,
  women: null,
  likes: null,
  lastSeenMap: null
};

// Optimized localStorage getter with caching
function getCached(key, cacheProp) {
  if (memoryCache[cacheProp]) return memoryCache[cacheProp];
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    memoryCache[cacheProp] = data;
    return data;
  } catch(e) {
    return [];
  }
}

// Optimized localStorage setter with caching
function setCached(key, data, cacheProp) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    if (cacheProp) memoryCache[cacheProp] = data;
  } catch(e) {
    console.error("Failed to save to localStorage:", e);
  }
}

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

const DEMO = [
  { name:"Sarah Williams", age:25, country:"India", city:"Delhi", online:true, tags:["Photography","Travel","Books"], img:"assets/profile-01.jpg" },
  { name:"Sophia Martinez", age:23, country:"India", city:"Mumbai", online:true, tags:["Dance","Travel","Food"], img:"https://randomuser.me/api/portraits/women/25.jpg" },
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
  try {
    list = JSON.parse(localStorage.getItem(STORIES_KEY) || "[]");
  } catch(e) {
    list = [];
  }
  
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
  
  const isOnline = u.is_online === 1 || u.is_online === true;
  
  return {
    id: `db-${u.id || hashString(seed)}`,
    name: u.name || u.username || "New User",
    username: u.username || "",
    age: Number(u.age) || 22,
    country: u.country || "",
    city: u.city || "",
    email: u.email || "",
    gender,
    online: isOnline,
    lastSeen: u.last_seen || null,
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
  return list.filter(p => {
    const userGender = normalizeGender(p.gender);
    return !userGender || userGender === gender;
  });
}

async function loadRemoteUsers(){
  let list = readRemoteCache();
  try{
    const res = await fetch(`${API_BASE}/get_users.php`);
    const data = await res.json();
    if (Array.isArray(data.users)){
      list = data.users;
      saveRemoteCache(list);
      
      updateProfilePhotosInState(list);
      
      return list;
    }
  }catch(e){
    console.error("Error fetching remote users:", e);
  }
  return Array.isArray(list) ? list : [];
}

function updateProfilePhotosInState(serverUsers){
  if (!Array.isArray(serverUsers)) return;
  
  state.all = state.all.map(profile => {
    const serverUser = serverUsers.find(u => 
      String(u.email || "").toLowerCase() === String(profile.email || "").toLowerCase()
    );
    
    if (serverUser && serverUser.photo) {
      return { ...profile, img: serverUser.photo };
    }
    return profile;
  });
  
  localStorage.setItem("dateme_profiles", JSON.stringify(state.all));
}

async function refreshProfilePhotosOnly(){
  try {
    const res = await fetch(`${API_BASE}/get_users.php`);
    const data = await res.json();
    
    if (data.ok && Array.isArray(data.users)) {
      updateProfilePhotosInState(data.users);
      
      data.users.forEach(user => {
        const email = String(user.email || "").toLowerCase();
        if (user.photo) {
          document.querySelectorAll(`img[data-user-email="${email}"]`).forEach(img => {
            img.src = user.photo;
          });
        }
      });
    }
  } catch (err) {
    console.log("Photo refresh skipped");
  }
}

async function setCurrentUserOnline() {
  const activeEmail = localStorage.getItem("dateme_active_user");
  if (!activeEmail) return;
  
  const API_BASE = window.API_BASE || "";
  if (!API_BASE) return;
  
  try {
    await fetch(`${API_BASE}/api/update_online_status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: activeEmail.toLowerCase(),
        is_online: true
      })
    });
    
    setInterval(() => {
      const email = localStorage.getItem("dateme_active_user");
      if (email) {
        fetch(`${API_BASE}/api/update_online_status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.toLowerCase(),
            is_online: true
          })
        }).catch(() => {});
      }
    }, 5 * 60 * 1000); // 5 minutes
  } catch (err) {
  }
}

function stripCurrentUser(list){
  const currentEmail = getCurrentEmail();
  if (!currentEmail) return list;
  return list.filter(
    (p) => String(p.email || "").trim().toLowerCase() !== String(currentEmail).trim().toLowerCase()
  );
}

function restoreDefaultProfiles(){
  const menListWithGender = MEN_LIST.map(p => ({ ...p, gender: p.gender || "men" }));
  const womenListWithGender = WOMEN_LIST.map(p => ({ ...p, gender: p.gender || "women" }));
  
  localStorage.setItem("dateme_profiles_women", JSON.stringify(womenListWithGender));
  localStorage.setItem("dateme_profiles_men", JSON.stringify(menListWithGender));
  
  // Combine both genders for display
  state.all = [...menListWithGender, ...womenListWithGender];
  localStorage.setItem("dateme_profiles", JSON.stringify(state.all));
}

async function syncRemoteProfiles(gender){
  const users = await loadRemoteUsers();
  if (!users.length) {
    // Use cached data instead of parsing localStorage each time
    const cachedMen = getCached("dateme_profiles_men", "men");
    const cachedWomen = getCached("dateme_profiles_women", "women");
    
    if (!cachedMen.length && !cachedWomen.length) {
      restoreDefaultProfiles();
    }
    return;
  }
  const allProfiles = normalizeRemoteProfiles(users);
  const menList = filterProfilesByGender(allProfiles, "men");
  const womenList = filterProfilesByGender(allProfiles, "women");
  
  // Add gender field to profiles
  const menListWithGender = menList.map(p => ({ ...p, gender: p.gender || "men" }));
  const womenListWithGender = womenList.map(p => ({ ...p, gender: p.gender || "women" }));
  
  // Save both lists separately with caching
  setCached("dateme_profiles_all", allProfiles, null);
  setCached("dateme_profiles_men", menListWithGender, "men");
  setCached("dateme_profiles_women", womenListWithGender, "women");
  
  // Load only the selected gender for display
  const selectedList = gender === "men" ? menListWithGender : womenListWithGender;
  state.all = stripCurrentUser(selectedList);
  setCached("dateme_profiles", state.all, "profiles");
  
  renderStories();
  applyFilters();
}

function init(){
  syncUserAvatar();
  showWelcome();
  showUserWelcome();
  showUpgradeCongrats();
  updateNotificationBadge();
  updateInboxBadge();
  
  setCurrentUserOnline();

  const savedGender = localStorage.getItem(GENDER_KEY);
  if (savedGender === "men") state.gender = "men";
  
  // Load only the selected gender profiles
  const cacheKey = state.gender === "men" ? "dateme_profiles_men" : "dateme_profiles_women";
  let selectedProfiles = [];
  
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "[]");
    selectedProfiles = Array.isArray(cached) && cached.length > 0 ? cached : (state.gender === "men" ? MEN_LIST : WOMEN_LIST);
  } catch(e) {
    selectedProfiles = state.gender === "men" ? MEN_LIST : WOMEN_LIST;
  }
  
  // Add gender field to profiles if not present
  selectedProfiles = selectedProfiles.map(p => ({ ...p, gender: p.gender || state.gender }));
  
  // Set state.all to only selected gender
  state.all = stripCurrentUser(selectedProfiles);
  localStorage.setItem("dateme_profiles", JSON.stringify(state.all));

  initLikeCounts();

  renderStories();

  initRandomOnlineStatus();

  applyFilters();
  
  const menToggle = $("menToggle");
  if (menToggle) {
    menToggle.textContent = state.gender === "men" ? "👩 Show Women" : "👨 Show Men";
    
    menToggle.onclick = () => {
      const next = state.gender === "women" ? "men" : "women";
      setGender(next);
      
      // Load the selected gender profiles only
      const cacheKey = next === "men" ? "dateme_profiles_men" : "dateme_profiles_women";
      let profiles = [];
      try {
        profiles = JSON.parse(localStorage.getItem(cacheKey) || "[]");
        if (!profiles.length) {
          profiles = next === "men" ? MEN_LIST : WOMEN_LIST;
        }
      } catch(e) {
        profiles = next === "men" ? MEN_LIST : WOMEN_LIST;
      }
      
      // Add gender field
      profiles = profiles.map(p => ({ ...p, gender: p.gender || next }));
      state.all = stripCurrentUser(profiles);
      localStorage.setItem("dateme_profiles", JSON.stringify(state.all));
      
      menToggle.textContent = next === "men" ? "👩 Show Women" : "👨 Show Men";
      
      initLikeCounts();
      initRandomOnlineStatus();
      applyFilters();
      syncRemoteProfiles(next);
    };
  }
  
  setTimeout(() => {
    syncRemoteProfiles(state.gender);
  }, 500);
  
  setInterval(() => {
    refreshProfilePhotosOnly();
  }, 30000);

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

  if ($("modalClose")) $("modalClose").onclick = closeModal;
  if ($("modalX")) $("modalX").onclick = closeModal;

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
      
      const maxImageSize = 5 * 1024 * 1024; // 5MB for images
      const maxVideoSize = 50 * 1024 * 1024; // 50MB for videos
      const maxSize = isImage ? maxImageSize : maxVideoSize;
      
      if (file.size > maxSize){
        alert(`File too large. Images: max 5MB, Videos: max 50MB.`);
        storyInput.value = "";
        return;
      }
      
      if (isImage){
        const canvas = document.createElement("canvas");
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > 800 || height > 800){
            const ratio = Math.min(800 / width, 800 / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
          saveStory(file, compressedDataUrl, isVideo);
        };
        img.onerror = () => {
          const reader = new FileReader();
          reader.onload = () => saveStory(file, reader.result, isVideo);
          reader.readAsDataURL(file);
        };
        img.src = URL.createObjectURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => saveStory(file, reader.result, isVideo);
        reader.readAsDataURL(file);
      }
    });
  }
  
  function saveStory(file, dataUrl, isVideo){
    const profile = readActiveProfile();
    const email = getActiveEmail() || String(profile.email || "").trim().toLowerCase();
    
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
    const storyInput = $("storyInput");
    if (storyInput) storyInput.value = "";
  }

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
    // Add timestamp to prevent caching old image
    img.src = data.photo.includes('data:') ? data.photo : data.photo + '?t=' + Date.now();
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
  
  // Use memory cache for faster loading
  const cached = getCached(cacheKey, gender === "men" ? "men" : "women");
  
  const cleaned = Array.isArray(cached)
    ? cached.filter(p => String(p.email || "").trim())
    : [];
  
  if (cleaned.length === 0) {
    const defaultProfiles = gender === "men" ? MEN_LIST : WOMEN_LIST;
    state.all = stripCurrentUser(defaultProfiles.map(p => ({ ...p, gender: p.gender || gender })));
  } else {
    state.all = stripCurrentUser(cleaned.map(p => ({ ...p, gender: p.gender || gender })));
  }
  
  setCached("dateme_profiles", state.all, "profiles");
  const menToggle = $("menToggle");
  if (menToggle) menToggle.textContent = gender === "men" ? "👩 Show Women" : "👨 Show Men";
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
  
  loadStoriesFromBackend().then(() => {
    displayStoriesUI();
  }).catch(err => {
    console.error("Failed to load stories:", err);
    displayStoriesUI(); 
  });
}

async function loadStoriesFromBackend(){
  try {
    const res = await fetch(`${API_BASE}/get_stories.php`);
    const json = await res.json();
    if (json.ok && Array.isArray(json.stories)) {
      const transformedStories = json.stories.map(s => ({
        id: `story_${s.id}`,
        storyId: s.id, 
        name: s.username || "User",
        img: s.photo || "",
        media: s.story_image,
        type: s.story_image.startsWith("data:video") ? "video" : "image",
        uploadedBy: s.email,
        expiresAt: new Date(s.created_at).getTime() + STORY_TTL_MS,
        reactions: {},
        comments: []
      }));
      
      
      saveStories(transformedStories);
    }
  } catch (err) {
    console.error("Error loading stories from backend:", err);
  }
}

function displayStoriesUI(){
  const stories = $("stories");
  if (!stories) return;
  
  let list = [];
  try {
    
    const allStories = JSON.parse(localStorage.getItem(STORIES_KEY) || "[]");
    const now = Date.now();
    list = Array.isArray(allStories) 
      ? allStories.filter(s => (s.expiresAt || 0) > now).slice(0, 50)
      : [];
  } catch(e) {
    list = [];
  }
  
  
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
  
  
  const otherUsersStories = list.filter(s => {
    
    return !currentUser || s.uploadedBy !== currentUser.email;
  });
  
  
  const customStories = otherUsersStories.slice(0, 30).map(s => `
    <div class="story" data-story-type="custom" data-story-id="${s.id}">
      <div class="story__ring"><img src="${s.img || s.media}" alt="${s.name}" loading="lazy" decoding="async"/></div>
      <div class="story__name">${s.name}</div>
    </div>
  `);
  
  stories.innerHTML = [addStory, ...customStories].join("");
  
  
  const fullList = loadStories();
  
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
        const item = fullList.find(s => s.id === id);
        if (item) openStoryModal({ 
          name: item.name, 
          media: item.media || item.img,
          type: item.type || "image",
          uploadedBy: item.uploadedBy,
          storyId: item.storyId || item.id, 
          localId: item.id, 
          reactions: item.reactions || {},
          comments: item.comments || []
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
    
    const matchQ = !q || uname.includes(q) || name.includes(q);
    const matchAge = p.age >= minAge && p.age <= maxAge;
    const matchOnline = online === "all" ? true : p.online === true;
    return matchQ && matchAge && matchOnline;
  });

  if (sort === "ageAsc") arr.sort((a,b)=>a.age-b.age);
  if (sort === "ageDesc") arr.sort((a,b)=>b.age-a.age);

  // Apply profile limit based on user plan with gender-based limits
  const hasUpgrade = localStorage.getItem("dateme_upgrade_verified") === "true";
  let profileLimitPerGender = 10; // free: 10 profiles per gender
  if (hasUpgrade) {
    const userPlan = localStorage.getItem("dateme_selected_plan") || "basic";
    if (userPlan === "basic") {
      profileLimitPerGender = 50;
    } else if (userPlan === "premium") {
      profileLimitPerGender = 100;
    }
  }
  
  // Separate profiles by gender
  const maleProfiles = arr.filter(p => normalizeGender(p.gender) === "men");
  const femaleProfiles = arr.filter(p => normalizeGender(p.gender) === "women");
  const otherProfiles = arr.filter(p => {
    const g = normalizeGender(p.gender);
    return !g || (g !== "men" && g !== "women");
  });
  
  // Apply gender-specific limits
  const limitedMales = maleProfiles.slice(0, profileLimitPerGender);
  const limitedFemales = femaleProfiles.slice(0, profileLimitPerGender);
  const limitedOthers = otherProfiles.slice(0, profileLimitPerGender);
  
  // Combine limited profiles
  arr = [...limitedMales, ...limitedFemales, ...limitedOthers];
  
  const totalAvailable = maleProfiles.length + femaleProfiles.length + otherProfiles.length;
  
  // Store info for upgrade prompt
  state.totalAvailable = totalAvailable;
  state.profileLimit = profileLimitPerGender * 2; // Total shown (male + female)
  state.currentPlan = hasUpgrade ? localStorage.getItem("dateme_selected_plan") : "free";

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
  if (grid) {
    // Remove initial loader
    const loader = document.getElementById("gridLoader");
    if (loader) loader.remove();
    grid.innerHTML = "";
  }
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

    
    chunk.forEach(p => {
      const el = document.querySelector(`[data-card="${p.id}"]`);
      if (el) el.onclick = () => openModal(p);
    });

    if (spinner) spinner.style.display = "none";

    const btn = $("loadMoreBtn");
    if (btn) btn.style.display = (end >= state.filtered.length) ? "none" : "inline-block";
    
    // Show upgrade prompt if user reached their plan limit
    if (end >= state.filtered.length && state.totalAvailable > state.profileLimit) {
      const remaining = state.totalAvailable - state.profileLimit;
      const upgradeHTML = `
        <div class="upgrade-prompt" style="grid-column: 1/-1; text-align: center; padding: 30px 20px; background: rgba(255,79,216,.1); border: 2px solid rgba(255,79,216,.3); border-radius: 16px; margin-top: 20px;">
          <div style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">🔒 ${remaining} More Profiles Available</div>
          <div style="color: var(--muted); margin-bottom: 16px;">
            ${state.currentPlan === 'free' ? 'Upgrade to Basic ($14) to see 50 profiles or Premium ($30) to see 100 profiles' : 
              state.currentPlan === 'basic' ? 'Upgrade to Premium ($30) to see 100 profiles' : ''}
          </div>
          <a href="profile-upgrade.html" class="btn primary" style="display: inline-block; padding: 12px 24px; text-decoration: none;">
            Upgrade Now
          </a>
        </div>
      `;
      grid.insertAdjacentHTML("beforeend", upgradeHTML);
    }
  }, 0);
}

function cardHTML(p){
  
  const likeKeyPrefix = profileKey(p.id) + "-";
  const likes = Object.keys(state.likes)
    .filter(k => k.startsWith(likeKeyPrefix))
    .length;
  const displayCity = String(p.city || "").trim() || "Unknown City";
  const displayCountry = String(p.country || "").trim() || "Unknown Country";
  const showNear = state.nearReady && state.nearIds.includes(p.id);
  const km = 10 + randInt(0, 5);
  const nearLine = showNear ? `<div class="pcard__near">📍 Near: ${state.nearCity} (${km} km)</div>` : "";
  const userEmail = String(p.email || "").toLowerCase();
  return `
    <article class="pcard" data-card="${p.id}">
      <img src="${p.img}" alt="${p.name}" loading="eager" fetchpriority="high" data-user-email="${userEmail}" onerror="this.src='https://via.placeholder.com/400x500?text=No+Image'" />
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
        <div class="pcard__actions" style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="btn" style="flex: 1; padding: 8px 12px; font-size: 13px; font-weight: 600;" onclick="event.stopPropagation(); window.location.href='inbox.html?chat=${encodeURIComponent(userEmail)}'">💬 Chat</button>
          <button class="btn primary" style="flex: 1; padding: 8px 12px; font-size: 13px; font-weight: 600;" onclick="event.stopPropagation(); window.location.href='profile-view.html?id=${encodeURIComponent(p.id)}'">👤 View</button>
        </div>
      </div>
    </article>
  `;
}

function openModal(p){
  
  location.href = `profile-view.html?id=${encodeURIComponent(p.id)}`;
  return;

  if ($("mImg")) $("mImg").src = p.img;
  if ($("mName")) $("mName").textContent = `${p.name}, ${p.age}`;
  if ($("mMeta")) $("mMeta").textContent = `${p.city}, ${p.country} • ${p.online ? "Online now" : "Offline"}`;
  if ($("mChips")) $("mChips").innerHTML = p.tags.map(x => `<span class="chip">${x}</span>`).join("");
  if ($("mBadge")) $("mBadge").classList.toggle("show", !!p.online);

  
  const chatBtn = $("chatBtn");
  if (chatBtn){
    chatBtn.onclick = () => {
      
      localStorage.setItem("dateme_profiles", JSON.stringify(state.all));

      const store = safeParse(localStorage.getItem("dateme_store")) || {};
      store.chats = store.chats || {};
      const key = String(p.id);

      if (!store.chats[key]) store.chats[key] = []; 
      localStorage.setItem("dateme_store", JSON.stringify(store));

      location.href = `inbox.html?id=${encodeURIComponent(key)}`;
    };
  }

  
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
  const commentBtn = $("storyCommentBtn");
  const deleteBtn = $("storyDeleteBtn");
  
  
  const currentUserEmail = String(localStorage.getItem("dateme_active_user") || "").trim().toLowerCase();
  const currentUserProfile = (() => {
    try {
      if (currentUserEmail) {
        return JSON.parse(localStorage.getItem(`dateme_profile_${currentUserEmail}`) || "{}");
      }
      return JSON.parse(localStorage.getItem("dateme_profile") || "{}");
    } catch(e) { return {}; }
  })();
  
  const unlocked = hasUpgrade();
  const isOwner = currentUserEmail && p?.uploadedBy === currentUserEmail;
  
 
  if (nameEl) nameEl.textContent = p ? `${p.name}'s Story` : "Story";
  
  
  if (p?.type === "video" && videoEl) {
    if (imgEl) imgEl.style.display = "none";
    videoEl.style.display = "block";
    videoEl.src = p.media;
    videoEl.controls = false;
    videoEl.muted = true;
    
    
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
  
  
  if (lock) lock.style.display = unlocked ? "none" : "flex";
  if (info) info.textContent = unlocked ? "Enjoy the story." : "Stories are premium-only. Upgrade to view.";
  
  
  if (deleteBtn) {
    if (isOwner) {
      deleteBtn.style.display = "inline-block";
      deleteBtn.onclick = async () => {
        if (confirm("Delete this story?")) {
          await deleteStoryFromBackend(p.storyId, currentUserEmail);
          closeStoryModal();
        }
      };
    } else {
      deleteBtn.style.display = "none";
    }
  }
  
  
  if (reactBtn) {
    if (!isOwner && unlocked && currentUserEmail) {
      reactBtn.style.display = "inline-block";
      loadAndDisplayReactions(p.storyId, currentUserEmail);
    } else {
      reactBtn.style.display = "none";
    }
  }
  
   
  if (commentBtn) {
    if (!isOwner && unlocked && currentUserEmail) {
      commentBtn.style.display = "inline-block";
      commentBtn.onclick = () => toggleCommentInput();
      loadAndDisplayComments(p.storyId, currentUserEmail, currentUserProfile);
    } else {
      commentBtn.style.display = "none";
    }
  }
  
  const modal = $("storyModal");
  if (modal) modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

async function deleteStoryFromBackend(storyId, email){
  try {
    // Extract numeric ID from story_123 format
    const numericId = typeof storyId === 'string' && storyId.startsWith('story_') 
      ? parseInt(storyId.replace('story_', ''))
      : storyId;
    
    await fetch(`${API_BASE}/delete_story.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story_id: numericId, email })
    });
    
    
    await loadStoriesFromBackend();
    renderStories();
  } catch (err) {
    console.error("Error deleting story:", err);
    alert("Failed to delete story. Please try again.");
  }
}

async function loadAndDisplayReactions(storyId, currentUserEmail){
  const reactBtn = $("storyReactBtn");
  const reactionsSection = $("storyReactionsSection");
  const reactionsList = $("storyReactionsList");
  const reactionCount = $("storyReactionCount");
  
  if (!reactionsSection || !reactionsList || !reactionCount) return;
  
  try {
    // Extract numeric ID
    const numericId = typeof storyId === 'string' && storyId.startsWith('story_') 
      ? parseInt(storyId.replace('story_', ''))
      : storyId;
    
    const res = await fetch(`${API_BASE}/get_story_reactions.php?story_id=${numericId}`);
    const data = await res.json();
    
    if (data.ok) {
      const userHasReacted = data.reactions.some(r => r.user_email === currentUserEmail);
      
      // Update button
      if (reactBtn) {
        reactBtn.textContent = userHasReacted ? "❤️ Reacted" : "👍 React";
        reactBtn.onclick = () => toggleReaction(numericId, currentUserEmail);
      }
      
      // Show reactions section if there are reactions
      if (data.count > 0) {
        reactionsSection.style.display = "block";
        reactionCount.textContent = data.count;
        reactionsList.innerHTML = data.reactions.map(r => 
          `<span style="font-size:20px;" title="${r.user_email}">${r.reaction}</span>`
        ).join('');
      } else {
        reactionsSection.style.display = "none";
      }
    }
  } catch (err) {
    console.error("Error loading reactions:", err);
  }
}

async function toggleReaction(storyId, userEmail){
  try {
    const res = await fetch(`${API_BASE}/toggle_story_reaction.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story_id: storyId, user_email: userEmail, reaction: "❤️" })
    });
    
    const data = await res.json();
    if (data.ok) {
      // Reload reactions
      loadAndDisplayReactions(storyId, userEmail);
    }
  } catch (err) {
    console.error("Error toggling reaction:", err);
  }
}

async function loadAndDisplayComments(storyId, currentUserEmail, userProfile){
  const commentsSection = $("storyCommentsSection");
  const commentsList = $("storyCommentsList");
  const commentCount = $("storyCommentCount");
  
  if (!commentsSection || !commentsList || !commentCount) return;
  
  try {
    // Extract numeric ID
    const numericId = typeof storyId === 'string' && storyId.startsWith('story_') 
      ? parseInt(storyId.replace('story_', ''))
      : storyId;
    
    const res = await fetch(`${API_BASE}/get_story_comments.php?story_id=${numericId}`);
    const data = await res.json();
    
    if (data.ok) {
      commentsSection.style.display = "block";
      commentCount.textContent = data.count;
      
      if (data.count > 0) {
        commentsList.innerHTML = data.comments.map(c => {
          const timeStr = new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          return `
            <div style="display:flex; gap:8px; padding:8px; background:var(--card); border-radius:8px;">
              <img src="${c.user_photo || 'assets/default-avatar.jpg'}" alt="${c.username}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;" />
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:600; margin-bottom:4px;">${c.username || 'User'}</div>
                <div style="font-size:13px; color:var(--muted);">${c.comment}</div>
                <div style="font-size:11px; color:var(--muted2); margin-top:4px;">${timeStr}</div>
              </div>
            </div>
          `;
        }).join('');
      } else {
        commentsList.innerHTML = '<p style="font-size:13px; color:var(--muted2);">No comments yet. Be the first!</p>';
      }
      
      // Setup comment input
      const commentInputArea = $("storyCommentInputArea");
      const commentInput = $("storyCommentInput");
      const commentSendBtn = $("storyCommentSendBtn");
      
      if (commentSendBtn) {
        commentSendBtn.onclick = () => sendComment(numericId, currentUserEmail, userProfile);
      }
    }
  } catch (err) {
    console.error("Error loading comments:", err);
  }
}

function toggleCommentInput(){
  const commentInputArea = $("storyCommentInputArea");
  if (commentInputArea) {
    const isVisible = commentInputArea.style.display === "block";
    commentInputArea.style.display = isVisible ? "none" : "block";
    if (!isVisible) {
      $("storyCommentInput")?.focus();
    }
  }
}

async function sendComment(storyId, userEmail, userProfile){
  const commentInput = $("storyCommentInput");
  if (!commentInput) return;
  
  const comment = commentInput.value.trim();
  if (!comment) return;
  
  try {
    const res = await fetch(`${API_BASE}/add_story_comment.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story_id: storyId,
        user_email: userEmail,
        username: userProfile.name || "User",
        user_photo: userProfile.img || "",
        comment: comment
      })
    });
    
    const data = await res.json();
    if (data.ok) {
      commentInput.value = "";
      // Reload comments
      loadAndDisplayComments(storyId, userEmail, userProfile);
    }
  } catch (err) {
    console.error("Error sending comment:", err);
  }
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

// Update inbox message count badge
async function updateInboxBadge(){
  const badge = $("inboxBadge");
  if (!badge) return;
  
  const email = String(localStorage.getItem("dateme_active_user") || "").trim().toLowerCase();
  if (!email) return;
  
  try {
    const res = await fetch(`${API_BASE}/get_unread_count.php?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    const count = data.count || 0;
    
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  } catch (e) {
    // Silently fail
  }
}

// Update inbox badge every 30 seconds
setInterval(() => {
  updateInboxBadge();
}, 30000);

// Set user offline when leaving the page
window.addEventListener("beforeunload", async () => {
  const activeEmail = localStorage.getItem("dateme_active_user");
  if (activeEmail) {
    const API_BASE = window.API_BASE || "";
    if (API_BASE) {
      // Use sendBeacon for reliable delivery on page unload
      const blob = new Blob([JSON.stringify({
        email: activeEmail.toLowerCase(),
        is_online: false
      })], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE}/api/update_online_status`, blob);
    }
  }
});

document.addEventListener("DOMContentLoaded", init);
