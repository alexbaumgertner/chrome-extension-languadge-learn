import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@/lib/design/page";
import { t, uiLanguage } from "@/lib/i18n";
import "./options.css";

document.documentElement.lang = uiLanguage();
document.title = t("optionsTitle");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
