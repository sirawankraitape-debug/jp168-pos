/* ============================================================
   JP168 POS — Receipt history (ประวัติบิล/ใบเสร็จ)
   ============================================================ */
(function () {
  const { useState, useMemo, useEffect } = React;
  const Icon = window.Icon, fmt = window.JPFMT;
  const { ReceiptModal, Confirm, ImportExport, Seg } = window;

  function Receipts({ openId, clearOpen, receiptVariant }) {
    const DB = window.JPDB;
    const receipts = DB.getReceipts();
    const [q, setQ] = useState('');
    const [pay, setPay] = useState('ทั้งหมด');
    const [range, setRange] = useState('all');
    const [view, setView] = useState(null);
    const [del, setDel] = useState(null);
    const [io, setIo] = useState(null);

    useEffect(()=>{ if(openId){ const r=receipts.find(x=>x.id===openId); if(r) setView(r); clearOpen&&clearOpen(); } }, [openId]);

    const rows = useMemo(()=>{
      const now=Date.now();
      const cut = range==='today'?new Date().setHours(0,0,0,0) : range==='7d'?now-7*864e5 : range==='30d'?now-30*864e5 : 0;
      return receipts.filter(r=>{
        const okQ=!q||(r.no+r.customer).toLowerCase().includes(q.toLowerCase());
        const okPay=pay==='ทั้งหมด'||r.payment===pay;
        const okR=new Date(r.date).getTime()>=cut;
        return okQ&&okPay&&okR;
      });
    }, [receipts,q,pay,range]);

    const sum = rows.reduce((s,r)=>s+r.total,0);
    const units = rows.reduce((s,r)=>s+r.items.reduce((a,i)=>a+i.qty,0),0);

    return (
      <div className="content-narrow">
        <div className="sec-head">
          <div className="row gap-12">
            <div style={{width:42,height:42,borderRadius:12,background:'var(--ink)',color:'var(--gold)',display:'grid',placeItems:'center'}}><Icon name="receipt" size={20}/></div>
            <div><h2>ประวัติบิล / ใบเสร็จ</h2><div className="sub">{receipts.length} บิลทั้งหมด</div></div>
          </div>
          <div className="sec-spacer"></div>
          <button className="btn btn-ghost hide-mobile" onClick={()=>setIo('export')}><Icon name="download" size={17}/> ส่งออกรายงาน</button>
        </div>

        <div className="grid g-3" style={{marginBottom:16}}>
          <div className="card card-pad"><div className="stat-label">ยอดขายรวม (ที่กรอง)</div><div className="stat-val num" style={{fontSize:24}}>{fmt.baht(sum)}</div></div>
          <div className="card card-pad"><div className="stat-label">จำนวนบิล</div><div className="stat-val num" style={{fontSize:24}}>{rows.length}</div></div>
          <div className="card card-pad"><div className="stat-label">จำนวนชิ้น</div><div className="stat-val num" style={{fontSize:24}}>{fmt.num(units)}</div></div>
        </div>

        <div className="row gap-12 wrap spread" style={{marginBottom:16}}>
          <div className="row gap-10 wrap">
            <Seg value={range} size="sm" onChange={setRange} options={[{value:'all',label:'ทั้งหมด'},{value:'today',label:'วันนี้'},{value:'7d',label:'7 วัน'},{value:'30d',label:'30 วัน'}]}/>
            <select className="field" style={{width:'auto', padding:'8px 12px'}} value={pay} onChange={e=>setPay(e.target.value)}>
              <option>ทั้งหมด</option><option>เงินสด</option><option>โอน</option><option>บัตร</option>
            </select>
          </div>
          <div className="tb-search" style={{background:'var(--surface)', minWidth:200}}>
            <Icon name="search" size={18}/><input placeholder="ค้นหาเลขบิล / ลูกค้า…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
        </div>

        <div className="card" style={{overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr>
              <th>เลขบิล</th><th className="hide-mobile">วันที่ / เวลา</th><th>ลูกค้า</th>
              <th className="c hide-mobile">รายการ</th><th className="c">ชำระ</th><th className="r">ยอดสุทธิ</th><th className="r">จัดการ</th>
            </tr></thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} className="pointer" onClick={()=>setView(r)}>
                  <td><div className="row gap-10"><div style={{width:32,height:32,borderRadius:8,background:'var(--gold-wash)',color:'var(--gold-deep)',display:'grid',placeItems:'center'}}><Icon name="receipt" size={16}/></div><b className="num" style={{fontSize:13.5}}>{r.no}</b></div></td>
                  <td className="hide-mobile"><div style={{fontSize:13.5}}>{fmt.date(r.date)}</div><div style={{fontSize:11.5,color:'var(--tx-3)'}} className="num">{fmt.time(r.date)} น.</div></td>
                  <td>{r.customer}</td>
                  <td className="c hide-mobile"><span className="tag num">{r.items.length}</span></td>
                  <td className="c"><span className={'chip '+(r.payment==='เงินสด'?'chip-green':r.payment==='โอน'?'chip-blue':'chip-gold')}>{r.payment}</span></td>
                  <td className="r num" style={{fontWeight:700,fontSize:14}}>{fmt.baht(r.total)}</td>
                  <td className="r"><div className="row gap-8" style={{justifyContent:'flex-end'}} onClick={e=>e.stopPropagation()}>
                    <button className="tb-icon-btn" style={{width:34,height:34}} onClick={()=>setView(r)}><Icon name="eye" size={16}/></button>
                    <button className="tb-icon-btn hide-mobile" style={{width:34,height:34,color:'var(--red)'}} onClick={()=>setDel(r)}><Icon name="trash" size={16}/></button>
                  </div></td>
                </tr>
              ))}
              {rows.length===0 && <tr><td colSpan="7"><div className="empty"><Icon name="receipt" size={42}/><div>ไม่พบบิลตามเงื่อนไข</div></div></td></tr>}
            </tbody>
          </table>
          </div>
        </div>

        {view && <ReceiptModal receipt={view} variant={receiptVariant} onClose={()=>setView(null)}/>}
        {del && <Confirm danger title="ลบบิล" confirmText="ลบบิล" message={`ต้องการลบบิล ${del.no} ใช่หรือไม่?`}
          onConfirm={()=>{DB.deleteReceipt(del.id); window.jpToast('ลบบิลเรียบร้อย','trash');}} onClose={()=>setDel(null)}/>}
        {io && <ImportExport mode={io} target="รายงานยอดขาย" onClose={()=>setIo(null)}/>}
      </div>
    );
  }

  window.Receipts = Receipts;
})();
