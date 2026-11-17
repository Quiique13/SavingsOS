import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { browserStorage, nativeApp } from "./services/runtime";
import "./index.css";
import { appEntry } from "./utils/appEntry";

const entry = appEntry(
  location.pathname,
  location.hash,
  browserStorage || nativeApp,
  import.meta.env.BASE_URL,
);
if (entry.redirect) history.replaceState(null, "", entry.redirect);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {browserStorage || nativeApp ? (
      <HashRouter basename={entry.basename}>
        <App demo={entry.demo} />
      </HashRouter>
    ) : (
      <BrowserRouter basename={entry.basename}>
        <App demo={entry.demo} />
      </BrowserRouter>
    )}
  </React.StrictMode>,
);
