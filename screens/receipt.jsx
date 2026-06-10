/* ============================================================
   JP168 POS — Printable receipt document
   ============================================================ */
(function () {
  const Icon = window.Icon, fmt = window.JPFMT, SHOP = window.JPSHOP;
  const { Modal } = window;

  function ReceiptDoc({ receipt, variant='classic' }) {
    const r = receipt;
    const change = (r.cash||0) - r.total;
    const accent = variant==='bold' ? 'var(--ink)' : 'var(--gold-deep)';

    return (
      <div className={'receipt-doc rd-'+variant}>
        {/* Header */}
        <div className="rd-head">
          <img src="assets/jp-logo-cropped.png" className="rd-logo" alt="JP168"/>
          <div className="rd-shop">
            <div className="rd-name">{SHOP.name}</div>
            <div className="rd-brand">{SHOP.brand}</div>
            <div className="rd-meta">โทร. {SHOP.tel}</div>
            <div className="rd-meta">ทะเบียนพาณิชย์ {SHOP.reg}</div>
          </div>
        </div>

        <div className="rd-title">ใบเสร็จรับเงิน / บิลเงินสด</div>

        <div className="rd-info">
          <div><span>เลขที่บิล</span><b className="num">{r.no}</b></div>
          <div><span>วันที่</span><b>{fmt.dateLong(r.date)}</b></div>
          <div><span>เวลา</span><b className="num">{fmt.time(r.date)} น.</b></div>
          <div><span>ลูกค้า</span><b>{r.customer||'ลูกค้าทั่วไป'}</b></div>
        </div>

        <table className="rd-tbl">
          <thead>
            <tr><th style={{width:'8%'}}>#</th><th>รายการ</th><th className="r" style={{width:'12%'}}>จำนวน</th><th className="r" style={{width:'20%'}}>ราคา</th><th className="r" style={{width:'22%'}}>รวม</th></tr>
          </thead>
          <tbody>
            {r.items.map((it,i)=>(
              <tr key={i}>
                <td className="num">{i+1}</td>
                <td><div className="rd-iname">{it.name}</div><div className="rd-icode">{it.code} · ไซส์ {it.size}</div></td>
                <td className="r num">{it.qty}</td>
                <td className="r num">{fmt.baht2(it.price)}</td>
                <td className="r num">{fmt.baht2(it.qty*it.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rd-sum">
          <div className="rd-sum-row"><span>ยอดรวม ({r.items.reduce((s,i)=>s+i.qty,0)} ชิ้น)</span><b className="num">{fmt.baht2(r.subtotal)}</b></div>
          {r.discount>0 && <div className="rd-sum-row"><span>ส่วนลด</span><b className="num" style={{color:'var(--red)'}}>−{fmt.baht2(r.discount)}</b></div>}
          <div className="rd-sum-row rd-total" style={{ borderColor:accent }}>
            <span>ยอดสุทธิ</span><b className="num" style={{ color:accent }}>฿{fmt.baht2(r.total)}</b>
          </div>
          <div className="rd-pay">
            <div className="rd-sum-row"><span>ชำระโดย</span><b>{r.payment}</b></div>
            {r.payment==='เงินสด' && <>
              <div className="rd-sum-row"><span>รับเงิน</span><b className="num">{fmt.baht2(r.cash)}</b></div>
              <div className="rd-sum-row"><span>เงินทอน</span><b className="num">{fmt.baht2(Math.max(0,change))}</b></div>
            </>}
          </div>
        </div>

        <div className="rd-foot">
          <div className="rd-thanks">ขอบคุณที่อุดหนุน JP168 · แล้วพบกันใหม่</div>
          <div className="rd-barcode"><Icon name="barcode" size={26} strokeWidth={2.4}/><span className="num">{r.no}</span></div>
        </div>
      </div>
    );
  }

  function printReceipt() {
    document.body.classList.add('printing');
    const after = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', after); };
    window.addEventListener('afterprint', after);
    setTimeout(()=>window.print(), 60);
  }

  function ReceiptModal({ receipt, onClose, variant, success }) {
    if (!receipt) return null;
    return (
      <Modal onClose={onClose} width={460}
        footer={<>
          <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
          <button className="btn btn-ghost" onClick={()=>window.jpToast('บันทึก PDF เรียบร้อย','pdf')}><Icon name="pdf" size={17}/> PDF</button>
          <button className="btn btn-gold" onClick={printReceipt}><Icon name="print" size={17}/> พิมพ์บิล</button>
        </>}>
        {success && (
          <div className="checkout-success">
            <div className="cs-ring"><Icon name="check" size={30} strokeWidth={3}/></div>
            <div className="cs-title">บันทึกการขายสำเร็จ</div>
            <div className="cs-sub">บิล {receipt.no} · {fmt.baht(receipt.total)}</div>
          </div>
        )}
        <div id="print-area">
          <ReceiptDoc receipt={receipt} variant={variant}/>
        </div>
      </Modal>
    );
  }

  Object.assign(window, { ReceiptDoc, ReceiptModal, printReceipt });
})();
