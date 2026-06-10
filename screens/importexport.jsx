/* ============================================================
   JP168 POS — Import / Export (Excel · PDF)
   ============================================================ */
(function () {
  const { useState, useRef } = React;
  const Icon = window.Icon;
  const { Modal } = window;

  // ชื่อคอลัมน์ที่รับได้ (ภาษาไทย/อังกฤษ)
  const COL_ALIASES = {
    code:     ['รหัสสินค้า','รหัส','code','sku'],
    name:     ['ชื่อสินค้า','ชื่อ','name','สินค้า','product'],
    category: ['หมวดหมู่','category','ประเภท','หมวด'],
    size:     ['ไซส์','size','ขนาด'],
    color:    ['สี','color','colour'],
    price:    ['ราคา / หน่วย','ราคา/หน่วย','ราคาต่อหน่วย','ราคา','ราคาขาย','price'],
    cost:     ['ต้นทุน','ราคาทุน','cost'],
    stock:    ['สต๊อก','สต็อก','stock','จำนวน','qty'],
    unit:     ['หน่วยนับ','หน่วย','unit'],
  };

  function buildColIndex(headers) {
    const idx = {};
    headers.forEach((h, i) => {
      const norm = String(h||'').trim().toLowerCase();
      for (const [field, aliases] of Object.entries(COL_ALIASES)) {
        if (!(field in idx) && aliases.some(a => a.toLowerCase() === norm)) idx[field] = i;
      }
    });
    return idx;
  }

  function parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb = window.XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (rows.length < 2) return reject(new Error('ไฟล์ไม่มีข้อมูล'));
          const idx = buildColIndex(rows[0]);
          const missing = ['code','name'].filter(f => !(f in idx));
          if (missing.length) return reject(new Error('ไม่พบคอลัมน์: ' + missing.map(f=>COL_ALIASES[f][0]).join(', ')));
          const data = rows.slice(1)
            .filter(r => r.some(c => String(c).trim()))
            .map(r => ({
              id:       crypto.randomUUID(),
              code:     String(r[idx.code]||'').trim(),
              name:     String(r[idx.name]||'').trim(),
              category: String(idx.category!=null ? r[idx.category] : '').trim() || 'ทั่วไป',
              size:     String(idx.size!=null ? r[idx.size] : '').trim() || '-',
              color:    String(idx.color!=null ? r[idx.color] : '').trim() || '-',
              unit:     '-',
              price:    Number(idx.price!=null ? r[idx.price] : 0) || 0,
              cost:     Number(idx.cost!=null  ? r[idx.cost]  : 0) || 0,
              stock:    Number(idx.stock!=null ? r[idx.stock] : 0) || 0,
            }))
            .filter(r => r.code && r.name);
          resolve(data);
        } catch(err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
      reader.readAsArrayBuffer(file);
    });
  }

  function ImportExport({ mode, target='ข้อมูล', onClose }) {
    const [stage, setStage] = useState(mode==='import' ? 'drop' : 'pick');
    const [fileName, setFileName] = useState('');
    const [fmt, setFmt] = useState('excel');
    const [busy, setBusy] = useState(false);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef();

    async function handleFile(file) {
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['xlsx','xls','csv'].includes(ext)) { setError('รองรับเฉพาะ .xlsx, .xls, .csv'); return; }
      setError('');
      try {
        const data = await parseFile(file);
        if (!data.length) { setError('ไม่พบข้อมูลสินค้าในไฟล์'); return; }
        setRows(data); setFileName(file.name); setStage('preview');
      } catch(e) { setError(e.message || 'อ่านไฟล์ไม่ได้'); }
    }

    function onDrop(e) {
      e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]);
    }

    function doImport() {
      setBusy(true);
      try {
        const existing = window.JPDB.getProducts();
        rows.forEach(r => {
          const found = existing.find(p => p.code === r.code);
          window.JPDB.upsertProduct(found ? { ...r, id: found.id } : r);
        });
        window.jpToast('นำเข้าสินค้าสำเร็จ ' + rows.length + ' รายการ', 'excel');
        onClose();
      } catch(e) {
        window.jpToast('นำเข้าไม่สำเร็จ: ' + (e.message||''), 'alert');
        setBusy(false);
      }
    }

    function doExport(){
      setBusy(true);
      setTimeout(()=>{ setBusy(false); window.jpToast('ส่งออก'+target+'เป็น '+(fmt==='excel'?'Excel':'PDF')+' เรียบร้อย', fmt==='excel'?'excel':'pdf'); onClose(); }, 1100);
    }

    // ---- IMPORT ----
    if (mode==='import') {
      return (
        <Modal title={'นำเข้า'+target+'จาก Excel'} icon="upload" onClose={onClose} width={520}
          footer={ stage==='preview' ? <>
            <button className="btn btn-ghost" onClick={()=>{ setStage('drop'); setRows([]); setError(''); }}>เลือกไฟล์ใหม่</button>
            <button className="btn btn-gold" onClick={doImport} disabled={busy}>{busy?'กำลังนำเข้า…':<><Icon name="check" size={17}/> ยืนยันนำเข้า {rows.length} รายการ</>}</button>
          </> : <button className="btn btn-ghost" onClick={onClose}>ปิด</button> }>
          {stage==='drop' ? (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}}
                onChange={e=>handleFile(e.target.files[0])}/>
              <div className="io-drop"
                style={dragging?{borderColor:'var(--gold)',background:'var(--gold-wash)'}:{}}
                onClick={()=>fileRef.current.click()}
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={onDrop}>
                <div className="io-drop-ico"><Icon name="excel" size={32}/></div>
                <div style={{fontWeight:700, fontSize:15}}>ลากไฟล์ Excel มาวาง หรือคลิกเพื่อเลือก</div>
                <div className="muted" style={{fontSize:13, marginTop:4}}>รองรับ .xlsx, .xls, .csv (สูงสุด 10MB)</div>
              </div>
              {error && <div style={{color:'var(--red)',fontSize:13,marginTop:8,padding:'8px 12px',background:'var(--red-bg)',borderRadius:8}}>{error}</div>}
              <div className="io-note">
                <Icon name="alert" size={16}/>
                <div>ไฟล์ต้องมีคอลัมน์: <b>รหัสสินค้า, ชื่อสินค้า, หมวดหมู่, ไซส์, สี, ราคา, สต๊อก</b> — <a className="io-link" onClick={()=>window.jpToast('ดาวน์โหลดเทมเพลตเรียบร้อย','excel')}>ดาวน์โหลดเทมเพลต</a></div>
              </div>
            </>
          ) : (
            <>
              <div className="io-file"><div className="io-file-ico"><Icon name="excel" size={22}/></div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13.5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fileName}</div><div className="muted" style={{fontSize:12}}>พบ {rows.length} แถว</div></div><span className="chip chip-green"><Icon name="check" size={14}/> อ่านสำเร็จ</span></div>
              <div className="io-prev-label">ตัวอย่างข้อมูล (3 แถวแรก)</div>
              <div className="card" style={{overflow:'hidden', marginTop:8}}>
                <table className="tbl" style={{fontSize:12.5}}>
                  <thead><tr><th>รหัส</th><th>ชื่อ</th><th>ไซส์</th><th className="r">ราคา</th></tr></thead>
                  <tbody>
                    {rows.slice(0,3).map((r,i)=>(
                      <tr key={i}><td className="num">{r.code}</td><td>{r.name}</td><td>{r.size}</td><td className="r num">฿{r.price.toLocaleString('th-TH')}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Modal>
      );
    }

    // ---- EXPORT ----
    return (
      <Modal title={'ส่งออก'+target} icon="download" onClose={onClose} width={480}
        footer={<><button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-gold" onClick={doExport} disabled={busy}>{busy?'กำลังสร้างไฟล์…':<><Icon name="download" size={17}/> ดาวน์โหลด</>}</button></>}>
        <div className="field-label">เลือกรูปแบบไฟล์</div>
        <div className="grid g-2" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
          <button className={'io-fmt'+(fmt==='excel'?' active':'')} onClick={()=>setFmt('excel')}>
            <div className="io-fmt-ico" style={{background:'#E6F2EA',color:'#1D7A47'}}><Icon name="excel" size={26}/></div>
            <b>Excel (.xlsx)</b><span>แก้ไขต่อได้ · มีสูตรรวมยอด</span>
            {fmt==='excel'&&<span className="io-fmt-check"><Icon name="check" size={14}/></span>}
          </button>
          <button className={'io-fmt'+(fmt==='pdf'?' active':'')} onClick={()=>setFmt('pdf')}>
            <div className="io-fmt-ico" style={{background:'#FBEAE6',color:'#C0432F'}}><Icon name="pdf" size={26}/></div>
            <b>PDF</b><span>พร้อมพิมพ์ · มีโลโก้ร้าน</span>
            {fmt==='pdf'&&<span className="io-fmt-check"><Icon name="check" size={14}/></span>}
          </button>
        </div>
        <div className="io-opt">
          <label className="io-check"><input type="checkbox" defaultChecked/> รวมหัวกระดาษโลโก้ร้าน JP168</label>
          <label className="io-check"><input type="checkbox" defaultChecked/> รวมคอลัมน์ราคาและสต๊อก</label>
          <label className="io-check"><input type="checkbox"/> เฉพาะรายการที่กรองอยู่</label>
        </div>
      </Modal>
    );
  }

  window.ImportExport = ImportExport;
})();
