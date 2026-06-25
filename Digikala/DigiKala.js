/* ============================================
   CONFIG & STATE
   ============================================ */
const DB = {
    products: 'shopshopProducts',
    slides: 'shop_slides',
    users: 'users_database',
    session: 'current_user',
    history: 'shop_search_history',
    wishlist: 'shop_wishlist',
    theme: 'theme'
};

const CATEGORY_DATA = {
    "کالای دیجیتال": {
        "موبایل": ["اپل", "سامسونگ", "شیائومی", "گوگل", "ناتینگ"],
        "لپ‌تاپ": ["ایسوس", "لنوو", "اپل", "قطعات کامپیوتر"],
        "هدفون و ساعت هوشمند": ["اپل واچ", "ایرپاد", "ساعت سامسونگ", "اسپیکر"],
        "لوازم جانبی": ["قاب", "گلس", "شارژر"]
    },
    "مد و پوشاک": {
        "مردانه": ["شلوار مردانه", "کفش مردانه", "پافر مردانه", "کلاه"],
        "زنانه": ["شلوار زنانه", "کفش زنانه", "پافر زنانه", "کاپشن زنانه"],
        "بچگانه": ["نوزادی", "پوشاک پسرانه", "پوشاک دخترانه"]
    },
    "خانه و آشپزخانه": {
        "لوازم برقی": ["یخچال", "تلویزیون", "ماشین لباسشویی", "ماشین ظرفشویی"],
        "دکوراسیون": ["فرش", "مبلمان", "لوستر", "مجسمه"],
        "پذیرایی": ["سرویس غذاخوری", "قاشق و چنگال"]
    },
    "آرایشی و بهداشتی": {
        "آرایشی": ["لوازم آرایش چشم", "آرایش لب", "لاک ناخن"],
        "بهداشتی": ["مراقبت پوست", "شامپو و مو", "ضد آفتاب"],
        "عطر و ادکلن": ["مردانه", "زنانه", "اسپری"]
    }
};

const state = {
    products: [],
    slides: [],
    slide: 0,
    theme: localStorage.getItem(DB.theme) || 'light',
    activeProduct: null,
    activeStock: 0,
    selectedColor: 'مشکی',
    cartCount: 0,
    srpQuery: '',
    srpCat: '',
    srpRating: 0,
    srpResults: [],
    megaOpen: false
};

const MAX_HIST = 8;
let sliderTimer = null;
let toastTimer = null;

/* ============================================
   THEME
   ============================================ */
function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const icon = t === 'dark' ? 'fa-sun' : 'fa-moon';
    document.querySelectorAll('#themeToggle i, #mobileTheme i').forEach(i => {
        i.className = `fas ${icon}`;
    });
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(DB.theme, state.theme);
    applyTheme(state.theme);
}



/* ============================================
   SEARCH HELPERS
   ============================================ */
