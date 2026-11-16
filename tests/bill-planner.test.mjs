import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDate, amount, calendar, summary, printModel, active
}
from '../src/lib/bill-planner.mjs';
test('dates preserve leap years and six-row months',()=>{
  assert.equal(parseDate('2100-02-29'),null);
  assert.ok(parseDate('2028-02-29'));
  assert.equal(calendar(2026,7).length,42);
}
);
test('money remains integer cents and excludes unknown/invalid input',()=>{
  assert.equal(amount('0'),0);
  assert.equal(amount('1.01'),101);
  for(const v of ['', '-1','1e3','2.345','NaN'])assert.equal(amount(v),null);
  const s=summary([{
    label:'Phone',amount:'50',certainty:'confirmed'
  }
  ,{
    label:'Electric',amount:'85',certainty:'estimate'
  }
  ,{
    label:'Internet',amount:'60',certainty:'confirmed'
  }
  ]);
  assert.equal(s.total,19500);
  assert.equal(s.estimates,1);
}
);
test('blank print model cannot reveal entries or next action; cross-month dates survive completed print',()=>{
  const data={
    year:2026,month:10,bills:[{
      label:'Private',planned:'2026-12-01',amount:'50'
    }
    ],followup:'Private task',source:'Private source',when:'2026-12-02',example:true
  }
  ;
  const blank=printModel(data,true);
  assert.equal(blank.year,2026);
  assert.equal(blank.month,10);
  assert.equal(JSON.stringify(blank).includes('Private'),false);
  assert.equal(blank.example,false);
  assert.equal(printModel(data,false).bills[0].planned,'2026-12-01');
}
);
test("select-only entries remain visible",()=>{
  assert.ok(active({
    method:"automatic"
  }
  ));
  assert.ok(active({
    method:"manual"
  }
  ));
  assert.ok(active({
    certainty:"estimate"
  }
  ));
  assert.ok(active({
    certainty:"confirmed"
  }
  ));
  assert.equal(active({
    method:"check",certainty:"check"
  }
  ),false);
}
);
