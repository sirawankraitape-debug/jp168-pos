/* ============================================================
   JP168 POS — Product catalog management (DB1: รายการสินค้า)
   ============================================================ */
(function () {
  const { useState, useMemo } = React;
  const Icon = window.Icon, fmt = window.JPFMT;
  const { Modal, ProductThumb, Confirm, StockBadge, ImportExport } = window;

  const CATS = ['เสื้อยืด','เสื้อโปโล','เสื้อกีฬา','ชุดกีฬา','กางเกง','อุปกรณ์'];
  const SIZES = ['S','M','L','XL','2XL','Free'];
  const UNITS = ['ตัว','ชุด','แพ็ค','ใบ','ผืน','คู่','ชิ้น'];

  function ProductForm({ initial, onClose }) {
    const DB = window.JPDB;
    const editing = !!initial;
    const [f, setF] = useState(initial || { code:'', name:'', category:'เสื้อยืด', size:'M', color:'', unit:'ตัว', price:'', cost:'', stock:'' });
    const set = (k,v)=>setF(s=>({...s,[k]:v}));
    function save(){
      if(!f.name.trim()||!f.code.trim()){ window.jpToast('กรุณากรอกรหัสและชื่อสินค้า','alert'); return; }
      DB.upsertProduct({
        id: f.id || ('p'+Date.now()), code:f.code.trim(), name:f.name.trim(), category:f.category,
        size:f.size, color:f.color.trim()||'-', unit:f.unit,
        price:Number(f.price)||0, cost:Number(f.cost)||0, stock:Number(f.stock)||0,
      });
      window.jpToast(editing?'แก้ไขสินค้าเรียบร้อย':'เพิ่มสินค้าใหม่เรียบร้อย','check');
      onClose();
    }
    const lbl = (t)=><label className="field-label">{t}</label>;
    return (
      <Modal title={editing?'แก้ไขสินค้า':'เพิ่มสินค้าใหม่'} icon="box" onClose={onClose} width={560}
        footer={<><button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button><button className="btn btn-gold" onClick={save}><Icon name="check" size={17}/> บันทึก</button></>}>
        <div className="grid g-2" style={{gridTemplateColumns:'1fr 1fr', gap:14}}>
          <div>{lbl('รหัสสินค้า')}<input className="field" placeholder="เช่น TS-001" value={f.code} onChange={e=>set('code',e.target.value)}/></div>
          <div>{lbl('หน่วยนับ')}<select className="field" value={f.unit} onChange={e=>set('unit',e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
          <div style={{gridColumn:'1/-1'}}>{lbl('ชื่อสินค้า')}<input className="field" placeholder="ชื่อสินค้า" value={f.name} onChange={e=>set('name',e.target.value)}/></div>
          <div>{lbl('หมวดหมู่')}<select className="field" value={f.category} onChange={e=>set('category',e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
          <div>{lbl('ไซส์')}<select className="field" value={f.size} onChange={e=>set('size',e.target.value)}>{SIZES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div>{lbl('สี')}<input className="field" placeholder="เช่น ดำ" value={f.color} onChange={e=>set('color',e.target.value)}/></div>
          <div>{lbl('จำนวนสต๊อก')}<input className="field num" type="number" min="0" placeholder="0" value={f.stock} onChange={e=>set('stock',e.target.value)}/></div>
        </div>
        <div style={{marginTop:16, padding:'14px', background:'var(--gold-wash)', borderRadius:12}}>
          <div className="row gap-8" style={{marginBottom:10, color:'var(--gold-deep)', fontWeight:700, fontSize:13}}><Icon name="tag" size={16}/> ราคา (ฐานข้อมูลราคาต่อหน่วย)</div>
          <div className="grid g-2" style={{gridTemplateColumns:'1fr 1fr', gap:14}}>
            <div>{lbl('ราคาขาย / หน่วย')}<input className="field num" type="number" min="0" placeholder="0" value={f.price} onChange={e=>set('price',e.target.value)}/></div>
            <div>{lbl('ราคาทุน (ไม่บังคับ)')}<input className="field num" type="number" min="0" placeholder="0" value={f.cost} onChange={e=>set('cost',e.target.value)}/></div>
          </div>
        </div>
      </Modal>
    );
  }

  function Products() {
    const DB = window.JPDB;
    const catalog = DB.getCatalog();
    const [q, setQ] = useState('');
    const [cat, setCat] = useState('ทั้งหมด');
    const [form, setForm] = useState(null);     // {} or product
    const [del, setDel] = useState(null);
    const [io, setIo] = useState(null);

    const rows = useMemo(()=>catalog.filter(p=>{
      const okCat = cat==='ทั้งหมด'||p.category===cat;
      const okQ = !q || (p.name+p.code+p.color).toLowerCase().includes(q.toLowerCase());
      return okCat&&okQ;
    }), [catalog,cat,q]);

    return (
      <div className="content-narrow">
        <div className="sec-head">
          <div className="row gap-12">
            <div style={{width:42,height:42,borderRadius:12,background:'var(--ink)',color:'var(--gold)',display:'grid',placeItems:'center'}}><Icon name="db" size={21}/></div>
            <div><h2>รายการสินค้า</h2><div className="sub">DB1 · ฐานข้อมูลสินค้า · {catalog.length} รายการ</div></div>
          </div>
          <div className="sec-spacer"></div>
          <button className="btn btn-ghost hide-mobile" onClick={()=>setIo('import')}><Icon name="upload" size={17}/> นำเข้า</button>
          <button className="btn btn-ghost hide-mobile" onClick={()=>setIo('export')}><Icon name="download" size={17}/> ส่งออก</button>
          <button className="btn btn-gold" onClick={()=>setForm({})}><Icon name="plus" size={18}/> เพิ่มสินค้า</button>
        </div>

        <div className="row gap-12 wrap" style={{marginBottom:16}}>
          <div className="tb-search" style={{flex:1, minWidth:200, background:'var(--surface)'}}>
            <Icon name="search" size={18}/><input placeholder="ค้นหาชื่อ / รหัส / สี…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <select className="field" style={{width:'auto'}} value={cat} onChange={e=>setCat(e.target.value)}>
            <option>ทั้งหมด</option>{CATS.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="card" style={{overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr>
              <th>สินค้า</th><th className="hide-mobile">รหัส</th><th className="hide-mobile">หมวด</th>
              <th className="c">ไซส์</th><th className="hide-mobile">สี</th><th className="r">ราคา/หน่วย</th><th className="r hide-mobile">สต๊อก</th><th className="r">จัดการ</th>
            </tr></thead>
            <tbody>
              {rows.map(p=>(
                <tr key={p.id}>
                  <td><div className="row gap-12"><ProductThumb product={p} size={40}/><div><div style={{fontWeight:600,fontSize:13.5}}>{p.name}</div><div style={{fontSize:11.5,color:'var(--tx-3)'}} className="hide-mobile">{p.code} · {p.unit}</div></div></div></td>
                  <td className="hide-mobile"><span className="tag num">{p.code}</span></td>
                  <td className="hide-mobile"><span className="tag">{p.category}</span></td>
                  <td className="c"><span className="tag">{p.size}</span></td>
                  <td className="hide-mobile">{p.color}</td>
                  <td className="r num" style={{fontWeight:700,fontSize:14}}>{fmt.baht(p.price)}</td>
                  <td className="r hide-mobile"><StockBadge stock={p.stock}/></td>
                  <td className="r"><div className="row gap-8" style={{justifyContent:'flex-end'}}>
                    <button className="tb-icon-btn" style={{width:34,height:34}} onClick={()=>setForm(p)}><Icon name="edit" size={16}/></button>
                    <button className="tb-icon-btn" style={{width:34,height:34,color:'var(--red)'}} onClick={()=>setDel(p)}><Icon name="trash" size={16}/></button>
                  </div></td>
                </tr>
              ))}
              {rows.length===0 && <tr><td colSpan="8"><div className="empty"><Icon name="box" size={42}/><div>ไม่พบสินค้า</div></div></td></tr>}
            </tbody>
          </table>
          </div>
        </div>

        {form && <ProductForm initial={form.id?form:null} onClose={()=>setForm(null)}/>}
        {del && <Confirm danger title="ลบสินค้า" confirmText="ลบสินค้า"
          message={`ต้องการลบ "${del.name}" (${del.code}) ออกจากฐานข้อมูลใช่หรือไม่? การลบจะลบข้อมูลราคาด้วย`}
          onConfirm={()=>{DB.deleteProduct(del.id); window.jpToast('ลบสินค้าเรียบร้อย','trash');}} onClose={()=>setDel(null)}/>}
        {io && <ImportExport mode={io} target="สินค้า" onClose={()=>setIo(null)}/>}
      </div>
    );
  }

  window.Products = Products;
})();