function norm(s) {
    return (s||'').replace(/[يى]/g,'ی').replace(/[كک]/g,'ک').replace(/[\u064B-\u065F]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
}
function levenshtein(a, b) {
    const m = [], la = a.length, lb = b.length;
    for (let i=0;i<=lb;i++) m[i]=[i];
    for (let j=0;j<=la;j++) m[0][j]=j;
    for (let i=1;i<=lb;i++) for (let j=1;j<=la;j++) {
        m[i][j] = b[i-1]===a[j-1] ? m[i-1][j-1] : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
    }
    return m[lb][la];
}
function fuzzyMatch(q, text) {
    const qn=norm(q), tn=norm(text);
    if (tn.includes(qn)) return true;
    return tn.split(' ').some(w => w.length>=3 && levenshtein(qn,w)<=Math.floor(qn.length/4));
}
function scoreProduct(q, p) {
    if (!q) return 100;
    const qn=norm(q);
    const name=norm(p.name||''), desc=norm(p.description||''), cat=norm(p.breadcrumb||p.category||'');
    let sc=0;
    if (name===qn) sc+=200;
    else if (name.startsWith(qn)) sc+=150;
    else if (name.includes(qn)) sc+=100;
    else if (cat.includes(qn)) sc+=60;
    else if (desc.includes(qn)) sc+=40;
    else if (fuzzyMatch(q, p.name)) sc+=30;
    else if (fuzzyMatch(q, desc)) sc+=10;
    if (!sc) return 0;
    if (p.stock>0) sc+=50; else sc-=100;
    sc+=(p.rating||0)*5;
    sc+=Math.min((p.reviews||0)/10,20);
    if (p.hot) sc+=15;
    return sc;
}
function searchProds(q) {
    if (!q||q.trim().length<1) return state.products.slice();
    return state.products
        .map(p=>({...p,_s:scoreProduct(q,p)}))
        .filter(p=>p._s>0)
        .sort((a,b)=>b._s-a._s);
}

/* ============================================
   SEARCH HISTORY
   ============================================ */
function getHistory() {
    try { return JSON.parse(localStorage.getItem(DB.history))||[]; } catch(e) { return []; }
}
function addHistory(q) {
    if (!q||q.trim().length<2) return;
    let h=getHistory().filter(x=>x.toLowerCase()!==q.toLowerCase());
    h.unshift(q.trim());
    if (h.length>MAX_HIST) h=h.slice(0,MAX_HIST);
    localStorage.setItem(DB.history, JSON.stringify(h));
}
function removeHistory(q) {
    const h=getHistory().filter(x=>x!==q);
    localStorage.setItem(DB.history, JSON.stringify(h));
    const inp=document.getElementById('mainSearch');
    showDropdown(inp.value);
}

/* ============================================
   SEARCH DROPDOWN
   ============================================ */
function showDropdown(val) {
    const dd=document.getElementById('searchDropdown');
    const q=val.trim();
    let html='';

    if (!q) {
        const hist=getHistory();
        if (!hist.length) { dd.style.display='none'; return; }
        html+=`<div class="sd-section-head"><i class="fas fa-history"></i> جستجوهای اخیر</div>`;
        hist.forEach(item => {
            html+=`<div class="sd-history-item">
                <div class="sd-history-left" onclick="triggerSearch('${esc(item)}')">
                    <div class="sd-icon"><i class="fas fa-clock"></i></div>
                    <span class="sd-history-text">${item}</span>
                </div>
                <button class="sd-del-btn" onclick="event.stopPropagation();removeHistory('${esc(item)}')"><i class="fas fa-times"></i></button>
            </div>`;
        });
    } else if (q.length>=2) {
        const qn=norm(q);
        const prods=state.products.map(p=>({...p,_s:scoreProduct(q,p)})).filter(p=>p._s>0).sort((a,b)=>b._s-a._s).slice(0,4);
        if (prods.length) {
            html+=`<div class="sd-section-head"><i class="fas fa-box"></i> محصولات پیشنهادی</div>`;
            prods.forEach(p => {
                const fp=p.price-(p.price*(p.discount||0)/100);
                html+=`<div class="sd-item" onclick="openProduct(${p.id});closeDropdown();">
                    <img src="${p.image}" class="sd-prod-img" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/44'">
                    <div style="flex:1;min-width:0;">
                        <div class="sd-prod-name">${p.name}</div>
                        <div class="sd-prod-price">${fp.toLocaleString('en-US')} تومان</div>
                    </div>
                </div>`;
            });
        }
        const cats=getAllCatItems().filter(c=>norm(c.text).includes(qn)||fuzzyMatch(q,c.text)).slice(0,3);
        if (cats.length) {
            html+=`<div class="sd-section-head"><i class="fas fa-sitemap"></i> دسته‌بندی‌ها</div>`;
            cats.forEach(c => {
                html+=`<div class="sd-item" onclick="openSRP('${esc(c.text)}','');closeDropdown();addHistory('${esc(c.text)}');">
                    <div class="sd-icon"><i class="fas fa-tag"></i></div>
                    <div class="sd-text">
                        <div class="sd-text-main">${c.text}</div>
                        <div class="sd-text-sub">${c.path}</div>
                    </div>
                </div>`;
            });
        }
        if (!prods.length&&!cats.length) {
            html=`<div class="sd-empty"><i class="fas fa-search-minus"></i>نتیجه‌ای یافت نشد</div>`;
        } else {
            html+=`<div class="sd-search-all" onclick="triggerSearch('${esc(q)}')">
                <div class="sd-icon" style="background:var(--primary-soft2);"><i class="fas fa-search" style="color:var(--primary);"></i></div>
                <span>جستجوی "<strong>${q}</strong>" در همه محصولات</span>
                <i class="fas fa-arrow-left" style="color:var(--primary);font-size:12px;margin-right:auto;"></i>
            </div>`;
        }
    } else { dd.style.display='none'; return; }

    dd.innerHTML=html;
    dd.style.display='block';
}

function closeDropdown() {
    document.getElementById('searchDropdown').style.display='none';
}

function triggerSearch(q) {
    if (!q||!q.trim()) return;
    addHistory(q.trim());
    closeDropdown();
    document.getElementById('mainSearch').value=q;
    openSRP(q,'');
}

function esc(s) {
    return (s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

function getAllCatItems() {
    const items=[];
    for (const [main,subs] of Object.entries(CATEGORY_DATA)) {
        for (const [sub,children] of Object.entries(subs)) {
            items.push({text:sub, path:main});
            children.forEach(c => items.push({text:c, path:`${main} > ${sub}`}));
        }
    }
    return items;
}

/* ============================================
   SLIDER
   ============================================ */
function initSlider() {
    const track=document.getElementById('sliderTrack');
    const dots=document.getElementById('sliderDots');
    if (!state.slides.length) return;
    track.innerHTML=state.slides.map(s=>`
        <div class="slide">
            <img src="${s.image}" alt="${s.title||''}" loading="eager">
            <div class="slide-overlay">
                <div class="slide-text"><h2>${s.title||''}</h2></div>
            </div>
        </div>
    `).join('');
    dots.innerHTML=state.slides.map((_,i)=>`<div class="dot${i===0?' active':''}" onclick="goSlide(${i})" role="button" aria-label="اسلاید ${i+1}"></div>`).join('');
    startSliderTimer();
}

function startSliderTimer() {
    if (sliderTimer) clearInterval(sliderTimer);
    sliderTimer=setInterval(()=>moveSlide(1), 5000);
}

function moveSlide(dir) {
    state.slide=(state.slide+dir+state.slides.length)%state.slides.length;
    updateSlider();
    startSliderTimer();
}

function goSlide(i) {
    state.slide=i;
    updateSlider();
    startSliderTimer();
}

function updateSlider() {
    const track=document.getElementById('sliderTrack');
    track.style.transform=`translateX(${state.slide*100}%)`;
    document.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active',i===state.slide));
}

/* ============================================
   MEGA MENU
   ============================================ */
function renderMegaMenu() {
    const grid=document.getElementById('megaGrid');
    let h='';
    for (const [main,subs] of Object.entries(CATEGORY_DATA)) {
        h+=`<div>
            <div class="mm-col-title"><i class="fas fa-chevron-circle-left fa-xs"></i>${main}</div>`;
        for (const [sub] of Object.entries(subs)) {
            h+=`<div class="mm-link" onclick="openSRP('${esc(sub)}','');closeMegaMenu();">
                <span>${sub}</span><i class="fas fa-arrow-left"></i>
            </div>`;
        }
        h+=`</div>`;
    }
    grid.innerHTML=h;
}

function toggleMegaMenu() {
    state.megaOpen=!state.megaOpen;
    document.getElementById('megaMenu').classList.toggle('open',state.megaOpen);
    const trigger=document.getElementById('megaTrigger');
    if (trigger) trigger.classList.toggle('active',state.megaOpen);
    const arr=document.getElementById('megaArrow');
    if (arr) arr.style.transform=state.megaOpen?'rotate(180deg)':'rotate(0deg)';
}

function closeMegaMenu() {
    state.megaOpen=false;
    document.getElementById('megaMenu').classList.remove('open');
    const trigger=document.getElementById('megaTrigger');
    if (trigger) trigger.classList.remove('active');
    const arr=document.getElementById('megaArrow');
    if (arr) arr.style.transform='rotate(0deg)';
}

document.addEventListener('click', e => {
    const mm=document.getElementById('megaMenu');
    const mt=document.getElementById('megaTrigger');
    const mn=document.querySelector('.mn-item:nth-child(2)');
    if (mm&&mt&&!mm.contains(e.target)&&!mt.contains(e.target)&&!(mn&&mn.contains(e.target))) {
        closeMegaMenu();
    }
    const dd=document.getElementById('searchDropdown');
    const sc=document.querySelector('.search-container');
    if (dd&&sc&&!sc.contains(e.target)) closeDropdown();
});

/* ============================================
   PRODUCTS RENDER
   ============================================ */
function getCatName(cat) {
    const map={'digital':'کالای دیجیتال','fashion':'مد و پوشاک','home':'خانه و آشپزخانه','beauty':'زیبایی و سلامت','toy':'اسباب بازی','sport':'ورزش و سفر'};
    return map[cat]||cat;
}

function renderProducts() {
    const skel=document.getElementById('skeletonGrid');
    const grid=document.getElementById('mainGrid');
    setTimeout(()=>{
        skel.style.display='none';
        grid.style.display='grid';
        const wishlist=getWishlist();
        grid.innerHTML=state.products.map((p,i)=>createCard(p,i,wishlist)).join('');
    }, 600);

    const deals=document.getElementById('dealsScroll');
    const offers=state.products.filter(p=>p.discount>0);
    deals.innerHTML=offers.length
        ? offers.map(p=>createDeal(p)).join('')
        : '<div style="color:rgba(255,255,255,0.6);padding:20px;font-size:13px;">پیشنهادی موجود نیست</div>';
}

function createCard(p, idx, wishlist) {
    const fp=p.price-(p.price*(p.discount||0)/100);
    const badge=p.discount>0?`<span class="p-discount-badge">${p.discount}٪</span>`:'';
    const wlActive=wishlist.includes(p.id)?'active':''
    const wlIcon=wishlist.includes(p.id)?'fas fa-heart':'far fa-heart';
    let stockBadge='';
    if (p.stock===0) stockBadge=`<span class="p-stock stock-out">ناموجود</span>`;
    else if (p.stock>0&&p.stock<=2) stockBadge=`<span class="p-stock stock-low">تنها ${p.stock} عدد</span>`;
    const stars='★'.repeat(Math.round(p.rating||0))+'☆'.repeat(5-Math.round(p.rating||0));
    return `
        <article class="p-card" onclick="openProduct(${p.id})" style="animation-delay:${idx*0.06}s" role="button" aria-label="${p.name}">
            <div class="ripple-container"></div>
            <div class="p-img-wrap">
                ${badge}
                <button class="p-wishlist-btn ${wlActive}" onclick="event.stopPropagation();quickWishlist(${p.id},this)" aria-label="افزودن به علاقه‌مندی">
                    <i class="${wlIcon}"></i>
                </button>
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
            </div>
            <div class="p-body">
                <div class="p-category"><i class="fas fa-check-circle"></i> ${getCatName(p.category)}</div>
                <h3 class="p-name">${p.name}</h3>
                <div class="p-rating">
                    <span style="color:var(--warning);font-size:11px;">${stars}</span>
                    <span>(${(p.reviews||0).toLocaleString('en-US')})</span>
                </div>
                <div class="p-price-row">
                    ${p.discount>0?`<span class="p-original">${p.price.toLocaleString('en-US')}</span>`:''}
                    <span class="p-final">${fp.toLocaleString('en-US')} <small>تومان</small></span>
                </div>
                ${stockBadge}
            </div>
            <button class="p-add-btn" onclick="event.stopPropagation();openProduct(${p.id})" ${p.stock===0?'disabled':''} aria-label="مشاهده و خرید">
                <i class="fas fa-shopping-cart"></i>
                ${p.stock===0?'ناموجود':'مشاهده و خرید'}
            </button>
        </article>`;
}

function createDeal(p) {
    const fp=p.price-(p.price*(p.discount||0)/100);
    return `
        <div class="deal-card" onclick="openProduct(${p.id})" role="button" aria-label="${p.name}">
            ${p.discount>0?`<span class="deal-badge">${p.discount}٪</span>`:''}
            <img src="${p.image}" class="deal-img" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/96'">
            <div class="deal-name">${p.name}</div>
            <div class="deal-price-row">
                ${p.discount>0?`<div class="deal-old">${p.price.toLocaleString('en-US')}</div>`:''}
                <div class="deal-new">${fp.toLocaleString('en-US')} تومان</div>
            </div>
        </div>`;
}

/* ============================================
   RIPPLE EFFECT
   ============================================ */
document.addEventListener('click', e => {
    const card=e.target.closest('.p-card');
    if (!card) return;
    const container=card.querySelector('.ripple-container');
    if (!container) return;
    const rect=card.getBoundingClientRect();
    const wave=document.createElement('span');
    wave.className='ripple-wave';
    const size=Math.max(card.offsetWidth, card.offsetHeight);
    wave.style.cssText=`width:${size}px;height:${size}px;top:${e.clientY-rect.top-size/2}px;right:${rect.right-e.clientX-size/2}px;`;
    container.appendChild(wave);
    wave.addEventListener('animationend', ()=>wave.remove());
});

/* ============================================
   WISHLIST
   ============================================ */
function getWishlist() {
    try { return JSON.parse(localStorage.getItem(DB.wishlist))||[]; } catch(e) { return []; }
}

function quickWishlist(id, btn) {
    let wl=getWishlist();
    const icon=btn.querySelector('i');
    if (wl.includes(id)) {
        wl=wl.filter(x=>x!==id);
        btn.classList.remove('active');
        icon.className='far fa-heart';
        showToast('از لیست علاقه‌مندی حذف شد','error');
    } else {
        wl.push(id);
        btn.classList.add('active','pop');
        icon.className='fas fa-heart';
        setTimeout(()=>btn.classList.remove('pop'),300);
        showToast('به لیست علاقه‌مندی اضافه شد','success');
    }
    localStorage.setItem(DB.wishlist, JSON.stringify(wl));
}

function toggleWishlist() {
    if (!state.activeProduct) return;
    const btn=document.getElementById('wishBtn');
    const icon=btn.querySelector('i');
    let wl=getWishlist();
    const id=state.activeProduct.id;
    if (wl.includes(id)) {
        wl=wl.filter(x=>x!==id);
        btn.classList.remove('active','pop');
        icon.className='far fa-heart';
        showToast('از لیست علاقه‌مندی حذف شد','error');
    } else {
        wl.push(id);
        btn.classList.add('active','pop');
        icon.className='fas fa-heart';
        setTimeout(()=>btn.classList.remove('pop'),300);
        showToast('به لیست علاقه‌مندی اضافه شد','success');
    }
    localStorage.setItem(DB.wishlist, JSON.stringify(wl));
}

function updateWishlistUI() {
    if (!state.activeProduct) return;
    const btn=document.getElementById('wishBtn');
    const icon=btn.querySelector('i');
    const wl=getWishlist();
    if (wl.includes(state.activeProduct.id)) {
        btn.classList.add('active');
        icon.className='fas fa-heart';
    } else {
        btn.classList.remove('active');
        icon.className='far fa-heart';
    }
}

/* ============================================
   PRODUCT MODAL
   ============================================ */
function openProduct(id) {
    const p=state.products.find(x=>x.id===id);
    if (!p) return;
    state.activeProduct=p;
    state.activeStock=p.stock||0;

    document.getElementById('mMainImg').src=p.image;
    document.getElementById('modalTitle').innerText=p.name;
    document.getElementById('mCat').innerText=p.breadcrumb||getCatName(p.category);
    document.getElementById('mDesc').innerText=p.description||'توضیحاتی ثبت نشده است.';
    const fp=p.price-(p.price*(p.discount||0)/100);
    document.getElementById('mPrice').innerText=fp.toLocaleString('en-US');
    document.getElementById('mHot').style.display=p.hot?'inline-flex':'none';
    document.getElementById('mRevCount').innerText=p.reviews||0;
    document.getElementById('mQty').value=1;

    // Stars
    const rating=p.rating||0;
    let sh='';
    for (let i=1;i<=5;i++) {
        const f=i<=Math.floor(rating)?'filled':(i-rating<1?'filled':'');
        const op=i-rating<1&&i>Math.floor(rating)?'style="opacity:0.5"':'';
        sh+=`<span class="star-ico ${f}" ${op}>★</span>`;
    }
    document.getElementById('mStars').innerHTML=sh;

    // Gallery
    const imgs=p.gallery&&p.gallery.length?p.gallery:[p.image,`https://picsum.photos/200/200?random=${p.id}0`,`https://picsum.photos/200/200?random=${p.id}1`];
    document.getElementById('mThumbs').innerHTML=imgs.map((img,i)=>`<img src="${img}" class="g-thumb${i===0?' active':''}" onclick="setMainImg(this)" loading="lazy" alt="">`).join('');

    // Colors
    let cols=p.colors&&p.colors.length?p.colors:[{name:'مشکی',code:'#000000'},{name:'سفید',code:'#ffffff'},{name:'قرمز',code:'#e74c3c'}];
    document.getElementById('mColors').innerHTML=cols.map((c,i)=>`
        <div class="color-wrap${i===0?' active':''}" onclick="selectColor(this,'${c.name}')">
            <div class="color-dot${i===0?' active':''}" style="background:${c.code};"></div>
            <span class="color-lbl">${c.name}</span>
        </div>`).join('');
    state.selectedColor=cols[0].name;
    document.getElementById('mColorName').innerText=cols[0].name;

    // Specs
    if (p.specs&&Object.keys(p.specs).length) {
        let th=`<table class="specs-tbl"><thead><tr><th>مشخصه</th><th>مقدار</th></tr></thead><tbody>`;
        for (const [k,v] of Object.entries(p.specs)) th+=`<tr><td>${k}</td><td>${v}</td></tr>`;
        document.getElementById('mSpecs').innerHTML=th+`</tbody></table>`;
    } else {
        document.getElementById('mSpecs').innerHTML='';
    }

    // Cart btn
    const btn=document.getElementById('btnCart');
    if (state.activeStock===0) {
        btn.disabled=true;
        btn.innerHTML='<i class="fas fa-ban"></i> ناموجود';
    } else {
        btn.disabled=false;
        btn.innerHTML='<i class="fas fa-shopping-cart"></i> افزودن به سبد';
    }

    updateWishlistUI();
    document.getElementById('productModal').classList.add('open');
    document.body.style.overflow='hidden';
}

function closeModal() {
    document.getElementById('productModal').classList.remove('open');
    document.body.style.overflow=document.getElementById('srpOverlay').classList.contains('open')?'hidden':'';
}

function setMainImg(el) {
    document.getElementById('mMainImg').src=el.src;
    document.querySelectorAll('.g-thumb').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
}

function selectColor(wrap, name) {
    document.querySelectorAll('.color-wrap').forEach(w=>w.classList.remove('active'));
    document.querySelectorAll('.color-dot').forEach(d=>d.classList.remove('active'));
    wrap.classList.add('active');
    wrap.querySelector('.color-dot').classList.add('active');
    state.selectedColor=name;
    document.getElementById('mColorName').innerText=name;
}

function changeQty(d) {
    const inp=document.getElementById('mQty');
    let v=parseInt(inp.value)+d;
    if (v<1) v=1;
    if (state.activeStock>0&&v>state.activeStock) {
        showToast(`حداکثر ${state.activeStock} عدد`,'error');
        return;
    }
    inp.value=v;
}

function addToCart() {
    const session=localStorage.getItem(DB.session);
    if (!session) {
        showToast('لطفاً ابتدا وارد شوید','error');
        setTimeout(()=>window.location.href='login.html',1500);
        return;
    }
    if (state.activeStock===0) { showToast('ناموجود است','error'); return; }
    let users=JSON.parse(localStorage.getItem(DB.users))||[];
    const ui=users.findIndex(u=>u.mobile===session);
    if (ui!==-1) {
        if (!users[ui].cart) users[ui].cart=[];
        const qty=parseInt(document.getElementById('mQty').value);
        if (qty>state.activeStock) { showToast('موجودی کافی نیست','error'); return; }
        const ex=users[ui].cart.find(x=>x.id===state.activeProduct.id);
        if (ex) {
            if (ex.qty+qty>state.activeStock) { showToast('موجودی کافی نیست','error'); return; }
            ex.qty+=qty;
        } else {
            users[ui].cart.push({id:state.activeProduct.id,qty,color:state.selectedColor});
        }
        localStorage.setItem(DB.users, JSON.stringify(users));
        updateCartUI(users[ui].cart);
        showToast(`با رنگ ${state.selectedColor} به سبد اضافه شد`,'success');
        closeModal();
    }
}

function updateCartUI(cart) {
    const c=cart.reduce((a,i)=>a+i.qty,0);
    const hc=document.getElementById('headerCartCount');
    const nc=document.getElementById('mnCartCount');
    if (hc) hc.innerText=c.toLocaleString('fa');
    if (nc) nc.innerText=c.toLocaleString('fa');
}

function shareProduct() {
    if (!state.activeProduct) return;
    const text=`${state.activeProduct.name} - ${location.href}`;
    if (navigator.share) {
        navigator.share({title:state.activeProduct.name,text}).catch(()=>{});
    } else {
        navigator.clipboard.writeText(text);
        showToast('لینک کپی شد','success');
    }
}

function openSpecs() { showToast('مشخصات در جدول بالا نمایش داده شده است','success'); }
function openReviews() { showToast('صفحه دیدگاه‌ها در حال توسعه است','success'); }

/* ============================================
   SRP
   ============================================ */
function openSRP(q, cat) {
    state.srpQuery=q||'';
    state.srpCat=cat||'';
    state.srpRating=0;
    closeMegaMenu();
    closeDropdown();
    document.getElementById('srpOverlay').classList.add('open');
    document.getElementById('srpInput').value=q||'';
    document.getElementById('priceMin').value='';
    document.getElementById('priceMax').value='';
    document.getElementById('fAvail').checked=false;
    document.getElementById('fDisc').checked=false;
    document.getElementById('srpSort').value='relevant';
    document.body.style.overflow='hidden';
    srpFilter();
}

function closeSRP() {
    document.getElementById('srpOverlay').classList.remove('open');
    document.body.style.overflow='';
}

function setSrpRating(r) {
    state.srpRating=r;
    srpFilter();
}

function srpFilter() {
    const q=document.getElementById('srpInput').value.trim();
    const sort=document.getElementById('srpSort').value;
    const pMin=parseFloat(document.getElementById('priceMin').value)||0;
    const pMax=parseFloat(document.getElementById('priceMax').value)||Infinity;
    const avail=document.getElementById('fAvail').checked;
    const disc=document.getElementById('fDisc').checked;
    const minRat=state.srpRating;

    let res=q.length>=1?searchProds(q):state.products.slice();

    if (state.srpCat) {
        res=res.filter(p=>p.category===state.srpCat||(p.breadcrumb&&p.breadcrumb.toLowerCase().includes(state.srpCat.toLowerCase())));
    }
    if (!q&&!state.srpCat&&state.srpQuery) {
        const sq=norm(state.srpQuery);
        res=res.filter(p=>norm(p.name).includes(sq)||norm(p.breadcrumb||p.category).includes(sq)||fuzzyMatch(state.srpQuery,p.name));
    }

    res=res.filter(p=>{
        const fp=p.price-(p.price*(p.discount||0)/100);
        return fp>=pMin&&fp<=pMax;
    });
    if (avail) res=res.filter(p=>p.stock>0);
    if (disc) res=res.filter(p=>(p.discount||0)>0);
    if (minRat>0) res=res.filter(p=>(p.rating||0)>=minRat);

    if (sort==='cheapest') res.sort((a,b)=>(a.price-(a.price*(a.discount||0)/100))-(b.price-(b.price*(b.discount||0)/100)));
    else if (sort==='expensive') res.sort((a,b)=>(b.price-(b.price*(b.discount||0)/100))-(a.price-(a.price*(a.discount||0)/100)));
    else if (sort==='rating') res.sort((a,b)=>(b.rating||0)-(a.rating||0));
    else if (sort==='newest') res.sort((a,b)=>b.id-a.id);

    res.sort((a,b)=>{
        if (a.stock===0&&b.stock>0) return 1;
        if (a.stock>0&&b.stock===0) return -1;
        return 0;
    });

    state.srpResults=res;
    renderSRP(res, q||state.srpQuery);
}

function renderSRP(res, q) {
    const count=document.getElementById('srpCount');
    const grid=document.getElementById('srpGrid');
    count.innerHTML=`<strong>${res.length}</strong> محصول${q?` برای «${q}»`:''} یافت شد`;

    if (!res.length) {
        const sim=state.products.filter(p=>p.stock>0).sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,4);
        grid.innerHTML=`<div class="srp-empty"><i class="fas fa-search"></i><h3>محصولی یافت نشد</h3><p>کلمه جستجو یا فیلترها را تغییر دهید</p></div>
            ${sim.length?`<div class="srp-suggestions"><h4><i class="fas fa-lightbulb" style="color:var(--warning)"></i> شاید این موارد را بپسندید</h4>
            <div class="srp-grid" style="grid-column:1/-1;">${sim.map(p=>createSRPCard(p)).join('')}</div></div>`:''}`;
        return;
    }
    grid.innerHTML=res.map(p=>createSRPCard(p)).join('');
}

function createSRPCard(p) {
    const fp=p.price-(p.price*(p.discount||0)/100);
    const badge=p.discount>0?`<span class="p-discount-badge">${p.discount}٪</span>`:'';
    let sb='';
    if (p.stock===0) sb=`<span class="p-stock stock-out">ناموجود</span>`;
    else if (p.stock<=2) sb=`<span class="p-stock stock-low">تنها ${p.stock} عدد</span>`;
    const stars='★'.repeat(Math.round(p.rating||0))+'☆'.repeat(5-Math.round(p.rating||0));
    return `
        <article class="p-card" onclick="openProduct(${p.id});addHistory('${esc(p.name)}')" role="button" aria-label="${p.name}">
            <div class="ripple-container"></div>
            <div class="p-img-wrap">
                ${badge}
                <div style="font-size:10px;color:var(--warning);position:absolute;bottom:6px;right:6px;background:rgba(255,255,255,0.85);padding:2px 5px;border-radius:4px;font-weight:700;">${stars}</div>
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
            </div>
            <div class="p-body">
                <div class="p-category"><i class="fas fa-check-circle"></i>${getCatName(p.category)}</div>
                <h3 class="p-name">${p.name}</h3>
                <div class="p-price-row">
                    ${p.discount>0?`<span class="p-original">${p.price.toLocaleString('en-US')}</span>`:''}
                    <span class="p-final">${fp.toLocaleString('en-US')} <small>تومان</small></span>
                </div>
                ${sb}
            </div>
            <button class="p-add-btn" onclick="event.stopPropagation();openProduct(${p.id})" ${p.stock===0?'disabled':''}>
                <i class="fas fa-shopping-cart"></i> ${p.stock===0?'ناموجود':'مشاهده و خرید'}
            </button>
        </article>`;
}



/* ============================================
   TIMER
   ============================================ */
function initTimer() {
    let t=86399;
    const update=()=>{
        const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60;
        document.getElementById('t-h').innerText=String(h).padStart(2,'0');
        document.getElementById('t-m').innerText=String(m).padStart(2,'0');
        document.getElementById('t-s').innerText=String(s).padStart(2,'0');
        if (--t<0) t=86399;
    };
    update();
    setInterval(update,1000);
}

/* ============================================
   AUTH & CART UI
   ============================================ */
function updateAuthUI() {
    const session=localStorage.getItem(DB.session);
    const authLink=document.getElementById('authLink');
    const label=document.getElementById('userLabel');
    if (session) {
        const users=JSON.parse(localStorage.getItem(DB.users))||[];
        const user=users.find(u=>u.mobile===session);
        if (user) {
            if (authLink) authLink.href='profile.html';
            if (label) label.innerText=user.name||'پنل کاربری';
            if (user.cart) updateCartUI(user.cart);
        }
    } else {
        if (authLink) authLink.href='login.html';
        if (label) label.innerText='ورود';
    }
}

/* ============================================
   DEALS SCROLL DRAG
   ============================================ */
function initDealsScroll() {
    const el=document.getElementById('dealsScroll');
    if (!el) return;
    let down=false, startX, sL;
    const start=e=>{down=true;el.classList.add('grabbing');const x=e.touches?e.touches[0].clientX:e.clientX;startX=x-el.offsetLeft;sL=el.scrollLeft;};
    const move=e=>{if(!down)return;e.preventDefault();const x=e.touches?e.touches[0].clientX:e.clientX;el.scrollLeft=sL-(x-startX)*1.4;};
    const end=()=>{down=false;el.classList.remove('grabbing');};
    el.addEventListener('mousedown',start);
    window.addEventListener('mouseup',end);
    window.addEventListener('mousemove',move);
    el.addEventListener('touchstart',start,{passive:false});
    window.addEventListener('touchend',end);
    window.addEventListener('touchmove',move,{passive:false});
}

/* ============================================
   HEADER SCROLL
   ============================================ */
window.addEventListener('scroll', ()=>{
    const h=document.getElementById('mainHeader');
    if (window.scrollY>10) h.classList.add('scrolled');
    else h.classList.remove('scrolled');
}, {passive:true});

/* ============================================
   MOBILE THEME BTN VISIBILITY
   ============================================ */
function setMobileThemeBtn() {
    const btn=document.getElementById('mobileTheme');
    if (!btn) return;
    btn.style.display=window.innerWidth<=768?'flex':'none';
}

/* ============================================
   MODAL CLICK OUTSIDE
   ============================================ */
window.addEventListener('click', e=>{
    if (e.target.id==='productModal') closeModal();
});

/* ============================================
   SRP KEYBOARD
   ============================================ */
document.addEventListener('keydown', e=>{
    if (e.key==='Escape') {
        if (document.getElementById('productModal').classList.contains('open')) closeModal();
        else if (document.getElementById('srpOverlay').classList.contains('open')) closeSRP();
        else closeDropdown();
    }
});

/* ============================================
   SEARCH INPUT INIT
   ============================================ */
function initSearch() {
    const inp=document.getElementById('mainSearch');
    const clear=document.getElementById('clearSearch');
    if (!inp) return;
    let t;
    inp.addEventListener('focus', ()=>showDropdown(inp.value));
    inp.addEventListener('input', ()=>{
        const v=inp.value;
        clear.style.display=v?'flex':'none';
        clearTimeout(t);
        t=setTimeout(()=>showDropdown(v),180);
    });
    inp.addEventListener('keydown', e=>{
        if (e.key==='Enter'&&inp.value.trim().length>=1) triggerSearch(inp.value.trim());
        if (e.key==='Escape') closeDropdown();
    });
    if (clear) {
        clear.addEventListener('click', ()=>{
            inp.value='';
            clear.style.display='none';
            closeDropdown();
            inp.focus();
        });
    }
    const srpInp=document.getElementById('srpInput');
    if (srpInp) {
        srpInp.addEventListener('keydown', e=>{ if (e.key==='Escape') closeSRP(); });
    }
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener('DOMContentLoaded', ()=>{
    applyTheme(state.theme);
    setMobileThemeBtn();
    loadData();
    initSlider();
    renderMegaMenu();
    renderProducts();
    initTimer();
    initSearch();
    initDealsScroll();
    updateAuthUI();
    window.addEventListener('resize', setMobileThemeBtn);
});