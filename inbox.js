const $ = (id) => document.getElementById(id);
const DEFAULT_GENDER = "women";
const API_BASE = window.API_BASE || "";
const THREAD_PREFIX = "thread:";

function getActiveEmail(){
  return String(localStorage.getItem("dateme_active_user") || "").trim().toLowerCase();
}

function getCurrentEmail(){
  const active = getActiveEmail();
  if (active) return active;
  const profile = readActiveProfile();
  return String(profile?.email || "").trim().toLowerCase();
}

function readActiveProfile(){
  const email = getActiveEmail();
  if (email){
    try{ return JSON.parse(localStorage.getItem(`dateme_profile_${email}`) || "{}"); }
    catch(e){ return {}; }
  }
  try{ return JSON.parse(localStorage.getItem("dateme_profile") || "{}"); }
  catch(e){ return {}; }
}

function getUserKey(){
  const active = getActiveEmail();
  if (active) return active;
  const profile = readActiveProfile();
  const email = String(profile?.email || "").trim().toLowerCase();
  if (email) return email;
  return "guest";
}

function nowTime(){
  const d = new Date();
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}

function escapeHTML(s){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

function getStoreKey(){
  return `dateme_store_${getUserKey()}`;
}

function loadStore(){
  try{
    return JSON.parse(localStorage.getItem(getStoreKey()) || "{}");
  }catch(e){
    return {};
  }
}
function saveStore(store){
  localStorage.setItem(getStoreKey(), JSON.stringify(store));
}

let store = loadStore();
let activeId = null;
const FREE_MSG_LIMIT = 3;

function hasUpgrade(){
  return localStorage.getItem("dateme_upgrade_verified") === "true";
}

function getFreeMsgCount(){
  return Number(localStorage.getItem("dateme_free_msg_count") || "0");
}

function incrementFreeMsg(){
  localStorage.setItem("dateme_free_msg_count", String(getFreeMsgCount() + 1));
}

function canSendMessage(){
  if (hasUpgrade()) return true;
  return getFreeMsgCount() < FREE_MSG_LIMIT;
}

function formatChatTime(ts){
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return nowTime();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

async function refreshMessagesFromServer(){
  const me = getCurrentEmail();
  if (!me) return;
  try{
    const res = await fetch(`${API_BASE}/get_messages.php?email=${encodeURIComponent(me)}`);
    const data = await res.json();
    if (!Array.isArray(data.messages)) return;
    const nextChats = {};
    data.messages.forEach((m) => {
      const sender = String(m.sender_email || "").trim().toLowerCase();
      const receiver = String(m.receiver_email || "").trim().toLowerCase();
      const key = makeEmailThreadKey(sender, receiver);
      if (!key) return;
      const at = Date.parse(m.created_at) || Date.now();
      const entry = {
        from: sender === me ? "me" : "them",
        text: m.body || "",
        ts: formatChatTime(at),
        at
      };
      if (!nextChats[key]) nextChats[key] = [];
      nextChats[key].push(entry);
    });
    Object.keys(nextChats).forEach((k) => {
      nextChats[k].sort((a, b) => a.at - b.at);
    });
    store = { ...store, chats: nextChats, read: store.read || {} };
    saveStore(store);
  }catch(e){
    // keep local cache
  }
}

async function sendMessageToServer(toEmail, text, profile){
  const senderEmail = getCurrentEmail();
  const receiverEmail = String(toEmail || "").trim().toLowerCase();
  if (!senderEmail || !receiverEmail || !text) return;
  const key = makeEmailThreadKey(senderEmail, receiverEmail);
  const profileName = profile?.name || "";
  const profileImg = profile?.img || "";
  try{
    await fetch(`${API_BASE}/send_message.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_email: senderEmail,
        receiver_email: receiverEmail,
        body: text,
        profile_key: key,
        profile_name: profileName,
        profile_img: profileImg
      })
    });
  }catch(e){
    // ignore send errors for now
  }
}

function showMsgLimitNotice(){
  const modal = document.getElementById("msgLimitNotice");
  if (modal){
    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");
  }
}

// DEMO profiles cache (home.html থেকে set হবে)
// যদি না থাকে, fallback: empty
function getProfiles(){
  try{
    const all = JSON.parse(localStorage.getItem("dateme_profiles_all") || "[]");
    if (Array.isArray(all) && all.length) return all;
    return JSON.parse(localStorage.getItem("dateme_profiles") || "[]");
  }catch(e){
    return [];
  }
}

function getProfilesByGender(gender){
  const key = `dateme_profiles_${gender}`;
  try{
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    if (list.length) return list;
    return getProfiles().filter(p => !p.gender || p.gender === gender);
  }catch(e){
    return getProfiles();
  }
}

function getProfileByEmail(email){
  const target = String(email || "").trim().toLowerCase();
  if (!target) return null;
  return getProfiles().find(p => String(p.email || "").trim().toLowerCase() === target) || null;
}

function getThreadKeys(){
  return Object.keys(store.chats || {});
}

function normalizeChatKeys(){
  const chats = store.chats || {};
  const keys = Object.keys(chats);
  let changed = false;
  keys.forEach((k) => {
    const raw = String(k);
    if (raw.startsWith(THREAD_PREFIX)) return;
    if (raw.includes("@")){
      const me = getCurrentEmail();
      const nextKey = me ? makeEmailThreadKey(me, raw) : "";
      if (nextKey){
        if (!chats[nextKey]) chats[nextKey] = [];
        chats[nextKey] = chats[nextKey].concat(chats[k] || []);
        delete chats[k];
        changed = true;
        return;
      }
    }
    if (!raw.includes("-")){
      const newKey = makeThreadKey(k, DEFAULT_GENDER);
      if (!chats[newKey]) chats[newKey] = [];
      chats[newKey] = chats[newKey].concat(chats[k] || []);
      delete chats[k];
      changed = true;
    }
  });
  if (changed){
    store.chats = chats;
    saveStore(store);
  }
}

function parseThreadKey(key){
  const raw = String(key || "");
  if (raw.startsWith(THREAD_PREFIX)){
    const pair = raw.slice(THREAD_PREFIX.length).split("|").filter(Boolean);
    return { type: "pair", emails: pair };
  }
  const parts = raw.split("-");
  if (parts.length === 2){
    return { type: "legacy", gender: parts[0], id: parts[1] };
  }
  return { type: "legacy", gender: DEFAULT_GENDER, id: raw };
}

function makeThreadKey(id, gender){
  return `${gender || DEFAULT_GENDER}-${id}`;
}

function makeEmailThreadKey(emailA, emailB){
  const a = String(emailA || "").trim().toLowerCase();
  const b = String(emailB || "").trim().toLowerCase();
  if (!a || !b) return "";
  return `${THREAD_PREFIX}${[a, b].sort().join("|")}`;
}

function getOtherEmail(emails){
  const me = getCurrentEmail();
  if (!Array.isArray(emails) || !emails.length) return "";
  if (!me) return emails[0] || "";
  return emails.find(e => e !== me) || emails[0] || "";
}

function getProfileByKey(threadKey){
  const parsed = parseThreadKey(threadKey);
  if (parsed.type === "pair"){
    const other = getOtherEmail(parsed.emails);
    return getProfileByEmail(other);
  }
  const arr = getProfilesByGender(parsed.gender);
  return arr.find(x => String(x.id) === String(parsed.id)) || null;
}

function getThreadKeyForProfile(profile){
  const me = getCurrentEmail();
  const other = String(profile?.email || "").trim().toLowerCase();
  if (me && other){
    return makeEmailThreadKey(me, other);
  }
  return makeThreadKey(profile?.id || "", profile?.gender || DEFAULT_GENDER);
}

function getThreadRecipientEmail(threadKey){
  const parsed = parseThreadKey(threadKey);
  if (parsed.type === "pair"){
    return getOtherEmail(parsed.emails);
  }
  const profile = getProfileByKey(threadKey);
  return String(profile?.email || "").trim().toLowerCase();
}

function renderThreads(){
  const list = $("threadList");
  const keys = getThreadKeys();

  if (!keys.length){
    $("emptyThreads").style.display = "block";
    list.innerHTML = "";
    return;
  }
  $("emptyThreads").style.display = "none";

  // newest last msg first
  const sorted = keys.map(k => {
    const msgs = store.chats[k] || [];
    const last = msgs[msgs.length - 1];
    return { k, lastAt: last?.at || 0, lastText: last?.text || "" };
  }).sort((a,b) => (a.lastAt < b.lastAt ? 1 : -1));

  list.innerHTML = sorted.map(({k, lastText}) => {
    const p = getProfileByKey(k);
    const parsed = parseThreadKey(k);
    const fallbackName = parsed.type === "pair" ? (getOtherEmail(parsed.emails) || "User") : `User ${parsed.id}`;
    const name = p ? p.name : fallbackName;
    const img = p?.img || "https://via.placeholder.com/80?text=User";
    return `
      <div class="contact" data-thread="${k}" style="cursor:pointer">
        <img src="${img}" alt="${name}" />
        <div style="min-width:0">
          <b>${name}</b><br/>
          <span>${escapeHTML((lastText || "No messages").slice(0,40))}</span>
        </div>
        <span class="bulb ${p?.online ? "on":""}"></span>
      </div>
    `;
  }).join("");

  // bind clicks
  sorted.forEach(({k}) => {
    const el = document.querySelector(`[data-thread="${k}"]`);
    if (el) el.onclick = () => openThread(k);
  });

  if (activeId){
    const activeEl = document.querySelector(`[data-thread="${activeId}"]`);
    if (activeEl) activeEl.classList.add("active");
  }

  // no auto-replies for real chat threads
}

function renderChat(){
  const body = $("chatBody");
  if (!activeId){
    body.innerHTML = `<div class="muted">Select a chat from the left.</div>`;
    $("chatTitle").textContent = "Select a chat";
    $("chatSub").textContent = "—";
    const wrap = $("chatAvatarWrap");
    const img = $("chatAvatar");
    if (img) img.removeAttribute("src");
    if (wrap) wrap.classList.remove("has-img");
    closeProfileCard();
    return;
  }

  const p = getProfileByKey(activeId);
  $("chatTitle").textContent = p ? `${p.name}` : `Chat`;
  const lastSeenMap = (() => {
    try{ return JSON.parse(localStorage.getItem("dateme_last_seen_map") || "{}"); }
    catch(e){ return {}; }
  })();
  if (p){
    const key = activeId;
    if (p.online){
      $("chatSub").textContent = "Active now";
    } else {
      const ts = lastSeenMap[key];
      $("chatSub").textContent = formatLastSeen(ts);
    }
  } else {
    $("chatSub").textContent = "";
  }
  const wrap = $("chatAvatarWrap");
  const img = $("chatAvatar");
  if (img) img.src = p?.img || "";
  if (wrap) wrap.classList.toggle("has-img", !!p?.img);
  setProfileCard(p, activeId);

  const msgs = (store.chats?.[String(activeId)] || []);
  if (!msgs.length){
    body.innerHTML = `<div class="muted">Say hi 👋</div>`;
    return;
  }

  body.innerHTML = msgs.map(m => `
    <div class="bubble ${m.from === "me" ? "me" : "them"} ${m.sticker ? "sticker" : ""}">
      ${escapeHTML(m.text)}
      <span class="time">${m.ts}</span>
    </div>
  `).join("");

  body.scrollTop = body.scrollHeight;
}

function setProfileCard(p, threadKey){
  const card = $("chatProfileCard");
  if (!card){
    return;
  }
  if (!p){
    card.innerHTML = "";
    card.classList.remove("show");
    card.setAttribute("aria-hidden","true");
    return;
  }
  const fallback = parseThreadKey(threadKey);
  const gender = p?.gender || fallback.gender || DEFAULT_GENDER;
  const id = p?.id || fallback.id || "";
  const tags = Array.isArray(p.tags) ? p.tags.slice(0,6) : [];
  const location = [p.city, p.country].filter(Boolean).join(", ");
  const ageText = p.age ? ` • ${p.age}` : "";
  const profileLink = id
    ? `<a class="chatProfileCard__link" href="profile-view.html?gender=${encodeURIComponent(gender)}&id=${encodeURIComponent(id)}">View Profile</a>`
    : "";
  card.innerHTML = `
    <div class="chatProfileCard__head">
      <div class="chatProfileCard__avatar">
        <img src="${p.img || ""}" alt="${escapeHTML(p.name || "User")}" />
      </div>
      <div>
        <div class="chatProfileCard__name">${escapeHTML(p.name || "User")}${ageText}</div>
        <div class="chatProfileCard__meta">${escapeHTML(location || "Location hidden")}</div>
      </div>
    </div>
    <div class="chatProfileCard__tags">
      ${tags.map(t => `<span class="chatProfileCard__tag">${escapeHTML(t)}</span>`).join("")}
    </div>
    ${profileLink}
  `;
}

function toggleProfileCard(){
  const card = $("chatProfileCard");
  if (!card || !activeId) return;
  const isOpen = card.classList.contains("show");
  if (isOpen){
    closeProfileCard();
    return;
  }
  card.classList.add("show");
  card.setAttribute("aria-hidden","false");
}

function closeProfileCard(){
  const card = $("chatProfileCard");
  if (!card) return;
  card.classList.remove("show");
  card.setAttribute("aria-hidden","true");
}

function openThread(threadKey){
  activeId = String(threadKey);
  // url state
  const u = new URL(location.href);
  const profile = getProfileByKey(activeId);
  if (profile?.id){
    u.searchParams.set("id", profile.id);
    u.searchParams.set("gender", profile.gender || DEFAULT_GENDER);
  } else {
    u.searchParams.delete("id");
    u.searchParams.delete("gender");
  }
  history.replaceState({}, "", u.toString());

  // active state in list
  document.querySelectorAll(".contact").forEach(el => el.classList.remove("active"));
  const activeEl = document.querySelector(`[data-thread="${activeId}"]`);
  if (activeEl) activeEl.classList.add("active");

  document.body.classList.add("show-chat");
  store.read = store.read || {};
  store.read[activeId] = Date.now();
  saveStore(store);
  renderChat();
  $("chatInput").focus();
}

function sendMsg(){
  if (!activeId) return;

  const input = $("chatInput");
  const text = (input.value || "").trim();
  if (!text) return;
  if (!canSendMessage()){
    showMsgLimitNotice();
    return;
  }

  store.chats = store.chats || {};
  store.chats[String(activeId)] = store.chats[String(activeId)] || [];

  // ✅ push your message
  store.chats[String(activeId)].push({ from:"me", text, ts: nowTime(), at: Date.now() });
  store.read = store.read || {};
  store.read[String(activeId)] = Date.now();

  saveStore(store);
  if (!hasUpgrade()) incrementFreeMsg();
  const profile = getProfileByKey(activeId);
  const toEmail = getThreadRecipientEmail(activeId);
  sendMessageToServer(toEmail, text, profile);

  input.value = "";
  renderThreads();
  renderChat();
}

function formatLastSeen(ts){
  if (!ts) return "Offline";
  const diffMs = Date.now() - Number(ts);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Active moments ago";
  if (mins < 60) return `Active ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Active ${days} day${days === 1 ? "" : "s"} ago`;
}

function sendSticker(sticker){
  if (!activeId) return;
  const text = (sticker || "").trim();
  if (!text) return;
  if (!canSendMessage()){
    showMsgLimitNotice();
    return;
  }

  store.chats = store.chats || {};
  store.chats[String(activeId)] = store.chats[String(activeId)] || [];
  store.chats[String(activeId)].push({ from:"me", text, ts: nowTime(), at: Date.now(), sticker:true });
  store.read = store.read || {};
  store.read[String(activeId)] = Date.now();
  saveStore(store);
  if (!hasUpgrade()) incrementFreeMsg();
  const profile = getProfileByKey(activeId);
  const toEmail = getThreadRecipientEmail(activeId);
  sendMessageToServer(toEmail, text, profile);
  renderThreads();
  renderChat();
}

function clearChat(){
  if (!activeId) return;
  if (!confirm("Clear this chat?")) return;

  store.chats = store.chats || {};
  store.chats[String(activeId)] = [];
  saveStore(store);

  renderThreads();
  renderChat();
}

document.addEventListener("DOMContentLoaded", async () => {
  // theme
  const themeBtn = $("themeBtn");
  if (themeBtn) {
    themeBtn.onclick = () => {
      const cur = document.body.getAttribute("data-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      if (next === "light") document.body.setAttribute("data-theme","light");
      else document.body.removeAttribute("data-theme");
    };
  }

  $("sendBtn").onclick = sendMsg;
  $("chatInput").addEventListener("keydown", (e)=>{
    if (e.key === "Enter") sendMsg();
  });
  const clearBtn = $("clearBtn");
  if (clearBtn) clearBtn.onclick = clearChat;

  const emojiBtn = $("emojiBtn");
  const emojiPicker = $("emojiPicker");
  if (emojiBtn && emojiPicker){
    emojiBtn.onclick = () => {
      const isOpen = emojiPicker.style.display === "grid";
      emojiPicker.style.display = isOpen ? "none" : "grid";
      const stickerPicker = $("stickerPicker");
      if (stickerPicker) stickerPicker.style.display = "none";
    };
    emojiPicker.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        const input = $("chatInput");
        input.value += btn.textContent;
        input.focus();
      };
    });
    document.addEventListener("click", (e) => {
      if (!emojiPicker.contains(e.target) && e.target !== emojiBtn){
        emojiPicker.style.display = "none";
      }
    });
  }

  const stickerBtn = $("stickerBtn");
  const stickerPicker = $("stickerPicker");
  if (stickerBtn && stickerPicker){
    stickerBtn.onclick = () => {
      const isOpen = stickerPicker.style.display === "block";
      stickerPicker.style.display = isOpen ? "none" : "block";
      const emojiPickerEl = $("emojiPicker");
      if (emojiPickerEl) emojiPickerEl.style.display = "none";
    };
    stickerPicker.querySelectorAll(".sticker").forEach((el) => {
      el.onclick = () => {
        sendSticker(el.textContent);
        stickerPicker.style.display = "none";
      };
    });
    document.addEventListener("click", (e) => {
      if (!stickerPicker.contains(e.target) && e.target !== stickerBtn){
        stickerPicker.style.display = "none";
      }
    });
  }

  const audioCallBtn = $("audioCallBtn");
  const videoCallBtn = $("videoCallBtn");
  const callNotice = () => {
    const modal = document.getElementById("callNotice");
    if (modal){
      modal.classList.add("show");
      modal.setAttribute("aria-hidden","false");
    }
  };
  if (audioCallBtn) audioCallBtn.onclick = callNotice;
  if (videoCallBtn) videoCallBtn.onclick = callNotice;

  const callNoticeClose = document.getElementById("callNoticeClose");
  if (callNoticeClose){
    callNoticeClose.onclick = () => {
      const modal = document.getElementById("callNotice");
      if (!modal) return;
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden","true");
    };
  }

  const msgLimitClose = document.getElementById("msgLimitClose");
  if (msgLimitClose){
    msgLimitClose.onclick = () => {
      const modal = document.getElementById("msgLimitNotice");
      if (!modal) return;
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden","true");
    };
  }

  const chatBackBtn = $("chatBackBtn");
  if (chatBackBtn){
    chatBackBtn.onclick = () => {
      document.body.classList.remove("show-chat");
      closeProfileCard();
    };
  }

  const chatUser = document.querySelector(".inboxChat__user");
  if (chatUser){
    chatUser.addEventListener("click", (e) => {
      if (!activeId) return;
      e.stopPropagation();
      toggleProfileCard();
    });
  }
  document.addEventListener("click", (e) => {
    const card = $("chatProfileCard");
    if (!card) return;
    if (card.contains(e.target)) return;
    if (e.target.closest(".inboxChat__user")) return;
    closeProfileCard();
  });

  // load URL id
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const gender = params.get("gender") || DEFAULT_GENDER;

  // init store keys
  store = loadStore();
  store.chats = store.chats || {};
  store.read = store.read || {};
  normalizeChatKeys();
  saveStore(store);

  await refreshMessagesFromServer();
  renderThreads();
  if (getCurrentEmail()){
    setInterval(async () => {
      await refreshMessagesFromServer();
      renderThreads();
      if (activeId) renderChat();
    }, 10000);
  }

  if (id){
    const profile = getProfilesByGender(gender).find(x => String(x.id) === String(id)) || null;
    const key = profile ? getThreadKeyForProfile(profile) : makeThreadKey(id, gender);
    store.chats = store.chats || {};
    store.chats[key] = store.chats[key] || [];
    saveStore(store);
    openThread(key);
  } else {
    document.body.classList.remove("show-chat");
    renderChat();
  }
});
