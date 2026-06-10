/* ============================================================
   JP168 POS — Data layer  (Supabase cloud DB — shared across devices)
   Two logical databases:
     products  — DB1 รายการสินค้า (code, name, category, size…)
     prices    — DB2 ราคาต่อหน่วย (price/cost/stock keyed by productId)
   Receipts + config (seq counter) stored in Supabase.
   In-memory state is the UI source of truth; Supabase is the
   authoritative store.  Realtime + 15-second polling keep all
   devices in sync.
   ============================================================ */
(function () {
  const SUPABASE_URL = 'https://atjnkwpgkxqomkmacdcj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_dmYvkW1kVIVHK48oF4smcg_rVLY9AzO';

  /* ---------- In-memory state (UI reads these synchronously) ---------- */
  let _products = [];
  let _prices   = {};   // { [productId]: {price,cost,stock} }
  let _receipts = [];
  let _seq      = 68015;

  /* ---------- Reactive listeners (mirror of old subscribe pattern) ---- */
  const listeners = new Set();
  function emit() { listeners.forEach(fn => fn()); }

  /* ---------- Supabase client ---------------------------------------- */
  // window.supabase is loaded from the Supabase CDN <script> before this
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ---------- Load all data from Supabase ----------------------------- */
  async function loadAll() {
    const [p, pr, r, c] = await Promise.all([
      sb.from('products').select('*').order('created_at', { ascending: true }),
      sb.from('prices').select('*'),
      sb.from('receipts').select('*').order('date', { ascending: false }),
      sb.from('config').select('*'),
    ]);

    if (p.error) throw new Error('โหลดสินค้าไม่ได้: ' + p.error.message);

    _products = p.data || [];

    _prices = {};
    (pr.data || []).forEach(row => {
      _prices[row.product_id] = { price: row.price, cost: row.cost, stock: row.stock };
    });

    _receipts = (r.data || []).map(row => ({
      ...row,
      items: Array.isArray(row.items) ? row.items : JSON.parse(row.items || '[]'),
    }));

    const seqRow = (c.data || []).find(x => x.key === 'seq');
    _seq = seqRow ? parseInt(seqRow.value) : 68015;

    emit();
  }

  /* ---------- Realtime + polling for cross-device sync --------------- */
  let _lastLoad = 0;
  function scheduleLoad() {
    const now = Date.now();
    if (now - _lastLoad < 800) return;   // debounce rapid fire
    _lastLoad = now;
    loadAll().catch(() => {});
  }

  function setupSync() {
    // Realtime (best-effort — requires Realtime enabled on Supabase tables)
    try {
      sb.channel('jp168-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },  scheduleLoad)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prices' },    scheduleLoad)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' },  scheduleLoad)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'config' },    scheduleLoad)
        .subscribe();
    } catch (e) { /* ignore if Realtime not available */ }

    // Polling fallback — keeps other devices in sync even without Realtime
    setInterval(scheduleLoad, 15000);
  }

  /* ---------- DB interface ------------------------------------------- */
  const DB = {
    /* --- read (synchronous — return in-memory state) --- */
    getProducts() { return _products; },
    getPrices()   { return _prices; },
    getReceipts() { return _receipts; },

    getCatalog() {
      return _products.map(p => ({
        ...p,
        ...(_prices[p.id] || { price: 0, cost: 0, stock: 0 }),
      }));
    },

    /* --- write: optimistic update → async Supabase sync --- */
    upsertProduct(p) {
      // 1. Optimistic in-memory update
      const prod = {
        id: p.id, code: p.code, name: p.name, category: p.category,
        size: p.size, color: p.color || '-', unit: p.unit,
      };
      const ix = _products.findIndex(x => x.id === p.id);
      if (ix >= 0) _products[ix] = { ..._products[ix], ...prod };
      else         _products.unshift(prod);

      _prices[p.id] = {
        price: Number(p.price) || 0,
        cost:  Number(p.cost)  || 0,
        stock: Number(p.stock) || 0,
      };
      emit();

      // 2. Persist to Supabase
      sb.from('products')
        .upsert(prod, { onConflict: 'id' })
        .then(() => sb.from('prices').upsert(
          { product_id: p.id, ..._prices[p.id] },
          { onConflict: 'product_id' }
        ))
        .catch(() => window.jpToast && window.jpToast('บันทึกสินค้าล้มเหลว', 'alert'));
    },

    deleteProduct(id) {
      _products = _products.filter(p => p.id !== id);
      delete _prices[id];
      emit();

      // CASCADE in DB will delete prices row automatically
      sb.from('products').delete().eq('id', id)
        .catch(() => window.jpToast && window.jpToast('ลบสินค้าล้มเหลว', 'alert'));
    },

    setPrice(id, patch) {
      _prices[id] = { ...(_prices[id] || { price: 0, cost: 0, stock: 0 }), ...patch };
      emit();

      sb.from('prices')
        .upsert({ product_id: id, ..._prices[id] }, { onConflict: 'product_id' })
        .catch(() => window.jpToast && window.jpToast('บันทึกราคาล้มเหลว', 'alert'));
    },

    nextNo() {
      _seq += 1;
      const no = 'B' + _seq;
      // fire-and-forget; minor race condition on concurrent devices is acceptable
      sb.from('config').upsert({ key: 'seq', value: String(_seq) }, { onConflict: 'key' }).catch(() => {});
      return no;
    },

    addReceipt(r) {
      // Optimistic
      _receipts.unshift(r);
      r.items.forEach(it => {
        if (_prices[it.productId]) {
          _prices[it.productId].stock = Math.max(0, (_prices[it.productId].stock || 0) - it.qty);
        }
      });
      emit();

      // Persist receipt (items is JSONB — pass array directly)
      sb.from('receipts').insert({ ...r })
        .then(() => Promise.all(
          r.items
            .filter(it => _prices[it.productId])
            .map(it => sb.from('prices')
              .update({ stock: _prices[it.productId].stock })
              .eq('product_id', it.productId)
            )
        ))
        .catch(() => window.jpToast && window.jpToast('บันทึกบิลล้มเหลว', 'alert'));
    },

    deleteReceipt(id) {
      _receipts = _receipts.filter(r => r.id !== id);
      emit();

      sb.from('receipts').delete().eq('id', id)
        .catch(() => window.jpToast && window.jpToast('ลบบิลล้มเหลว', 'alert'));
    },

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    resetAll() {
      Promise.all([
        sb.from('receipts').delete().neq('id', ''),
        sb.from('prices').delete().neq('product_id', ''),
      ])
        .then(() => sb.from('products').delete().neq('id', ''))
        .then(() => sb.from('config').upsert({ key: 'seq', value: '68015' }, { onConflict: 'key' }))
        .then(() => loadAll())
        .catch(e => window.jpToast && window.jpToast('รีเซ็ตล้มเหลว: ' + e.message, 'alert'));
    },

    /* ready: Promise — resolves when initial data is loaded */
    ready: null,
  };

  /* ---------- Formatting helpers ------------------------------------- */
  const fmt = {
    baht(n)    { return '฿' + (n||0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); },
    baht2(n)   { return (n||0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    num(n)     { return (n||0).toLocaleString('th-TH'); },
    date(iso)  { const d = new Date(iso); return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }); },
    dateLong(iso) { const d = new Date(iso); return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }); },
    time(iso)  { const d = new Date(iso); return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); },
    dt(iso)    { return fmt.date(iso) + ' · ' + fmt.time(iso); },
  };

  const SHOP = {
    name:    'JP 75 T-SHIRT',
    brand:   'JP168 T-SHIRT & SPORT',
    tel:     '085-174-3150',
    reg:     '1101500694123',
    address: 'ร้านเสื้อผ้ากีฬา & สกรีนเสื้อ',
  };

  function makeHook(React) {
    return function useStore(selector) {
      const [, force] = React.useReducer(x => x + 1, 0);
      React.useEffect(() => DB.subscribe(force), []);
      return selector ? selector(DB) : DB;
    };
  }

  /* ---------- Bootstrap ---------------------------------------------- */
  DB.ready = loadAll()
    .then(() => { setupSync(); })
    .catch(e => { throw e; });

  window.JPDB         = DB;
  window.JPFMT        = fmt;
  window.JPSHOP       = SHOP;
  window.makeUseStore = makeHook;
})();
