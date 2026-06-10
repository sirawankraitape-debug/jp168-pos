/* ============================================================
   JP168 POS — Import / Export (Excel · PDF) — simulated flow
   ============================================================ */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Modal } = window;

  function ImportExport({ mode, target='ข้อมูล', onClose }) {
    const [stage, setStage] = useState(mode==='import' ? 'drop' : 'pick');
    const [fileName, setFileName] = useState('');
    const [fmt, setFmt] = useState('excel');
    const [busy, setBusy] = useState(false);

    function fakeFile(){
      setFileName('สินค้า_JP168_'+new Date().toLocaleDateString('th-TH').replaceAll('/','-')+'.xlsx');
      setStage('preview');
    }
    function doImport(){
      setBusy(true);
      setTimeout(()=>{ setBusy(false); window.jpToast('นำเข้าข้อมูล '+target+' สำเร็จ 24 รายการ','excel'); onClose(); }, 1100);
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
            <button className="btn btn-ghost" onClick={()=>setStage('drop')}>เลือกไฟล์ใหม่</button>
            <button className="btn btn-gold" onClick={doImport} disabled={busy}>{busy?'กำลังนำเข้า…':<><Icon name="check" size={17}/> ยืนยันนำเข้า 24 รายการ</>}</button>
          </> : <button className="btn btn-ghost" onClick={onClose}>ปิด</button> }>
          {stage==='drop' ? (
            <>
              <div className="io-drop" onClick={fakeFile}>
                <div className="io-drop-ico"><Icon name="excel" size={32}/></div>
                <div style={{fontWeight:700, fontSize:15}}>ลากไฟล์ Excel มาวาง หรือคลิกเพื่อเลือก</div>
                <div className="muted" style={{fontSize:13, marginTop:4}}>รองรับ .xlsx, .xls, .csv (สูงสุด 10MB)</div>
              </div>
              <div className="io-note">
                <Icon name="alert" size={16}/>
                <div>ไฟล์ต้องมีคอลัมน์: <b>รหัสสินค้า, ชื่อสินค้า, หมวดหมู่, ไซส์, สี, ราคา, สต๊อก</b> — <a className="io-link" onClick={()=>window.jpToast('ดาวน์โหลดเทมเพลตเรียบร้อย','excel')}>ดาวน์โหลดเทมเพลต</a></div>
              </div>
            </>
          ) : (
            <>
              <div className="io-file"><div className="io-file-ico"><Icon name="excel" size={22}/></div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13.5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{fileName}</div><div className="muted" style={{fontSize:12}}>พบ 24 แถว · 7 คอลัมน์</div></div><span className="chip chip-green"><Icon name="check" size={14}/> อ่านสำเร็จ</span></div>
              <div className="io-prev-label">ตัวอย่างข้อมูล (3 แถวแรก)</div>
              <div className="card" style={{overflow:'hidden', marginTop:8}}>
                <table className="tbl" style={{fontSize:12.5}}>
                  <thead><tr><th>รหัส</th><th>ชื่อ</th><th>ไซส์</th><th className="r">ราคา</th></tr></thead>
                  <tbody>
                    <tr><td className="num">TS-010</td><td>เสื้อยืดพิมพ์ลาย</td><td>M</td><td className="r num">฿199</td></tr>
                    <tr><td className="num">SP-210</td><td>เสื้อบาส Reversible</td><td>L</td><td className="r num">฿289</td></tr>
                    <tr><td className="num">AC-510</td><td>กระเป๋าสะพายกีฬา</td><td>Free</td><td className="r num">฿259</td></tr>
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
