/* ============================================================
   JP168 POS — Sell / create bill (หน้าขาย)
   ============================================================ */
(function () {
  const { useState, useMemo } = React;
  const Icon = window.Icon, fmt = window.JPFMT;
  const { ProductThumb, Seg, ReceiptModal, StockBadge } = window;

  const CATS = ['ทั้งหมด','เสื้อยืด','เสื้อโปโล','เสื้อกีฬา','ชุดกีฬา','กางเกง','อุปกรณ์'];

  function POS({ receiptVariant }) {
    const DB = window.JPDB;
    const catalog = DB.getCatalog();
    const [q, setQ] = useState('');
    const [cat, setCat] = useState('ทั้งหมด');
    const [view, setView] = useState('grid');
    const [cart, setCart] = useState([]);            // {id, qty}
    const [customer, setCustomer] = useState('');
    const [discount, setDiscount] = useState(0);
    const [payment, setPayment] = useState('เงินสด');
    const [cash, setCash] = useState('');
    const [done, setDone] = useState(null);
    const [mobileCart, setMobileCart] = useState(false);
    const todayStr = () => new Date().toISOString().slice(0,10);
    const nowTimeStr = () => new Date().toTimeString().slice(0,5);
    const [billDate, setBillDate] = useState(todayStr);
    const [billTime, setBillTime] = useState(nowTimeStr);

    const filtered = useMemo(() => catalog.filter(p => {
      const okCat = cat==='ทั้งหมด' || p.category===cat;
      const okQ = !q || (p.name+p.code+p.color+p.size).toLowerCase().includes(q.toLowerCase());
      return okCat && okQ;
    }), [catalog, cat, q]);

    const cartLines = cart.map(c => ({ ...catalog.find(p=>p.id===c.id), qty:c.qty })).filter(x=>x.id);
    const subtotal = cartLines.reduce((s,l)=>s+l.qty*l.price,0);
    const total = Math.max(0, subtotal - (Number(discount)||0));
    const count = cartLines.reduce((s,l)=>s+l.qty,0);

    function add(p){
      setCart(c => { const i=c.findIndex(x=>x.id===p.id); if(i>=0){ const n=[...c]; n[i]={...n[i],qty:n[i].qty+1}; return n; } return [...c,{id:p.id,qty:1}]; });
    }
    function setQty(id, qty){ setCart(c => qty<=0 ? c.filter(x=>x.id!==id) : c.map(x=>x.id===id?{...x,qty}:x)); }
    function clearCart(){ setCart([]); setDiscount(0); setCustomer(''); setCash(''); setBillDate(todayStr()); setBillTime(nowTimeStr()); }

    function checkout(){
      if (!cartLines.length) return;
      const [y,mo,d] = billDate.split('-').map(Number);
      const [h,mi] = billTime.split(':').map(Number);
      const billIso = new Date(y, mo-1, d, h, mi, 0).toISOString();
      const r = {
        id:'r'+Date.now(), no: DB.nextNo(), date: billIso,
        items: cartLines.map(l=>({ productId:l.id, code:l.code, name:l.name, size:l.size, qty:l.qty, price:l.price })),
        subtotal, discount:Number(discount)||0, vat:0, total, payment,
        customer: customer.trim()||'ลูกค้าทั่วไป',
        cash: payment==='เงินสด' ? (Number(cash)||total) : total,
      };
      DB.addReceipt(r);
      setDone(r); setMobileCart(false); clearCart();
    }

    const CartPanel = ({ embedded }) => (
      <div className={embedded?'pos-cart':'pos-cart pos-cart-mobile'}>
        <div className="pos-cart-head">
          <Icon name="pos" size={19}/>
          <b>รายการขาย</b>
          {count>0 && <span className="chip chip-gold num" style={{marginLeft:6}}>{count} ชิ้น</span>}
          <div style={{flex:1}}></div>
          {cartLines.length>0 && <button className="btn btn-sm btn-danger" onClick={clearCart}><Icon name="trash" size={14}/></button>}
          {!embedded && <button className="modal-x" style={{marginLeft:6}} onClick={()=>setMobileCart(false)}><Icon name="x" size={18}/></button>}
        </div>

        <div className="pos-cart-items">
          {cartLines.length===0 && (
            <div className="empty" style={{padding:'40px 16px'}}>
              <Icon name="pos" size={42}/>
              <div style={{fontWeight:600, color:'var(--tx-2)'}}>ยังไม่มีสินค้า</div>
              <div style={{fontSize:13}}>แตะสินค้าทางซ้ายเพื่อเพิ่มลงบิล</div>
            </div>
          )}
          {cartLines.map(l => (
            <div key={l.id} className="pos-line">
              <ProductThumb product={l} size={42}/>
              <div style={{flex:1, minWidth:0}}>
                <div className="pos-line-name">{l.name}</div>
                <div style={{fontSize:11.5, color:'var(--tx-3)'}}>{l.code} · {l.size} · {fmt.baht(l.price)}</div>
              </div>
              <div className="qty-step">
                <button onClick={()=>setQty(l.id,l.qty-1)}><Icon name="minus" size={15}/></button>
                <span className="num">{l.qty}</span>
                <button onClick={()=>setQty(l.id,l.qty+1)}><Icon name="plus" size={15}/></button>
              </div>
              <div className="num" style={{width:64, textAlign:'right', fontWeight:700, fontSize:13.5}}>{fmt.baht(l.qty*l.price)}</div>
            </div>
          ))}
        </div>

        <div className="pos-cart-foot">
          <div className="row gap-8" style={{marginBottom:10}}>
            <div style={{position:'relative', flex:1}}>
              <Icon name="user" size={16} style={{position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--tx-3)'}}/>
              <input className="field" style={{paddingLeft:34, padding:'9px 11px 9px 34px'}} placeholder="ชื่อลูกค้า (ไม่บังคับ)" value={customer} onChange={e=>setCustomer(e.target.value)}/>
            </div>
          </div>
          <div className="row gap-8" style={{marginBottom:10}}>
            <Seg value={payment} size="sm" onChange={setPayment}
              options={[{value:'เงินสด',label:'เงินสด',icon:'cash'},{value:'โอน',label:'โอน',icon:'transfer'},{value:'บัตร',label:'บัตร',icon:'card'}]}/>
          </div>
          <div className="row gap-8" style={{marginBottom:10, alignItems:'center'}}>
            <Icon name="calendar" size={16} style={{color:'var(--tx-3)', flexShrink:0}}/>
            <input type="date" className="field num" style={{flex:1, padding:'7px 10px', fontSize:13.5}}
              value={billDate} max={todayStr()} onChange={e=>setBillDate(e.target.value)}/>
            <input type="time" className="field num" style={{width:90, padding:'7px 8px', fontSize:13.5}}
              value={billTime} onChange={e=>setBillTime(e.target.value)}/>
          </div>
          {billDate !== todayStr() && (
            <div style={{fontSize:12, color:'var(--gold-deep)', fontWeight:600, marginBottom:8, textAlign:'center'}}>
              <Icon name="clock" size={13}/> บันทึกย้อนหลัง: {new Date(billDate).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'})}
            </div>
          )}
          <div className="pos-sum-row"><span>ยอดรวม</span><b className="num">{fmt.baht(subtotal)}</b></div>
          <div className="pos-sum-row">
            <span>ส่วนลด</span>
            <div className="row gap-8">
              <input className="field num" style={{width:90, padding:'6px 10px', textAlign:'right'}} type="number" min="0" placeholder="0" value={discount||''} onChange={e=>setDiscount(e.target.value)}/>
            </div>
          </div>
          {payment==='เงินสด' && (
            <div className="pos-sum-row">
              <span>รับเงินสด</span>
              <input className="field num" style={{width:110, padding:'6px 10px', textAlign:'right'}} type="number" min="0" placeholder={total} value={cash} onChange={e=>setCash(e.target.value)}/>
            </div>
          )}
          {payment==='เงินสด' && cash && Number(cash)>=total && (
            <div className="pos-sum-row" style={{color:'var(--green)'}}><span>เงินทอน</span><b className="num">{fmt.baht(Number(cash)-total)}</b></div>
          )}
          <div className="pos-total"><span>ยอดสุทธิ</span><b className="num">{fmt.baht(total)}</b></div>
          <button className="btn btn-gold btn-block" style={{padding:'14px', fontSize:15.5, marginTop:6}} disabled={!cartLines.length} onClick={checkout}>
            <Icon name="check" size={19}/> ชำระเงิน & ออกบิล
          </button>
        </div>
      </div>
    );

    return (
      <div className="pos-wrap">
        {/* Products */}
        <div className="pos-products">
          <div className="pos-toolbar">
            <div className="tb-search" style={{flex:1, display:'flex'}}>
              <Icon name="search" size={18}/>
              <input placeholder="ค้นหาสินค้า / รหัส / ไซส์…" value={q} onChange={e=>setQ(e.target.value)}/>
            </div>
            <div className="hide-mobile"><Seg value={view} size="sm" onChange={setView} options={[{value:'grid',icon:'grid',label:''},{value:'list',icon:'list',label:''}]}/></div>
          </div>
          <div className="pos-cats">
            {CATS.map(c => (
              <button key={c} className={'cat-pill'+(cat===c?' active':'')} onClick={()=>setCat(c)}>{c}</button>
            ))}
          </div>

          {view==='grid' ? (
            <div className="pos-grid">
              {filtered.map(p => (
                <button key={p.id} className="prod-card" onClick={()=>add(p)} disabled={p.stock<=0}>
                  <div className="prod-card-top">
                    <ProductThumb product={p} size={52} radius={13}/>
                    {p.stock<25 && <span className={'dot-stk '+(p.stock<=0?'red':'gold')}>{p.stock<=0?'หมด':p.stock}</span>}
                  </div>
                  <div className="prod-name">{p.name}</div>
                  <div className="prod-code">{p.code} · {p.color}</div>
                  <div className="prod-foot">
                    <span className="prod-price num">{fmt.baht(p.price)}</span>
                    <span className="prod-add"><Icon name="plus" size={16}/></span>
                  </div>
                </button>
              ))}
              {filtered.length===0 && <div className="empty" style={{gridColumn:'1/-1'}}><Icon name="search" size={42}/><div>ไม่พบสินค้า</div></div>}
            </div>
          ) : (
            <div className="card" style={{overflow:'hidden'}}>
              <table className="tbl">
                <thead><tr><th>สินค้า</th><th className="hide-mobile">หมวด</th><th className="c">ไซส์</th><th className="r">ราคา</th><th className="r">สต๊อก</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td><div className="row gap-12"><ProductThumb product={p} size={38}/><div><div style={{fontWeight:600,fontSize:13.5}}>{p.name}</div><div style={{fontSize:11.5,color:'var(--tx-3)'}}>{p.code}</div></div></div></td>
                      <td className="hide-mobile"><span className="tag">{p.category}</span></td>
                      <td className="c"><span className="tag">{p.size}</span></td>
                      <td className="r num" style={{fontWeight:700}}>{fmt.baht(p.price)}</td>
                      <td className="r"><StockBadge stock={p.stock}/></td>
                      <td className="r"><button className="btn btn-sm btn-soft" disabled={p.stock<=0} onClick={()=>add(p)}><Icon name="plus" size={15}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cart (desktop) */}
        <div className="pos-cart-col hide-mobile"><CartPanel embedded/></div>

        {/* Mobile cart trigger */}
        {count>0 && !mobileCart && (
          <button className="pos-mobile-bar" onClick={()=>setMobileCart(true)}>
            <span className="pos-mobile-count num">{count}</span>
            <span>ดูบิล</span>
            <span className="num" style={{marginLeft:'auto', fontSize:16}}>{fmt.baht(total)}</span>
            <Icon name="chevR" size={18}/>
          </button>
        )}
        {mobileCart && <div className="pos-sheet-back" onClick={()=>setMobileCart(false)}><div onClick={e=>e.stopPropagation()} style={{width:'100%'}}><CartPanel/></div></div>}

        {done && <ReceiptModal receipt={done} success variant={receiptVariant} onClose={()=>setDone(null)}/>}
      </div>
    );
  }

  window.POS = POS;
})();
