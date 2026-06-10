/* ============================================================
   JP168 POS — App shell, navigation, routing, tweaks
   ============================================================ */
(function () {
  const { useState, useEffect, useReducer } = React;
  const Icon = window.Icon, fmt = window.JPFMT, SHOP = window.JPSHOP;
  const { ToastHost } = window;
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle } = window;

  const NAV = [
    { id:'dashboard', label:'แดชบอร์ด', icon:'dashboard', sub:'ภาพรวมยอดขายร้าน' },
    { id:'pos',       label:'หน้าขาย',  icon:'pos',       sub:'บันทึกการขาย & ออกบิล' },
    { id:'products',  label:'รายการสินค้า', icon:'box',   sub:'ฐานข้อมูลสินค้า (DB1)' },
    { id:'prices',    label:'ราคาต่อหน่วย', icon:'tag',   sub:'ฐานข้อมูลราคา (DB2)' },
    { id:'receipts',  label:'ประวัติบิล', icon:'receipt', sub:'ใบเสร็จย้อนหลัง' },
  ];

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "gold",
    "density": "regular",
    "receiptStyle": "classic",
    "showBrandWatermark": true
  }/*EDITMODE-END*/;

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [page, setPage] = useState('dashboard');
    const [openReceipt, setOpenReceipt] = useState(null);
    const [, force] = useReducer(x=>x+1, 0);
    useEffect(()=>window.JPDB.subscribe(force), []);

    function go(p, opts){ setPage(p); if(opts&&opts.open) setOpenReceipt(opts.open); window.scrollTo&&window.scrollTo(0,0); }

    const cur = NAV.find(n=>n.id===page);
    const receiptCount = window.JPDB.getReceipts().length;

    let Screen = null;
    if (page==='dashboard') Screen = <window.Dashboard go={go}/>;
    else if (page==='pos') Screen = <window.POS receiptVariant={t.receiptStyle==='bold'?'bold':'classic'}/>;
    else if (page==='products') Screen = <window.Products/>;
    else if (page==='prices') Screen = <window.Prices/>;
    else if (page==='receipts') Screen = <window.Receipts openId={openReceipt} clearOpen={()=>setOpenReceipt(null)} receiptVariant={t.receiptStyle==='bold'?'bold':'classic'}/>;

    const today = new Date().toLocaleDateString('th-TH',{weekday:'long', day:'numeric', month:'long', year:'numeric'});

    return (
      <div className="app" data-theme={t.theme} data-density={t.density}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sb-brand">
            <img src="assets/jp-logo-cropped.png" className="sb-logo" alt="JP168"/>
            <div className="sb-brand-tx"><b>JP 75 T-SHIRT</b><span>POS · บันทึกยอดขาย</span></div>
          </div>
          <div className="sb-section">เมนูหลัก</div>
          {NAV.map(n=>(
            <button key={n.id} className={'nav-item'+(page===n.id?' active':'')} onClick={()=>go(n.id)}>
              <Icon name={n.icon} size={20}/>{n.label}
              {n.id==='receipts' && <span className="nav-badge num">{receiptCount}</span>}
            </button>
          ))}
          <div className="sb-foot">
            <button className="nav-item" onClick={()=>{ if(confirm('รีเซ็ตข้อมูลตัวอย่างทั้งหมด?')){ window.JPDB.resetAll(); window.jpToast('รีเซ็ตข้อมูลแล้ว','swap'); } }}>
              <Icon name="settings" size={20}/>รีเซ็ตข้อมูลตัวอย่าง
            </button>
            <div className="sb-user">
              <div className="sb-ava">JP</div>
              <div className="sb-user-tx"><b>เจ้าของร้าน</b><span>{SHOP.tel}</span></div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <header className="topbar">
            <div>
              <h1>{cur.label}</h1>
              <div className="sub">{cur.sub}</div>
            </div>
            <div className="tb-spacer"></div>
            <div className="tb-search hide-md" style={{minWidth:180}}>
              <Icon name="calendar" size={17}/>
              <span style={{fontSize:13.5, color:'var(--tx-2)', whiteSpace:'nowrap'}}>{today}</span>
            </div>
            {page!=='pos' && <button className="btn btn-gold hide-mobile" onClick={()=>go('pos')}><Icon name="plus" size={18}/> ขายด่วน</button>}
            <button className="tb-icon-btn"><Icon name="bell" size={19}/><span className="tb-dot"></span></button>
          </header>

          <main className="content">{Screen}</main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="botnav">
          <button className={'botnav-item'+(page==='dashboard'?' active':'')} onClick={()=>go('dashboard')}><Icon name="dashboard" size={22}/>หน้าหลัก</button>
          <button className={'botnav-item'+(page==='products'?' active':'')} onClick={()=>go('products')}><Icon name="box" size={22}/>สินค้า</button>
          <button className="botnav-item botnav-fab" onClick={()=>go('pos')}><span className="fab"><Icon name="pos" size={24}/></span>ขาย</button>
          <button className={'botnav-item'+(page==='prices'?' active':'')} onClick={()=>go('prices')}><Icon name="tag" size={22}/>ราคา</button>
          <button className={'botnav-item'+(page==='receipts'?' active':'')} onClick={()=>go('receipts')}><Icon name="receipt" size={22}/>บิล</button>
        </nav>

        <ToastHost/>

        {/* Tweaks */}
        <TweaksPanel title="Tweaks">
          <TweakSection label="ธีมสี" />
          <TweakRadio label="โทนสี" value={t.theme}
            options={[{value:'gold',label:'ทอง'},{value:'midnight',label:'ดำกรม'},{value:'mono',label:'ขาวดำ'}]}
            onChange={v=>setTweak('theme',v)}/>
          <TweakSection label="เลย์เอาต์" />
          <TweakRadio label="ความหนาแน่น" value={t.density}
            options={[{value:'compact',label:'แน่น'},{value:'regular',label:'ปกติ'},{value:'comfy',label:'โปร่ง'}]}
            onChange={v=>setTweak('density',v)}/>
          <TweakSection label="ใบเสร็จ" />
          <TweakRadio label="สไตล์บิล" value={t.receiptStyle}
            options={[{value:'classic',label:'คลาสสิก'},{value:'bold',label:'เข้ม'}]}
            onChange={v=>setTweak('receiptStyle',v)}/>
        </TweaksPanel>
      </div>
    );
  }

  window.JPApp = App;
})();
