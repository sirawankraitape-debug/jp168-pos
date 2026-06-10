/* ============================================================
   JP168 POS — Data layer
   Two logical databases (per requirement):
     DB1  products  — รายการสินค้า (catalog: code, name, category, size…)
     DB2  prices    — ราคาต่อหน่วย (price/cost keyed by productId)
   Receipts persisted separately. All in localStorage (mock SQLite).
   ============================================================ */
(function () {
  const K = {
    products: 'jp168.products',
    prices:   'jp168.prices',
    receipts: 'jp168.receipts',
    seq:      'jp168.seq',
  };

  // ---- Seed: product catalog (DB1) ----
  const SEED_PRODUCTS = [
    { id:'p01', code:'TS-001', name:'เสื้อยืดคอกลม Cotton 100%', category:'เสื้อยืด', size:'M',  color:'ดำ',    unit:'ตัว' },
    { id:'p02', code:'TS-002', name:'เสื้อยืดคอกลม Cotton 100%', category:'เสื้อยืด', size:'L',  color:'ขาว',   unit:'ตัว' },
    { id:'p03', code:'TS-003', name:'เสื้อยืดคอกลม Cotton 100%', category:'เสื้อยืด', size:'XL', color:'กรม',   unit:'ตัว' },
    { id:'p04', code:'PL-101', name:'เสื้อโปโลแขนสั้น JP Premium', category:'เสื้อโปโล', size:'M',  color:'ดำ-ทอง', unit:'ตัว' },
    { id:'p05', code:'PL-102', name:'เสื้อโปโลแขนสั้น JP Premium', category:'เสื้อโปโล', size:'L',  color:'เทา',   unit:'ตัว' },
    { id:'p06', code:'SP-201', name:'เสื้อกีฬาฟุตบอลตัวรุ่น Dri-Fit', category:'เสื้อกีฬา', size:'M', color:'แดง', unit:'ตัว' },
    { id:'p07', code:'SP-202', name:'เสื้อกีฬาฟุตบอลตัวรุ่น Dri-Fit', category:'เสื้อกีฬา', size:'L', color:'น้ำเงิน', unit:'ตัว' },
    { id:'p08', code:'SP-203', name:'เสื้อกีฬาฟุตบอลตัวรุ่น Dri-Fit', category:'เสื้อกีฬา', size:'XL', color:'เขียว', unit:'ตัว' },
    { id:'p09', code:'JS-301', name:'ชุดกีฬาทีม (เสื้อ+กางเกง)', category:'ชุดกีฬา', size:'L',  color:'ดำ-ทอง', unit:'ชุด' },
    { id:'p10', code:'JS-302', name:'ชุดกีฬาทีม (เสื้อ+กางเกง)', category:'ชุดกีฬา', size:'XL', color:'กรม',   unit:'ชุด' },
    { id:'p11', code:'PT-401', name:'กางเกงกีฬาขาสั้น', category:'กางเกง', size:'M',  color:'ดำ',  unit:'ตัว' },
    { id:'p12', code:'PT-402', name:'กางเกงกีฬาขาสั้น', category:'กางเกง', size:'L',  color:'กรม', unit:'ตัว' },
    { id:'p13', code:'PT-403', name:'กางเกงวอร์มขายาว', category:'กางเกง', size:'L',  color:'ดำ',  unit:'ตัว' },
    { id:'p14', code:'AC-501', name:'ถุงเท้ากีฬา (แพ็ค 3 คู่)', category:'อุปกรณ์', size:'Free', color:'ขาว', unit:'แพ็ค' },
    { id:'p15', code:'AC-502', name:'หมวกแก๊ป JP Sport', category:'อุปกรณ์', size:'Free', color:'ดำ', unit:'ใบ' },
    { id:'p16', code:'AC-503', name:'ผ้าขนหนูกีฬา', category:'อุปกรณ์', size:'Free', color:'เทา', unit:'ผืน' },
  ];

  // ---- Seed: prices (DB2) ----
  const SEED_PRICES = {
    p01:{price:159,cost:95,stock:120}, p02:{price:159,cost:95,stock:88},  p03:{price:179,cost:105,stock:64},
    p04:{price:329,cost:190,stock:54}, p05:{price:329,cost:190,stock:41}, p06:{price:259,cost:150,stock:73},
    p07:{price:259,cost:150,stock:69}, p08:{price:279,cost:160,stock:30}, p09:{price:590,cost:360,stock:22},
    p10:{price:590,cost:360,stock:18}, p11:{price:189,cost:110,stock:95}, p12:{price:189,cost:110,stock:80},
    p13:{price:299,cost:175,stock:46}, p14:{price:129,cost:70,stock:140}, p15:{price:199,cost:115,stock:60},
    p16:{price:149,cost:85,stock:52},
  };

  function todayMinus(d){ const t=new Date(); t.setDate(t.getDate()-d); return t; }
  function iso(t){ return t.toISOString(); }

  // ---- Seed: receipts history ----
  function seedReceipts() {
    const pick = (id) => { const p = SEED_PRODUCTS.find(x=>x.id===id); return {...p, price: SEED_PRICES[id].price}; };
    const mk = (no, daysAgo, hour, lines, payment, customer) => {
      const items = lines.map(([id,qty]) => { const p = pick(id); return { productId:id, code:p.code, name:p.name, size:p.size, qty, price:p.price }; });
      const subtotal = items.reduce((s,i)=>s+i.qty*i.price,0);
      const d = todayMinus(daysAgo); d.setHours(hour, (no*7)%60, 0, 0);
      return { id:'r'+no, no:'B'+String(68000+no), date: iso(d), items, subtotal, discount:0, vat:0, total:subtotal, payment, customer, cash: Math.ceil(subtotal/100)*100, };
    };
    return [
      mk(1, 0, 10, [['p01',2],['p11',1]], 'เงินสด', 'ลูกค้าทั่วไป'),
      mk(2, 0, 11, [['p09',1]], 'โอน', 'ทีมฟุตบอล อบต.'),
      mk(3, 0, 13, [['p04',3],['p15',1]], 'เงินสด', 'ลูกค้าทั่วไป'),
      mk(4, 0, 15, [['p06',5],['p07',5]], 'โอน', 'รร.บ้านหนองไผ่'),
      mk(5, 1, 9,  [['p02',1],['p14',2]], 'เงินสด', 'ลูกค้าทั่วไป'),
      mk(6, 1, 14, [['p10',2]], 'บัตร', 'คุณสมชาย'),
      mk(7, 1, 16, [['p13',1],['p16',1]], 'เงินสด', 'ลูกค้าทั่วไป'),
      mk(8, 2, 10, [['p05',2],['p12',2]], 'โอน', 'ลูกค้าทั่วไป'),
      mk(9, 2, 12, [['p08',4]], 'เงินสด', 'ชมรมแบดมินตัน'),
      mk(10,3, 11, [['p01',6]], 'โอน', 'ลูกค้าส่ง'),
      mk(11,3, 15, [['p15',2],['p16',2]], 'เงินสด', 'ลูกค้าทั่วไป'),
      mk(12,4, 13, [['p09',2],['p10',1]], 'โอน', 'สโมสรฟุตซอล'),
      mk(13,5, 10, [['p03',3]], 'เงินสด', 'ลูกค้าทั่วไป'),
      mk(14,6, 14, [['p06',8]], 'โอน', 'รร.วัดสระแก้ว'),
    ].reverse();
  }

  // ---- storage ----
  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }

  // init (only seeds once; respects user edits afterward)
  if (!localStorage.getItem(K.products)) save(K.products, SEED_PRODUCTS);
  if (!localStorage.getItem(K.prices))   save(K.prices, SEED_PRICES);
  if (!localStorage.getItem(K.receipts)) save(K.receipts, seedReceipts());
  if (!localStorage.getItem(K.seq))      save(K.seq, 68015);

  const listeners = new Set();
  function emit(){ listeners.forEach(fn => fn()); }

  const DB = {
    K,
    getProducts(){ return load(K.products, []); },
    getPrices(){ return load(K.prices, {}); },
    getReceipts(){ return load(K.receipts, []); },
    // joined view: catalog + price
    getCatalog(){
      const prices = DB.getPrices();
      return DB.getProducts().map(p => ({ ...p, ...(prices[p.id] || {price:0,cost:0,stock:0}) }));
    },
    setProducts(arr){ save(K.products, arr); emit(); },
    setPrices(obj){ save(K.prices, obj); emit(); },
    upsertProduct(p){
      const arr = DB.getProducts();
      const i = arr.findIndex(x=>x.id===p.id);
      if (i>=0) arr[i] = {...arr[i], ...p}; else arr.unshift(p);
      save(K.products, arr);
      const prices = DB.getPrices();
      if (!prices[p.id]) prices[p.id] = {price:p.price||0, cost:p.cost||0, stock:p.stock||0};
      else prices[p.id] = {...prices[p.id], price: p.price ?? prices[p.id].price, cost: p.cost ?? prices[p.id].cost, stock: p.stock ?? prices[p.id].stock };
      save(K.prices, prices);
      emit();
    },
    deleteProduct(id){
      save(K.products, DB.getProducts().filter(p=>p.id!==id));
      const prices = DB.getPrices(); delete prices[id]; save(K.prices, prices);
      emit();
    },
    setPrice(id, patch){
      const prices = DB.getPrices();
      prices[id] = {...(prices[id]||{price:0,cost:0,stock:0}), ...patch};
      save(K.prices, prices); emit();
    },
    nextNo(){
      let n = load(K.seq, 68015) + 1; save(K.seq, n);
      return 'B' + n;
    },
    addReceipt(r){
      const arr = DB.getReceipts(); arr.unshift(r); save(K.receipts, arr);
      // decrement stock
      const prices = DB.getPrices();
      r.items.forEach(it => { if (prices[it.productId]) prices[it.productId].stock = Math.max(0,(prices[it.productId].stock||0) - it.qty); });
      save(K.prices, prices);
      emit();
    },
    deleteReceipt(id){ save(K.receipts, DB.getReceipts().filter(r=>r.id!==id)); emit(); },
    subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn); },
    resetAll(){ save(K.products,SEED_PRODUCTS); save(K.prices,SEED_PRICES); save(K.receipts,seedReceipts()); save(K.seq,68015); emit(); },
  };

  // ---- formatting helpers ----
  const fmt = {
    baht(n){ return '฿' + (n||0).toLocaleString('th-TH', {minimumFractionDigits:0, maximumFractionDigits:0}); },
    baht2(n){ return (n||0).toLocaleString('th-TH', {minimumFractionDigits:2, maximumFractionDigits:2}); },
    num(n){ return (n||0).toLocaleString('th-TH'); },
    date(iso){ const d=new Date(iso); return d.toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'2-digit'}); },
    dateLong(iso){ const d=new Date(iso); return d.toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'}); },
    time(iso){ const d=new Date(iso); return d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}); },
    dt(iso){ return fmt.date(iso)+' · '+fmt.time(iso); },
  };

  const SHOP = {
    name: 'JP 75 T-SHIRT',
    brand: 'JP168 T-SHIRT & SPORT',
    tel: '085-174-3150',
    reg: '1101500694123',
    address: 'ร้านเสื้อผ้ากีฬา & สกรีนเสื้อ',
  };

  // useStore hook factory (depends on React global)
  function makeHook(React){
    return function useStore(selector){
      const [, force] = React.useReducer(x=>x+1, 0);
      React.useEffect(() => DB.subscribe(force), []);
      return selector ? selector(DB) : DB;
    };
  }

  window.JPDB = DB;
  window.JPFMT = fmt;
  window.JPSHOP = SHOP;
  window.makeUseStore = makeHook;
})();
