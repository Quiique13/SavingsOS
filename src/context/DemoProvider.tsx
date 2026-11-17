import { useRef, useState, type ReactNode } from "react";
import { FinanceContext } from "./FinanceContext";
import { UsersContext, type UsersState } from "./UsersContext";
import { DemoContext } from "./DemoContext";
import { createDemoData } from "../utils/demoData";
import { isValidBackup } from "../utils/finance";
import type { Data } from "../types/finance";

export function DemoProvider({children}: {children:ReactNode}) {
  const [data,setData]=useState(createDemoData);
  const snapshot=useRef(data);
  const [error,setError]=useState("");
  const user={id:"savingsos-fictional-demo",name:"Alex Morgan",hasPassword:false,role:"user" as const,createdAt:"2025-01-01"};
  function update(fn:(current:Data)=>Data) {
    const next=fn(snapshot.current);
    if(!isValidBackup(next)) throw new Error("The demo change is not valid.");
    snapshot.current=next;setData(next);setError("");
  }
  const unavailable=async()=>{throw new Error("Profile changes are unavailable in the demo.");};
  const users:UsersState={
    currentUser:user,users:[{...user,revision:0}],busy:false,saving:false,error:"",
    signIn:unavailable,createUser:unavailable,renameUser:unavailable,deleteUser:unavailable,refreshUsers:async()=>{},createAdmin:unavailable,saveAdminSettings:unavailable,exportProfiles:unavailable,exportProfile:unavailable,importProfile:unavailable,configureUser:unavailable,
    signOut:async()=>{window.location.assign(import.meta.env.BASE_URL);},
  };
  function reset() { const next=createDemoData();snapshot.current=next;setData(next);setError(""); }
  return <DemoContext.Provider value={{reset}}><UsersContext.Provider value={users}><FinanceContext.Provider value={{data,update,save:async fn=>update(fn),ready:true,error,clearDemo:reset}}>{children}</FinanceContext.Provider></UsersContext.Provider></DemoContext.Provider>;
}
