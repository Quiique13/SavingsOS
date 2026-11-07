import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { browserStorage, nativeApp } from "./services/runtime";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {browserStorage || nativeApp
      ? <HashRouter><App /></HashRouter>
      : <BrowserRouter><App /></BrowserRouter>}
  </React.StrictMode>,
);
