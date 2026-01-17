// people.js
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("grid");
  if (!grid) return;

  const demo = [
    { name:"Mila", age:24, country:"USA" },
    { name:"Aisha", age:22, country:"BD" },
    { name:"Sara", age:26, country:"UK" },
    { name:"Nina", age:23, country:"CA" },
    { name:"Luna", age:25, country:"DE" },
    { name:"Maya", age:21, country:"IN" },
  ];

  grid.innerHTML = demo.map(p => `
    <div class="pcard">
      <img src="https://picsum.photos/600/400?random=${encodeURIComponent(p.name)}" alt="">
      <div class="pcard__body">
        <div class="pcard__name">
          <span>${p.name}</span>
          <span class="tag">${p.age}</span>
        </div>
        <div class="pcard__sub">${p.country}</div>
        <div class="pcard__actions">
          <button class="smallbtn chat" type="button">Chat</button>
          <button class="smallbtn view" type="button">View</button>
        </div>
      </div>
    </div>
  `).join("");
});