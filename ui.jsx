/* ============================================================
   JP168 POS — Shared UI primitives
   ============================================================ */
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;
  const fmt = window.JPFMT;

  // ---------- Modal ----------
  function Modal({ title, icon, children, onClose, footer, width=520 }) {
    useEffect(() => {
      const h = (e) => { if (e.key === 'Escape') onClose && onClose(); };
      window.addEventListener('keydown', h);
      return () => window.removeEventListener('keydown', h);
    }, []);
    return (
      <div className="modal-back" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose&&onClose(); }}>
        <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
          {title && (
            <div className="modal-head">
              {icon && <div style={{ width:38, height:38, borderRadius:10, background:'var(--gold-wash)', color:'var(--gold-deep)', display:'grid', placeItems:'center' }}><Icon name={icon} size={20}/></div>}
              <h3>{title}</h3>
              <button className="modal-x" onClick={onClose} aria-label="ปิด"><Icon name="x" size={18}/></button>
            </div>
          )}
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      </div>
    );
  }

  // ---------- Toast ----------
  let pushToastFn = null;
  function ToastHost() {
    const [items, setItems] = useState([]);
    useEffect(() => {
      pushToastFn = (msg, icon='check') => {
        const id = Math.random().toString(36).slice(2);
        setItems(s => [...s, { id, msg, icon }]);
        setTimeout(() => setItems(s => s.filter(t => t.id !== id)), 2600);
      };
      return () => { pushToastFn = null; };
    }, []);
    return (
      <div className="toast-wrap">
        {items.map(t => (
          <div className="toast" key={t.id}><Icon name={t.icon} size={18}/>{t.msg}</div>
        ))}
      </div>
    );
  }
  window.jpToast = (msg, icon) => { if (pushToastFn) pushToastFn(msg, icon); };

  // ---------- Confirm ----------
  function Confirm({ title, message, confirmText='ยืนยัน', danger, onConfirm, onClose }) {
    return (
      <Modal title={title} icon={danger?'alert':'check'} onClose={onClose} width={440}
        footer={<>
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className={'btn '+(danger?'btn-danger':'btn-gold')} onClick={()=>{ onConfirm(); onClose(); }}>{confirmText}</button>
        </>}>
        <p style={{ margin:0, color:'var(--tx-2)', fontSize:14.5, lineHeight:1.6 }}>{message}</p>
      </Modal>
    );
  }

  // ---------- Category color / thumb ----------
  const CAT_COLOR = {
    'เสื้อยืด':   ['#E9EEF6','#3E6CA8'],
    'เสื้อโปโล':  ['#FBF1D6','#C28A12'],
    'เสื้อกีฬา':  ['#FBEAE6','#C0432F'],
    'ชุดกีฬา':    ['#E9F1EC','#2E8B57'],
    'กางเกง':     ['#EDEAF6','#6A55A8'],
    'อุปกรณ์':    ['#F0EDE4','#7A7059'],
  };
  function catColor(cat){ return CAT_COLOR[cat] || ['#F0EDE4','#7A7059']; }

  function ProductThumb({ product, size=46, radius=12 }) {
    const [bg, fg] = catColor(product.category);
    const iconName = product.category === 'อุปกรณ์' ? 'package2'
      : product.category === 'กางเกง' ? 'tag' : 'shirt';
    return (
      <div style={{ width:size, height:size, borderRadius:radius, background:bg, color:fg,
        display:'grid', placeItems:'center', flexShrink:0, position:'relative' }}>
        <Icon name={iconName} size={size*0.5} strokeWidth={1.8}/>
        <span style={{ position:'absolute', bottom:-3, right:-3, background:'var(--ink)', color:'#fff',
          fontSize:9, fontWeight:700, padding:'1px 4px', borderRadius:5, lineHeight:1.3 }}>{product.size}</span>
      </div>
    );
  }

  // ---------- Segmented control ----------
  function Seg({ value, options, onChange, size='md' }) {
    return (
      <div style={{ display:'inline-flex', background:'var(--surface-2)', border:'1px solid var(--line)',
        borderRadius:10, padding:3, gap:2 }}>
        {options.map(o => {
          const val = typeof o==='string'?o:o.value; const label = typeof o==='string'?o:o.label;
          const active = val===value;
          return (
            <button key={val} onClick={()=>onChange(val)}
              style={{ border:'none', cursor:'pointer', borderRadius:7,
                padding: size==='sm'?'5px 10px':'7px 14px', fontSize: size==='sm'?12.5:13.5, fontWeight:600,
                background: active?'var(--surface)':'transparent', color: active?'var(--tx)':'var(--tx-3)',
                boxShadow: active?'var(--sh-sm)':'none', transition:'all .15s', display:'flex', alignItems:'center', gap:6 }}>
              {typeof o!=='string' && o.icon && <Icon name={o.icon} size={15}/>}
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  // ---------- Stat card ----------
  function Stat({ icon, iconBg, iconFg, label, value, unit, delta, deltaDir }) {
    return (
      <div className="card stat">
        <div className="stat-ico" style={{ background:iconBg||'var(--gold-wash)', color:iconFg||'var(--gold-deep)' }}>
          <Icon name={icon} size={21}/>
        </div>
        <div className="stat-label">{label}</div>
        <div className="stat-val num">{value}{unit && <small> {unit}</small>}</div>
        {delta!=null && (
          <div className="stat-delta" style={{ color: deltaDir==='down'?'var(--red)':'var(--green)' }}>
            <Icon name={deltaDir==='down'?'trendDown':'trendUp'} size={14}/> {delta}
          </div>
        )}
      </div>
    );
  }

  // ---------- Stock badge ----------
  function StockBadge({ stock }) {
    if (stock <= 0) return <span className="chip chip-red">หมด</span>;
    if (stock < 25) return <span className="chip chip-gold">เหลือน้อย · {stock}</span>;
    return <span className="chip chip-green num">{stock} {''}</span>;
  }

  Object.assign(window, { Modal, ToastHost, Confirm, ProductThumb, Seg, Stat, StockBadge, catColor });
})();
