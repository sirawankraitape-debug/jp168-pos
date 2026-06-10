/* ============================================================
   JP168 POS — Unit price management (DB2: ราคาต่อหน่วย)
   ============================================================ */
(function () {
  const { useState, useMemo } = React;
  const Icon = window.Icon, fmt = window.JPFMT;
  const { ProductThumb, ImportExport } = window;

  function EditCell({ value, onCommit, prefix }) {
    const [v, setV] = useState(String(value));
    const [editing, setEditing] = useState(false);
    React.useEffect(()=>{ if(!editing) setV(String(value)); }, [value, editing]);
    function commit(){ setEditing(false); const n=Number(v); if(!isNaN(n)&&n!==value) onCommit(n); else setV(String(value)); }
    return (
      <div className={'price-cell'+(editing?' editing':'')} onClick={()=>setEditing(true)}>
        {prefix && <span className="pc-prefix">{prefix}</span>}
        <input className="num" value={v} type="number" min="0"
          onFocus={()=>setEditing(true)} onChange={e=>setV(e.target.value)} onBlur={commit}
          onKeyDown={e=>{ if(e.key==='Enter') e.target.blur(); if(e.key==='Escape'){ setV(String(value)); e.target.blur(); } }}/>
      </div>
    );
  }

  function Prices() {
    const DB = window.JPDB;
    const catalog = DB.getCatalog();
    const [q, setQ] = useState('');
    const [io, setIo] = useState(null);
    const [bulk, setBulk] = useState(false);

    const rows = useMemo(()=>catalog.filter(p=>!q||(p.name+p.code).toLowerCase().includes(q.toLowerCase())), [catalog,q]);
    const totalValue = catalog.reduce((s,p)=>s+p.price*p.stock,0);
    const avgMargin = catalog.length ? Math.round(catalog.reduce((s,p)=>s+(p.price?((p.price-p.cost)/p.price*100):0),0)/catalog.length) : 0;

    function applyBulk(pct){
      const prices = DB.getPrices();
      Object.keys(prices).forEach(id=>{ prices[id].price = Math.round(prices[id].price*(1+pct/100)); });
      DB.setPrices(prices); window.jpToast(`ปรับราคาทั้งหมด ${pct>0?'+':''}${pct}% เรียบร้อย`,'tag'); setBulk(false);
    }

    return (
      <div className="content-narrow">
        <div className="sec-head">
          <div className="row gap-12">
            <div style={{width:42,height:42,borderRadius:12,background:'var(--ink)',color:'var(--gold)',display:'grid',placeItems:'center'}}><Icon name="tag" size={20}/></div>
            <div><h2>ราคาต่อหน่วย</h2><div className="sub">DB2 · ฐานข้อมูลราคา · แก้ไขในตารางได้ทันที</div></div>
          </div>
          <div className="sec-spacer"></div>
          <button className="btn btn-ghost hide-mobile" onClick={()=>setBulk(b=>!b)}><Icon name="swap" size={17}/> ปรับราคาทั้งหมด</button>
          <button className="btn btn-ghost hide-mobile" onClick={()=>setIo('export')}><Icon name="download" size={17}/> ส่งออก</button>
          <button className="btn btn-gold" onClick={()=>setIo('import')}><Icon name="upload" size={18}/> นำเข้าราคา</button>
        </div>

        <div className="grid g-3" style={{marginBottom:16}}>
          <div className="card card-pad"><div className="stat-label">มูลค่าสต๊อกรวม (ราคาขาย)</div><div className="stat-val num" style={{fontSize:24}}>{fmt.baht(totalValue)}</div></div>
          <div className="card card-pad"><div className="stat-label">กำไรเฉลี่ย</div><div className="stat-val num" style={{fontSize:24,color:'var(--green)'}}>{avgMargin}%</div></div>
          <div className="card card-pad"><div className="stat-label">จำนวนรายการราคา</div><div className="stat-val num" style={{fontSize:24}}>{catalog.length}</div></div>
        </div>

        {bulk && (
          <div className="card card-pad" style={{marginBottom:16, background:'var(--gold-wash)', border:'1px solid var(--gold-soft)'}}>
            <div className="row gap-12 wrap spread">
              <div className="row gap-10"><Icon name="swap" size={18} style={{color:'var(--gold-deep)'}}/><b style={{fontSize:14}}>ปรับราคาขายทุกรายการพร้อมกัน</b></div>
              <div className="row gap-8 wrap">
                {[-10,-5,5,10,15].map(p=><button key={p} className="btn btn-sm btn-ghost" onClick={()=>applyBulk(p)}>{p>0?'+':''}{p}%</button>)}
                <button className="btn btn-sm" style={{background:'transparent'}} onClick={()=>setBulk(false)}><Icon name="x" size={15}/></button>
              </div>
            </div>
          </div>
        )}

        <div className="row gap-12" style={{marginBottom:16}}>
          <div className="tb-search" style={{flex:1, background:'var(--surface)'}}>
            <Icon name="search" size={18}/><input placeholder="ค้นหาสินค้า…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
        </div>

        <div className="card" style={{overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr>
              <th>สินค้า</th><th className="r hide-mobile">ทุน/หน่วย</th><th className="r">ราคาขาย/หน่วย</th>
              <th className="r hide-mobile">กำไร</th><th className="r">สต๊อก</th><th className="r hide-mobile">มูลค่า</th>
            </tr></thead>
            <tbody>
              {rows.map(p=>{
                const margin = p.price?Math.round((p.price-p.cost)/p.price*100):0;
                return (
                  <tr key={p.id}>
                    <td><div className="row gap-12"><ProductThumb product={p} size={38}/><div><div style={{fontWeight:600,fontSize:13.5}}>{p.name}</div><div style={{fontSize:11.5,color:'var(--tx-3)'}}>{p.code} · {p.size}</div></div></div></td>
                    <td className="r hide-mobile"><EditCell value={p.cost} prefix="฿" onCommit={v=>DB.setPrice(p.id,{cost:v})}/></td>
                    <td className="r"><EditCell value={p.price} prefix="฿" onCommit={v=>{DB.setPrice(p.id,{price:v}); window.jpToast('อัปเดตราคาแล้ว','tag');}}/></td>
                    <td className="r hide-mobile"><span className={'chip '+(margin>40?'chip-green':margin>20?'chip-gold':'chip-gray')+' num'}>{margin}%</span></td>
                    <td className="r"><EditCell value={p.stock} onCommit={v=>DB.setPrice(p.id,{stock:v})}/></td>
                    <td className="r num hide-mobile" style={{fontWeight:700}}>{fmt.baht(p.price*p.stock)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
        <div className="muted" style={{fontSize:12.5, marginTop:10, textAlign:'center'}}>แตะที่ช่องราคาหรือสต๊อกเพื่อแก้ไข แล้วกด Enter เพื่อบันทึก</div>

        {io && <ImportExport mode={io} target="ราคา" onClose={()=>setIo(null)}/>}
      </div>
    );
  }

  window.Prices = Prices;
})();
