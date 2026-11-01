const $ = id => document.getElementById(id);
let products = [], editingId = null, toastTimer;
async function api(url, options={}) {
  const response = await fetch(url, {credentials:"same-origin", headers:{"Content-Type":"application/json",...(options.headers||{})}, ...options});
  const data = await response.json().catch(()=>({}));
  if (response.status === 401) { showLogin(); throw new Error(data.error || "Please sign in again."); }
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function showLogin(){ $("loginScreen").classList.remove("hidden"); $("app").classList.add("hidden"); }
function showApp(){ $("loginScreen").classList.add("hidden"); $("app").classList.remove("hidden"); }
function notify(message){const t=$("toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2600);}
function money(v){return "₹"+Number(v||0).toLocaleString("en-IN");}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function setView(view){
  ["overview","products","add","orders","inventory"].forEach(n=>$(n+"View").classList.toggle("hidden",n!==view));
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  $("crumb").textContent=({overview:"OVERVIEW",products:"PRODUCTS",add:"ADD NEW PRODUCT",orders:"ORDERS",inventory:"INVENTORY"})[view];
  if(view==="add"&&!editingId)resetForm();
  if(view==="products")renderProducts($("allProducts"),true);
  if(view==="inventory")renderInventory();
  window.scrollTo({top:0,behavior:"smooth"});
}
async function loadAll(){
  const [p,stats,orders]=await Promise.all([api("/api/products"),api("/api/stats"),api("/api/orders")]);
  products=p.slice().sort((a,b)=>String(b._id||'').localeCompare(String(a._id||'')));
  $("designCount").innerHTML=`${stats.designs} <em>→</em>`;
  $("stockCount").innerHTML=`${stats.stock} <em>→</em>`;
  renderProducts($("recentProducts"),false);renderProducts($("allProducts"),true);renderOrders(orders);renderInventory();
}
// Render the same illustrated clothing models used on the customer-facing WEFT store.
// Product names/categories are mapped to the original garment silhouettes and fabric textures.
function garmentProfile(p, index) {
  const name = String(p.name || '').toLowerCase();
  const cat = String(p.category || '').toLowerCase();
  let type='tee', tex='jersey', colors=[['Oat','#D8CDB6'],['Charcoal','#3A3C40'],['Olive','#6B6F4B']], options={};
  if (name.includes('oxford')) { type='shirt'; tex='oxford'; colors=[['Sky','#9DB8D9'],['White','#F0F0EB'],['Navy','#1F2F4D']]; options={pocket:1}; }
  else if (name.includes('linen shirt') || (cat.includes('shirt') && !name.includes('overshirt'))) { type='shirt'; tex='linen'; colors=[['Oat','#D8CDB6'],['Sage','#A3AE96'],['Clay','#B98B73']]; options={pocket:1}; }
  else if (name.includes('overshirt') || name.includes('shirt-jacket')) { type='overshirt'; tex='wool'; colors=[['Olive','#5A5D3B'],['Charcoal','#3E4044'],['Brown','#7A5236']]; options={pocket:1,flap:1,pocket2:1,btn:'#2B2B2D'}; }
  else if (name.includes('hoodie') || cat.includes('hoodie')) { type='hoodie'; tex='fleece'; colors=[['Oat','#D8CDB6'],['Black','#1A1B1D'],['Forest','#2F4A3B']]; }
  else if (name.includes('sweater') || name.includes('knit') || cat.includes('knit')) { type='sweater'; tex='knit'; colors=[['Forest','#2F4F3E'],['Oatmeal','#CDBFA6'],['Burgundy','#6E2234']]; }
  else if (name.includes('jean') || name.includes('denim')) { type='jeans'; tex='denim'; colors=[['Indigo','#2B3F66'],['Black','#1C1D20'],['Light wash','#7C97BC']]; }
  else if (name.includes('chino') || name.includes('trouser') || name.includes('pant')) { type='chino'; tex=name.includes('wool')?'wool':'twill'; colors=[['Khaki','#B7A27E'],['Navy','#26324D'],['Olive','#5B5F3E']]; options=name.includes('pleated')?{pleat:1}:{}; }
  else if (name.includes('short')) { type='shorts'; tex='linen'; colors=[['Sand','#CDBB9A'],['White','#EEEDE6'],['Slate','#5B6670']]; options={draw:1}; }
  else if (cat.includes('bottom')) { type='chino'; tex='twill'; colors=[['Khaki','#B7A27E'],['Navy','#26324D'],['Olive','#5B5F3E']]; }
  else if (name.includes('tee') || name.includes('t-shirt') || cat.includes('t-shirt') || cat.includes('tee')) { type='tee'; tex='jersey'; colors=[['White','#EFEFEA'],['Charcoal','#3A3C40'],['Olive','#6B6F4B']]; options=name.includes('pocket')?{pocket:1}:{}; }
  else if (cat.includes('accessor')) { type='tee'; tex='jersey'; colors=[['Oat','#D8CDB6'],['Forest','#2F4A3B'],['Charcoal','#3A3C40']]; }
  const sizes=String(p.colours||'').toLowerCase();
  let ci = index % colors.length;
  if (sizes.includes('white')) ci=colors.findIndex(c=>c[0].toLowerCase()==='white')>=0?colors.findIndex(c=>c[0].toLowerCase()==='white'):ci;
  return {id:index+1,name:p.name||'WEFT garment',type,tex,colors:colors.map(c=>({0:c[0],1:c[1],name:c[0],hex:c[1]})),o:options,options,price:p.price||0};
}
function garmentMarkup(p,index) {
  try { return window.Garments.garment(garmentProfile(p,index),index%3); }
  catch (e) { return '<div class="no-image">WEFT / GARMENT PREVIEW</div>'; }
}
function renderProducts(container,actions){
  if(!products.length){container.innerHTML='<div class="empty-state">No products yet. Add your first WEFT design to start your collection.</div>';return;}
  // Keep product order consistent everywhere and give cards a clean, aligned grid.
  const list=actions?products:products.slice(0,6);
  container.innerHTML=list.map((p,i)=>{
    const low=Number(p.stock)<5;
    return `<article class="product-card">
      <div class="product-photo garment-photo" aria-label="Illustrated ${esc(p.name)}">${garmentMarkup(p,i)}</div>
      <div class="product-info">
        <div class="product-category">${esc(p.category||"Collection")}</div>
        <h3 title="${esc(p.name)}">${esc(p.name)}</h3>
        <div class="product-price">${money(p.price)}</div>
        <div class="product-meta"><span>${low?'<span class="status-tag low">LOW STOCK</span>':'<span class="status-tag">IN STOCK</span>'}</span><span>${Number(p.stock)} units</span></div>
        ${actions?`<div class="product-actions"><button class="btn outline small" data-edit="${esc(p._id)}">EDIT</button><button class="btn outline small danger" data-delete="${esc(p._id)}">DELETE</button></div>`:""}
      </div>
    </article>`;
  }).join("");
}
const demoCustomerNames = [
  "Aanya Kapoor", "Reyansh Mehta", "Kiara Shah", "Vivaan Iyer",
  "Myra Menon", "Kabir Khanna", "Saanvi Rao", "Aarav Nambiar",
  "Zoya Fernandes", "Ishaan Malhotra", "Anika Das", "Neil Varghese",
  "Tara Sethi", "Advik Pillai", "Rhea Thomas", "Arjun Bhat",
  "Naina Joseph", "Dev Malhotra", "Ira Krishnan", "Yuvaan Bose",
  "Meher Nair", "Ayaan Roy", "Diya Mukherjee", "Samaira Paul",
  "Ritvik Menon", "Avni Sharma", "Kian D'Souza", "Aditi Menon",
  "Aarohi Sen", "Dhruv Nair", "Mira Fernandes", "Shaurya Das"
];
function customerLabel(customer, order, index){
  if(order && order.demo) return demoCustomerNames[index % demoCustomerNames.length];
  if(typeof customer==="string"||typeof customer==="number") return String(customer);
  if(customer&&typeof customer==="object"){
    const fullName=[customer.firstName,customer.lastName].filter(Boolean).join(" ").trim();
    const label=customer.name||customer.fullName||customer.customerName||fullName||customer.email||customer.phone||customer.username;
    if(label) return String(label);
  }
  return demoCustomerNames[index % demoCustomerNames.length];
}
function renderOrders(orders){
  $("ordersBody").innerHTML=orders.length?orders.map((o,i)=>`<tr><td>${esc(o.id||o.orderNumber||"—")}</td><td>${esc(customerLabel(o.customer,o,i))}</td><td>${Number(o.items)||0}</td><td>${money(o.total)}</td><td>${esc(o.status||"Pending")}</td><td>${esc(o.date||"—")}</td></tr>`).join(""):'<tr><td colspan="6">No orders yet.</td></tr>';
}
function renderInventory(){$("inventoryBody").innerHTML=products.length?products.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${Number(p.stock)}</td><td class="${Number(p.stock)<5?"stock-low":"stock-ok"}">${Number(p.stock)<5?"RESTOCK":"AVAILABLE"}</td><td><button class="mini-btn" data-edit="${esc(p._id)}">EDIT</button></td></tr>`).join(""):'<tr><td colspan="6">No products in inventory yet.</td></tr>';}
function resetForm(){editingId=null;$("productForm").reset();$("productId").value="";$("formTitle").textContent="New product";$("saveBtn").textContent="＋ SAVE PRODUCT";$("formMessage").textContent="";$("previewImg").classList.add("hidden");$("imagePreview").querySelector("span").classList.remove("hidden");}
function fillForm(p){editingId=p._id;$("productId").value=p._id;["name","category","price","stock","image","sizes","colours","fabric","description"].forEach(k=>$(k).value=p[k]??"");$("formTitle").textContent="Edit product";$("saveBtn").textContent="SAVE CHANGES";updatePreview();setView("add");}
function updatePreview(){const url=$("image").value.trim(),img=$("previewImg"),label=$("imagePreview").querySelector("span");if(url){img.src=url;img.classList.remove("hidden");label.classList.add("hidden");img.onerror=()=>{img.classList.add("hidden");label.textContent="IMAGE COULD NOT LOAD";label.classList.remove("hidden");};}else{img.classList.add("hidden");label.textContent="IMAGE PREVIEW";label.classList.remove("hidden");}}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="";const d=new FormData(e.currentTarget);try{await api("/api/login",{method:"POST",body:JSON.stringify({username:d.get("username"),password:d.get("password")})});showApp();await loadAll();notify("Welcome to WEFT Admin Studio.");}catch(err){$("loginError").textContent=err.message;}});
$("logoutBtn").addEventListener("click",async()=>{try{await api("/api/logout",{method:"POST",body:"{}"});}catch{}showLogin();});
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
document.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.jump)));
$("productForm").addEventListener("submit",async e=>{e.preventDefault();const body={};["name","category","price","stock","image","sizes","colours","fabric","description"].forEach(k=>body[k]=$(k).value.trim());body.price=Number(body.price);body.stock=Number(body.stock);try{if(editingId){await api("/api/products/"+encodeURIComponent(editingId),{method:"PUT",body:JSON.stringify(body)});notify("Product updated.");}else{await api("/api/products",{method:"POST",body:JSON.stringify(body)});notify("Product saved to MongoDB.");}resetForm();await loadAll();setView("products");}catch(err){$("formMessage").textContent=err.message;}});
$("clearBtn").addEventListener("click",resetForm);$("image").addEventListener("input",updatePreview);
document.addEventListener("click",async e=>{const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");if(edit){const p=products.find(x=>x._id===edit.dataset.edit);if(p)fillForm(p);}if(del){const p=products.find(x=>x._id===del.dataset.delete);if(!p||!confirm(`Delete "${p.name}" from the catalogue?`))return;try{await api("/api/products/"+encodeURIComponent(p._id),{method:"DELETE"});await loadAll();notify("Product deleted.");}catch(err){notify(err.message);}}});
(async()=>{try{const s=await api("/api/session");if(s.authenticated){showApp();await loadAll();}else showLogin();}catch{showLogin();}})();
