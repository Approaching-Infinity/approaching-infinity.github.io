import {
  months,validYear,parseDate,dateLabel,inMonth,calendar,amount,active,summary,printModel} from '../lib/bill-planner.mjs';
const root=document.getElementById('bill-planner');
if(root){
  const $=id=>document.getElementById('bp-'+id),money=c=>new Intl.NumberFormat('en-US',{
    style:'currency',currency:'USD'
  }
  ).format(c/100);
  const now=new Date();
  let year=now.getFullYear(),month=now.getMonth(),example=false,exampleEdited=false,preview=false,trigger=null,scroll=0;
  const editedBills = new Set();
  $('year').value=year;
  $('month').value=month;
  function el(tag,cls,text){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=text;
    return n;
  }
  function read() {
    const bills = [0, 1, 2].map(index => {
      const bill = {index};
      for (const key of ['label', 'amount', 'due', 'planned', 'certainty', 'method', 'notes']) {
        bill[key] = $(key + '-' + index).value.trim();
      }
      return bill;
    });
    return {
      year: Number($('year').value),
      month: Number($('month').value),
      example,
      exampleEdited,
      bills,
      followup: $('followup').value.trim(),
      source: $('source').value.trim(),
      when: $('when').value,
    };
  }
  function usable(){
    const d=read();
    if(validYear(d.year)){
      year=d.year;
      month=d.month;
    }
    else{
      d.year=year;
      d.month=month;
    }
    return d;
  }
  const method=b=>({
    manual:'Manual',automatic:'Automatic withdrawal',check:'Method to check'
  }
  [b.method]||'Method to check');
  function certainty(bill) {
    if (bill.certainty === 'estimate') return 'Estimate';
    if (bill.certainty !== 'confirmed') return 'To check';
    if (!example) return 'Checked by you';
    return editedBills.has(bill.index)
      ? 'Marked checked — verify example details'
      : 'Checked (fictional example)';
  }
  function warnings(b){
    const w=[];
    if(b.amount!==''&&amount(b.amount)===null)w.push('Check amount: use a non-negative number, up to two decimal places (maximum 999,999,999).');
    if(parseDate(b.due)&&parseDate(b.planned)&&b.planned>b.due)w.push('Planned date is after the due date. Verify dates and payment timing.');
    if(active(b)&&b.certainty==='confirmed'&&(!b.label||!parseDate(b.due)||!parseDate(b.planned)||b.method==='check'))w.push('Marked checked, but some details still need checking.');
    return w;
  }
  function list(container,d){
    container.replaceChildren();
    const entries=summary(d.bills).entries;
    if(!entries.length){
      container.append(el('p','bp-empty','Add your first bill above. Unknown details can stay blank.'));
      return;
    }
    entries.sort((a,b)=>(parseDate(a.planned)?a.planned:'9999-99-99').localeCompare(parseDate(b.planned)?b.planned:'9999-99-99')).forEach(b=>{
      const card=el('article','bp-result-bill');
      card.append(el('h3','',b.label||'Bill · label to check'),el('p','bp-badge',certainty(b)));
      card.append(el('p','',`Due by: ${dateLabel(b.due)}`),el('p','',`Pay / withdrawal on: ${dateLabel(b.planned)}`),el('p','',`${amount(b.amount)===null?(b.amount===''?'Amount not entered':'Amount to check'):money(amount(b.amount))} · ${method(b)}`));
      if(b.notes)card.append(el('p','',b.notes));
      warnings(b).forEach(w=>card.append(el('p','bp-warning',w)));
      if(parseDate(b.planned)&&!inMonth(b.planned,d.year,d.month))card.append(el('p','bp-help','Planned date is outside this calendar month; kept in this list.'));
      container.append(card);
    }
    );
  }
  function grid(container,d,blank=false){
    container.replaceChildren();
    container.append(el('p','bp-help','Planned payment / withdrawal dates only. Due dates stay in the list.'));
    const days=el('div','bp-calendar-grid');
    days.setAttribute('role','list');
    days.setAttribute('aria-label',`${months[d.month]} ${d.year} planned payments`);
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(day=>days.append(el('div','bp-day-heading',day)));
    calendar(d.year,d.month).forEach(day=>{
      const cell=el('div',day?'bp-day':'bp-day bp-outside');
      if(day){
        cell.setAttribute('role','listitem');
        cell.setAttribute('aria-label',`${months[d.month]} ${day}`);
        cell.append(el('strong','',String(day)));
        if(!blank)d.bills.filter(b=>active(b)&&inMonth(b.planned,d.year,d.month)&&parseDate(b.planned).day===day).forEach(b=>cell.append(el('span','',`${b.label||'Bill'} · ${method(b)} · ${certainty(b)}`)));
      }
      days.append(cell);
    }
    );
    container.append(days);
    if(!blank&&d.bills.some(b=>parseDate(b.planned)&&!inMonth(b.planned,d.year,d.month)))container.append(el('p','bp-help','Dates outside this month remain in the list.'));
  }
  function next(container,d){
    container.replaceChildren();
    container.append(el('h3','','One thing to check'),el('p','',d.followup||'Choose one thing to check.'));
    if(d.source)container.append(el('p','','Where: '+d.source));
    if(d.when)container.append(el('p','','By: '+dateLabel(d.when)));
  }
  function totalText(d){
    const s=summary(d.bills);
    return `Listed total: ${money(s.total)} · ${s.amountCount} of ${s.entries.length} started bills have valid amounts · ${s.estimates} estimate(s) · ${s.unchecked} unchecked entry/entries.`;
  }
  function update(){
    const raw=read(),valid=validYear(raw.year),d=usable();
    $('year-error').hidden=valid;
    $('year').setAttribute('aria-invalid',String(!valid));
    $('result-title').textContent=months[d.month]+' '+d.year;
    $('total').textContent=totalText(d);
    $('example-notice').hidden=!example;
    $('example-notice').textContent = exampleEdited
      ? 'Example with your edits — verify all details. Untouched fields may still contain invented values.'
      : 'Fictional example — all names, amounts and dates are invented.';
    d.bills.forEach((b,i)=>{
      $('certainty-'+i).querySelector('option[value="confirmed"]').textContent = example
        ? (editedBills.has(i) ? 'Marked checked — verify' : 'Checked (example)')
        : 'Checked by me';
      $('warning-'+i).textContent=warnings(b).join(' ');
      $('amount-'+i).setAttribute('aria-invalid',String(b.amount!==''&&amount(b.amount)===null));
    }
    );
    list($('list'),d);
    grid($('calendar'),d);
    next($('next-result'),d);
  }
  function onEdit(event) {
    if (example) {
      exampleEdited = true;
      const index = Number(event.target.id.split('-').at(-1));
      if (Number.isInteger(index)) editedBills.add(index);
      $('status').textContent = 'Example with your edits. Verify all details before using this page.';
    }
    update();
  }
  $('form').addEventListener('submit',e=>e.preventDefault());
  $('form').addEventListener('input',onEdit);
  $('form').addEventListener('change',onEdit);
  function view(v){
    $('list').hidden=v!=='list';
    $('calendar').hidden=v!=='calendar';
    $('list-view').setAttribute('aria-pressed',String(v==='list'));
    $('calendar-view').setAttribute('aria-pressed',String(v==='calendar'));
  }
  $('list-view').addEventListener('click',()=>view('list'));
  $('calendar-view').addEventListener('click',()=>view('calendar'));
  function loadExample(){
    const rows=[['Phone','50','2026-11-12','2026-11-09','confirmed','manual','Timing assumed checked'],['Electricity','85','2026-11-20','2026-11-17','estimate','manual','Check the statement'],['Internet','60','2026-11-25','2026-11-23','confirmed','automatic','Withdrawal assumed checked']];
    rows.forEach((r,i)=>['label','amount','due','planned','certainty','method','notes'].forEach((k,j)=>$(k+'-'+i).value=r[j]));
    $('year').value=2026;
    $('month').value=10;
    $('followup').value='Check the electricity statement';
    $('source').value='Biller’s statement';
    $('when').value='2026-11-16';
    example=true;
    exampleEdited=false;
    editedBills.clear();
    $('replace').hidden=true;
    update();
    $('status').textContent='Fictional November 2026 example loaded. Listed total: $195, including one estimate.';
    $('example').focus();
  }
  $('example').addEventListener('click',()=>{
    const d=read();
    if(d.bills.some(active)||d.followup||d.source||d.when){
      $('replace').hidden=false;
      $('cancel-example').focus();
    }
    else loadExample();
  }
  );
  $('confirm-example').addEventListener('click',loadExample);
  $('cancel-example').addEventListener('click',()=>{
    $('replace').hidden=true;
    $('example').focus();
  }
  );
  $('reset').addEventListener('click',()=>{
    $('clear-confirm').hidden=false;
    $('cancel-reset').focus();
  }
  );
  $('cancel-reset').addEventListener('click',()=>{
    $('clear-confirm').hidden=true;
    $('reset').focus();
  }
  );
  $('confirm-reset').addEventListener('click',()=>{
    $('clear-confirm').hidden=true;
    $('form').reset();
    $('year').value=now.getFullYear();
    $('month').value=now.getMonth();
    example=false;
    exampleEdited=false;
    editedBills.clear();
    $('replace').hidden=true;
    view('list');
    update();
    $('status').textContent='Entries cleared. Your blank worksheet is ready.';
    $('reset').focus();
  }
  );
  function buildPrint(blank){
    const d=printModel(usable(),blank),sheet=$('print-sheet');
    sheet.replaceChildren();
    sheet.append(el('p','bp-print-brand','Approaching Infinity · Free bill calendar'),el('h1','',months[d.month]+' '+d.year),el('p','',blank?'Blank worksheet':d.example?(d.exampleEdited?'Example with your edits — verify all details; untouched values may be invented':'Fictional example — all details invented'):'My three-bill worksheet'),el('p','','Due by = biller’s deadline. Pay / withdrawal on = when you send money or expect an automatic withdrawal. Verify processing time; this page does not make payments.'));
    if(blank){
      const table=el('table','bp-print-table');
      const header=el('tr');
      ['Bill','Amount (USD)','Due by','Pay / withdrawal on','Notes / estimate / method'].forEach(t=>header.append(el('th','',t)));
      table.append(header);
      for(let i=0;
      i<3;
      i++){
        const r=el('tr');
        for(let j=0;
        j<5;
        j++)r.append(el('td','','________________'));
        table.append(r);
      }
      sheet.append(table,el('p','','Listed total: ______________ Includes estimates? ______________'));
    }
    else{
      const entries=el('div','bp-print-list');
      list(entries,d);
      sheet.append(entries,el('p','',totalText(d)));
    }
    sheet.append(el('p','','Partial bill list only. Not a full budget, affordability check or money available to spend. Estimates and unchecked amounts are included if valid; missing/invalid amounts are excluded.'));
    const cal=el('div','bp-print-calendar');
    grid(cal,d,blank);
    sheet.append(cal);
    if(blank)sheet.append(el('h2','','One thing to check'),el('p','','I will check: _________________________________________________'),el('p','','Where / with whom: _______________________ By: ______________'));
    else{
      const n=el('div','bp-print-next');
      next(n,d);
      sheet.append(n);
    }
    sheet.append(el('p','bp-print-footer','Keep your copy private. General education only. Independently prepared; not CFPB-approved or endorsed.'));
  }
  function openPreview(blank,t){
    trigger=t;
    scroll=window.scrollY;
    buildPrint(blank);
    preview=true;
    root.classList.add('bp-preview');
    root.querySelector('.bp-preview-controls').hidden=false;
    $('preview-title').textContent=blank?'Blank worksheet preview':'My worksheet preview';
    $('back').focus();
    window.scrollTo(0,0);
  }
  $('print-completed').addEventListener('click',e=>openPreview(false,e.currentTarget));
  $('print-blank').addEventListener('click',e=>openPreview(true,e.currentTarget));
  $('blank-shortcut').addEventListener('click',e=>openPreview(true,e.currentTarget));
  $('back').addEventListener('click',()=>{
    preview=false;
    root.classList.remove('bp-preview');
    root.querySelector('.bp-preview-controls').hidden=true;
    $('print-sheet').replaceChildren();
    window.scrollTo(0,scroll);
    trigger?.focus({
      preventScroll:true
    }
    );
  }
  );
  $('open-print').addEventListener('click',()=>window.print());
  window.addEventListener('beforeprint',()=>{
    if(!preview)buildPrint(false);
  }
  );
  window.addEventListener('afterprint',()=>{
    if(!preview)$('print-sheet').replaceChildren();
  }
  );
  update();
  // Resource-card shortcuts act immediately on a newly opened worksheet.
  // Existing in-page edits still use the same confirmation/preview handlers.
  if (window.location.hash === '#example') $('example').click();
  if (window.location.hash === '#print') openPreview(true, $('print-blank'));
}
