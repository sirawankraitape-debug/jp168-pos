/* ============================================================
   JP168 POS — Dashboard (สรุปยอดขาย)
   ============================================================ */
(function () {
  const { useMemo } = React;
  const Icon = window.Icon, fmt = window.JPFMT;
  const { Stat, ProductThumb } = window;

  function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }

  function Dashboard({ go }) {
    const DB = window.JPDB;
    const receipts = DB.getReceipts();
    const catalog = DB.getCatalog();

    const metrics = useMemo(() => {
      const now = new Date();
      const today0 = startOfDay(now).getTime();
      const month0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      let today=0, todayBills=0, month=0, monthBills=0, totalUnits=0;
      const prodCount = {};
      receipts.forEach(r => {
        const t = new Date(r.date).getTime();
        if (t>=today0){ today+=r.total; todayBills++; }
        if (t>=month0){ month+=r.total; monthBills++; }
        r.items.forEach(it => { prodCount[it.productId]=(prodCount[it.productId]||0)+it.qty; totalUnits+=it.qty; });
      });
      // 7-day series
      const days=[];
      for (let i=6;i>=0;i--){
        const d=startOfDay(new Date(now.getTime()-i*86400000));
        const next=d.getTime()+86400000;
        const sum=receipts.filter(r=>{const t=new Date(r.date).getTime();return t>=d.getTime()&&t<next;}).reduce((s,r)=>s+r.total,0);
        days.push({ label:['อา','จ','อ','พ','พฤ','ศ','ส'][d.getDay()], date:d, sum });
      }
      const top = Object.entries(prodCount).map(([id,qty])=>({ ...catalog.find(c=>c.id===id), qty }))
        .filter(x=>x.id).sort((a,b)=>b.qty-a.qty).slice(0,5);
      const avg = monthBills? month/monthBills : 0;
      return { today, todayBills, month, monthBills, days, top, avg, totalUnits };
    }, [receipts, catalog]);

    const maxDay = Math.max(...metrics.days.map(d=>d.sum), 1);
    const lowStock = catalog.filter(c=>c.stock<25).sort((a,b)=>a.stock-b.stock).slice(0,5);

    return (
      <div className="content-narrow">
        {/* Stat row */}
        <div className="grid g-4" style={{ marginBottom:16 }}>
          <Stat icon="money" label="ยอดขายวันนี้" value={fmt.baht(metrics.today)} delta={`${metrics.todayBills} บิล`} deltaDir="up"/>
          <Stat icon="receipt" iconBg="var(--blue-bg)" iconFg="var(--blue)" label="ยอดขายเดือนนี้" value={fmt.baht(metrics.month)} delta={`${metrics.monthBills} บิล`} deltaDir="up"/>
          <Stat icon="wallet" iconBg="var(--green-bg)" iconFg="var(--green)" label="เฉลี่ยต่อบิล" value={fmt.baht(Math.round(metrics.avg))}/>
          <Stat icon="box" iconBg="#EDEAF6" iconFg="#6A55A8" label="ชิ้นที่ขายได้" value={fmt.num(metrics.totalUnits)} unit="ชิ้น"/>
        </div>

        <div className="grid" style={{ gridTemplateColumns:'1.6fr 1fr', alignItems:'stretch' }}>
          {/* Chart */}
          <div className="card card-pad">
            <div className="sec-head" style={{ marginBottom:8 }}>
              <h2>ยอดขาย 7 วันล่าสุด</h2>
              <div className="sec-spacer"></div>
              <span className="chip chip-gold"><Icon name="trendUp" size={14}/> รวม {fmt.baht(metrics.days.reduce((s,d)=>s+d.sum,0))}</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:'min(3.5%,18px)', height:200, padding:'18px 4px 0' }}>
              {metrics.days.map((d,i) => {
                const h = Math.max(6, (d.sum/maxDay)*160);
                const isToday = i===metrics.days.length-1;
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                    <div className="num" style={{ fontSize:11, fontWeight:700, color: d.sum?'var(--tx-2)':'var(--tx-3)' }}>{d.sum?fmt.num(d.sum):''}</div>
                    <div style={{ width:'100%', maxWidth:42, height:h, borderRadius:'8px 8px 4px 4px',
                      background: isToday?'linear-gradient(180deg,var(--gold),var(--gold-deep))':'linear-gradient(180deg,#EAE3D2,#D8CFBA)',
                      boxShadow: isToday?'var(--sh-gold)':'none', transition:'height .5s cubic-bezier(.2,.8,.2,1)' }}></div>
                    <div style={{ fontSize:12, fontWeight:600, color: isToday?'var(--gold-deep)':'var(--tx-3)' }}>{d.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top products */}
          <div className="card card-pad">
            <div className="sec-head" style={{ marginBottom:14 }}>
              <h2>สินค้าขายดี</h2>
              <div className="sec-spacer"></div>
              <span className="tag">เดือนนี้</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {metrics.top.map((p,i) => (
                <div key={p.id} className="row gap-12">
                  <div style={{ width:22, fontWeight:800, color: i===0?'var(--gold-deep)':'var(--tx-3)', fontSize:15 }} className="num">{i+1}</div>
                  <ProductThumb product={p} size={40}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize:12, color:'var(--tx-3)' }}>{p.code} · {p.size}</div>
                  </div>
                  <div className="num" style={{ fontWeight:700, fontSize:14 }}>{p.qty} <span style={{ fontSize:11, color:'var(--tx-3)', fontWeight:500 }}>ชิ้น</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent + low stock */}
        <div className="grid g-2 collapse-1" style={{ marginTop:16 }}>
          <div className="card">
            <div className="sec-head card-pad" style={{ marginBottom:0, paddingBottom:0 }}>
              <h2>บิลล่าสุด</h2>
              <div className="sec-spacer"></div>
              <button className="btn btn-sm btn-soft" onClick={()=>go('receipts')}>ดูทั้งหมด <Icon name="chevR" size={14}/></button>
            </div>
            <div style={{ padding:'8px 8px 8px' }}>
              {receipts.slice(0,5).map(r => (
                <div key={r.id} className="row gap-12" style={{ padding:'10px 12px', borderRadius:10, cursor:'pointer' }}
                  onClick={()=>go('receipts', { open:r.id })}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'var(--ink)', color:'var(--gold)', display:'grid', placeItems:'center' }}><Icon name="receipt" size={18}/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{r.no} · <span style={{ color:'var(--tx-2)', fontWeight:500 }}>{r.customer}</span></div>
                    <div style={{ fontSize:12, color:'var(--tx-3)' }}>{fmt.dt(r.date)} · {r.items.length} รายการ</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div className="num" style={{ fontWeight:700, fontSize:14.5 }}>{fmt.baht(r.total)}</div>
                    <span className="tag" style={{ marginTop:2 }}>{r.payment}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="sec-head card-pad" style={{ marginBottom:0, paddingBottom:0 }}>
              <h2>สต๊อกใกล้หมด</h2>
              <div className="sec-spacer"></div>
              <button className="btn btn-sm btn-soft" onClick={()=>go('prices')}>จัดการสต๊อก <Icon name="chevR" size={14}/></button>
            </div>
            <div style={{ padding:'8px 8px 8px' }}>
              {lowStock.length===0 && <div className="empty">สต๊อกเพียงพอทุกรายการ</div>}
              {lowStock.map(p => (
                <div key={p.id} className="row gap-12" style={{ padding:'10px 12px' }}>
                  <ProductThumb product={p} size={40}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize:12, color:'var(--tx-3)' }}>{p.code} · {p.size}</div>
                  </div>
                  <div style={{ width:120 }}>
                    <div style={{ height:7, borderRadius:6, background:'var(--line)', overflow:'hidden' }}>
                      <div style={{ width:`${Math.min(100,(p.stock/60)*100)}%`, height:'100%',
                        background: p.stock<=0?'var(--red)':p.stock<25?'var(--gold)':'var(--green)' }}></div>
                    </div>
                    <div className="num" style={{ fontSize:11.5, color:'var(--tx-3)', marginTop:4, textAlign:'right' }}>{p.stock} {p.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.Dashboard = Dashboard;
})();
