/* ============================================
   DATA
   ============================================ */
function loadData() {
    const sp = localStorage.getItem(DB.products);
    if (sp) {
        try { state.products = JSON.parse(sp); } catch(e) { seedData(); }
    } else {
        seedData();
    }
    const ss = localStorage.getItem(DB.slides);
    if (ss) {
        try { state.slides = JSON.parse(ss); } catch(e) { seedSlides(); }
    } else {
        seedSlides();
    }
}

function seedSlides() {
    state.slides = [
        { image: 'https://dkstatics-public.digikala.com/digikala-adservice-banners/114974665b95b81ac9f34f5c4541ed103cbeefc6_1781939408.jpg?x-oss-process=image/quality,q_95/format,webp'},
        { image: 'https://dkstatics-public.digikala.com/digikala-adservice-banners/9187933a6a5d160c4dd53aa11d2ed21e3864fda1_1781700091.gif?x-oss-process=image?x-oss-process=image/format,webp'},
        { image: 'https://dkstatics-public.digikala.com/digikala-adservice-banners/106a9545642ec0528d7bcb59f56625689ccac627_1781703061.jpg?x-oss-process=image/quality,q_95/format,webp'},
        { image: 'https://dkstatics-public.digikala.com/digikala-adservice-banners/574faf018ec418bb74c8af8fda4827cded2313c8_1782105200.jpg?x-oss-process=image/quality,q_95/format,webp'},
        { image: 'https://dkstatics-public.digikala.com/digikala-adservice-banners/d01a4054f4c5e8045bdaa2e72e09c76c5519caae_1782146939.jpg?x-oss-process=image/quality,q_95/format,webp'},
        { image: 'https://dkstatics-public.digikala.com/digikala-adservice-banners/e2723ddd53e8c92e3fe538df2cb53fff66c8e0fd_1782052473.jpg?x-oss-process=image/quality,q_95/format,webp'},
        { image: 'https://dkstatics-public.digikala.com/digikala-adservice-banners/693460c45dd2548bf68f885ddaace53586a198fd_1781688239.jpg?x-oss-process=image/quality,q_95/format,webp'},
        { image: 'https://dkstatics-public.digikala.com/digikala-adservice-banners/a6fbb89a193ecd94685e6dcf26fa68797c4b39dc_1782132104.jpg?x-oss-process=image/quality,q_95/format,webp'},
        { image: 'https://dkstatics-public.digikala.com/digikala-adservice-banners/88cdb06d0af06758db8b81cdccb3c6a0dc0bcc84_1782110455.jpg?x-oss-process=image/quality,q_95/format,webp'}
        

    ];
}

function seedData() {
    const d = [
        { id:1, name:'گوشی موبایل آیفون ۱۳', category:'کالای دیجیتال', price:45000000, discount:10, stock:5, colors:[{name:'مشکی',code:'#000000'},{name:'سفید',code:'#ffffff'}], image:'https://picsum.photos/300/300?random=10', description:'گوشی اپل با تراشه A15 بایونیک و دوربین دوگانه.', hot:true, rating:4.5, reviews:234, specs:{'پردازنده':'A15 Bionic','RAM':'6GB','حافظه':'128GB'} },
        { id:2, name:'لپ‌تاپ ایسوس VivoBook', category:'کالای دیجیتال', price:32000000, discount:0, stock:2, colors:[{name:'نقره‌ای',code:'#C0C0C0'}], image:'https://picsum.photos/300/300?random=11', description:'لپ‌تاپ فوق سبک مناسب برای کارهای گرافیکی.', hot:false, rating:4, reviews:156, specs:{'CPU':'Intel Core i7','RAM':'16GB','SSD':'512GB'} },
        { id:3, name:'ساعت هوشمند سامسونگ Galaxy Watch', category:'کالای دیجیتال', price:8500000, discount:15, stock:0, colors:[{name:'مشکی',code:'#000000'}], image:'https://picsum.photos/300/300?random=12', description:'ساعت هوشمند با قابلیت اندازه‌گیری ضربان قلب.', hot:false, rating:4.2, reviews:89, specs:{'نمایشگر':'AMOLED','باتری':'3 روز'} },
        { id:4, name:'کت مردانه اسپرت', category:'مد و پوشاک', price:1200000, discount:5, stock:10, colors:[{name:'سرمه‌ای',code:'#000080'},{name:'خاکستری',code:'#808080'}], image:'https://picsum.photos/300/300?random=13', description:'کت مردانه با پارچه نخی و کیفیت بالا.', hot:false, rating:3.8, reviews:45, specs:{'جنس':'100% نخ','سایز':'S-XXL'} },
        { id:5, name:'جاروبرقی رباتیک شیائومی', category:'خانه و آشپزخانه', price:9500000, discount:20, stock:1, colors:[{name:'سفید',code:'#ffffff'}], image:'https://picsum.photos/300/300?random=14', description:'جاروبرقی هوشمند با نقشه‌برداری لیزری.', hot:true, rating:4.7, reviews:312, specs:{'ظرفیت آب':'200ml','مدت اجرا':'120 دقیقه'} },
        { id:6, name:'ست لوازم آرایشی', category:'آرایشی و بهداشتی', price:2300000, discount:0, stock:8, colors:[], image:'https://picsum.photos/300/300?random=15', description:'شامل رژلب، کرم پودر و ریمل.', hot:false, rating:4.3, reviews:78, specs:{'محتویات':'12 عدد','منشاء':'کره جنوبی'} }
    ];
    localStorage.setItem(DB.products, JSON.stringify(d));
    state.products = d;
}