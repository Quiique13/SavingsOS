import type { Data, Expense } from "../types/finance";
import { getRows, shiftMonth, today } from "./finance";

/** Only invented accounts and transactions; never seeded from a real profile. */
export function createDemoData(date = today()): Data {
  const month = date.slice(0, 7);
  const first = shiftMonth(month, -5);
  const bills: [string,number,string,number,string][] = [
    ["Apartment rent",850,"Housing",2,"demo-everyday"],
    ["Weekly groceries",275,"Groceries",6,"demo-everyday"],
    ["Home internet",39.90,"Utilities",8,"demo-bills"],
    ["Music subscription",8.99,"Subscriptions",10,"demo-bills"],
    ["Electricity",54.60,"Utilities",18,"demo-bills"],
    ["Transit pass",42,"Transport",20,"demo-everyday"],
    ["Gym membership",29.90,"Health",22,"demo-bills"],
    ["Weekend meals",65,"Eating out",25,"demo-everyday"],
  ];
  const expenses: Expense[] = bills.map(([name,amount,category,day,accountId],i) => ({id:`demo-bill-${i}`,name,amount,category,accountId,due:`${first}-${String(day).padStart(2,"0")}`,frequency:"monthly",notes:"Fictional showcase entry."}));
  expenses.push({id:"demo-insurance",name:"Annual home insurance",amount:186,category:"Housing",accountId:"demo-bills",due:month+"-24",frequency:"yearly",notes:"Fictional annual renewal."});
  expenses.push({id:"demo-headphones",name:"New headphones",amount:79.90,category:"Shopping",accountId:"demo-everyday",due:month+"-12",frequency:"once",notes:"Fictional one-time purchase."});
  const data: Data = {
    initialized:true,
    accounts:[
      {id:"demo-everyday",name:"Everyday",provider:"Harbor Bank (fictional)",kind:"Spending",balance:1640.35,color:"#328d76"},
      {id:"demo-bills",name:"Bills pocket",provider:"Willow Wallet (fictional)",kind:"Subscriptions",balance:475.80,color:"#d5aa54"},
      {id:"demo-rainy",name:"Rainy-day fund",provider:"Cedar Savings (fictional)",kind:"Savings",balance:4200,color:"#9fc866"},
      {id:"demo-future",name:"Future plans",provider:"Northstar Investing (fictional)",kind:"Savings",balance:6850.50,color:"#939ccf"},
    ], expenses, payments:{}, income:[], transfers:[],
  };
  for (let index = -6; index <= 0; index++) {
    const received = shiftMonth(month,index);
    const previousDay = new Date(Number(received.slice(0,4)),Number(received.slice(5,7)),0).getDate();
    const salaryDate = `${received}-${Math.min(27,previousDay)}`;
    if (salaryDate <= date) data.income.push({id:`demo-salary-${received}`,name:"Monthly salary",amount:2450+(index+6)*25,date:salaryDate,accountId:"demo-everyday"});
    const freelanceDate=received+"-14";
    if (freelanceDate<=date) data.income.push({id:`demo-freelance-${received}`,name:"Weekend design work",amount:180+(index+6)*15,date:freelanceDate,accountId:"demo-everyday"});
  }
  for (let index=-5;index<=0;index++) for(const row of getRows(data,shiftMonth(month,index))) {
    if(row.date<=date) data.payments[row.key]=row.date;
  }
  const transferDate=month+"-"+String(Math.min(Number(date.slice(8)),5)).padStart(2,"0");
  data.transfers = [
    {id:"demo-transfer-bills",fromAccountId:"demo-everyday",toAccountId:"demo-bills",amount:350,date:transferDate,notes:"Monthly bills allocation — fictional."},
    {id:"demo-transfer-savings",fromAccountId:"demo-everyday",toAccountId:"demo-rainy",amount:200,date:transferDate,notes:"Monthly savings — fictional."},
  ];
  return data;
}
