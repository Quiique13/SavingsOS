import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {JSDOM} from 'jsdom';

test('monthly resets, isolated demo fixtures, entry routes, and currency formatting', async t => {
  const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom',logLevel:'error'});
  try {
    const {resetMonth}=await server.ssrLoadModule('/src/utils/resetMonth.ts');
    const {saveTransfer,isValidBackup,money,compactMoney}=await server.ssrLoadModule('/src/utils/finance.ts');
    const {createDemoData}=await server.ssrLoadModule('/src/utils/demoData.ts');
    const {appEntry}=await server.ssrLoadModule('/src/utils/appEntry.ts');
    const currency=await server.ssrLoadModule('/src/utils/currency.ts');
    const {studioMoney}=await server.ssrLoadModule('/src/utils/studio.ts');
    await t.test('reset reverses only selected transfers, clears occurrence marks and preserves exact income and expense data',()=>{
      let data={accounts:[{id:'a',name:'A',provider:'Test',kind:'Spending',balance:1000,color:'#123456'},{id:'b',name:'B',provider:'Test',kind:'Savings',balance:500,color:'#abcdef'}],expenses:[{id:'bill:rent',name:'Rent',amount:650,category:'Housing',due:'2026-09-01',accountId:'a',frequency:'monthly',notes:'Keep this definition'}],income:[{id:'salary',name:'Salary',date:'2026-10-28',accountId:'a',amount:2450}],payments:{'bill:rent:2026-10-01':'2026-11-01','bill:rent:2026-11-01':'2026-11-02','bill:rent:2026-12-01':'2026-11-03'},transfers:[]};
      data=saveTransfer(data,{id:'old',fromAccountId:'a',toAccountId:'b',amount:10.01,date:'2026-10-01',notes:''});
      const historical=structuredClone(data);
      data=saveTransfer(data,{id:'current-a',fromAccountId:'a',toAccountId:'b',amount:300.12,date:'2026-11-01',notes:''});
      data=saveTransfer(data,{id:'current-b',fromAccountId:'b',toAccountId:'a',amount:50.25,date:'2026-11-02',notes:''});
      const before=structuredClone(data), result=resetMonth(data,'2026-11');
      assert.deepEqual(result.accounts,historical.accounts);
      assert.deepEqual(result.transfers,historical.transfers);
      assert.deepEqual(result.income,before.income);assert.deepEqual(result.expenses,before.expenses);
      assert.deepEqual(result.payments,{'bill:rent:2026-10-01':'2026-11-01','bill:rent:2026-12-01':'2026-11-03'});
      assert.deepEqual(data,before);assert.ok(isValidBackup(result));
      assert.deepEqual(resetMonth(result,'2026-11'),result);
      assert.throws(()=>resetMonth(data,'2026-99'));
    });
    await t.test('demo is valid and self-contained on month/year boundaries and resets to a fresh fixture',()=>{
      for(const date of ['2026-11-17','2027-01-01','2028-02-29']) {
        const data=createDemoData(date);
        assert.ok(isValidBackup(data),date);
        assert.equal(data.accounts.length,4);assert.ok(data.expenses.length>=10);
        assert.ok(data.income.length>=12);assert.ok(data.transfers.length>=2);
        assert.ok(data.accounts.every(a=>a.provider.includes('(fictional)')&&a.balance>=0&&a.balance<10000));
        assert.ok(data.transfers.every(entry=>entry.date<=date));assert.ok(Object.values(data.payments).every(p=>p<=date));
        const original=createDemoData(date);data.accounts[0].balance=999999;
        assert.deepEqual(createDemoData(date),original);
      }
    });
    await t.test('demo and admin entry points work with browser paths, hash routes and hosted deep links',()=>{
      assert.deepEqual(appEntry('/demo/accounts','',false),{demo:true,basename:'/demo',redirect:undefined});
      assert.equal(appEntry('/admin','',false).demo,false);
      assert.equal(appEntry('/demolition','',false).demo,false);
      assert.equal(appEntry('/SavingsOS/','#/demo/accounts',true,'/SavingsOS/').demo,true);
      assert.equal(appEntry('/SavingsOS/demo','',true,'/SavingsOS/').redirect,'/SavingsOS/#/demo');
      assert.equal(appEntry('/SavingsOS/admin','',true,'/SavingsOS/').redirect,'/SavingsOS/#/admin');
    });
    await t.test('currency changes format and labels without conversion; invalid preferences and SSR default to EUR',()=>{
      const dom=new JSDOM('',{url:'http://localhost'});
      const previous=new Map(['document','localStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
      Object.defineProperty(globalThis,'document',{configurable:true,value:dom.window.document});
      Object.defineProperty(globalThis,'localStorage',{configurable:true,value:dom.window.localStorage});
      try {
        document.documentElement.lang='en';
        assert.equal(currency.savedCurrency(),'EUR');
        currency.setCurrency('USD');assert.equal(localStorage.getItem(currency.CURRENCY_KEY),'USD');
        assert.ok(money(123.45).includes('123.45'));assert.ok(money(123.45).includes('$'));
        assert.ok(studioMoney(123).includes('$'));assert.ok(compactMoney(1000).includes('$'));
        currency.setCurrency('GBP');assert.ok(currency.currencyLabel('Amount (€)').includes('£'));
        assert.ok(money(123.45).includes('123.45'));
        localStorage.setItem(currency.CURRENCY_KEY,'BOGUS');assert.equal(currency.savedCurrency(),'EUR');
        currency.setCurrency('JPY',false);assert.ok(money(123.45).includes('123.45'));
      } finally {
        currency.setCurrency('EUR',false);
        for(const [key,descriptor] of previous) descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];
        dom.window.close();
      }
      assert.equal(currency.getCurrency(),'EUR');
    });
  } finally {await server.close();}
});
