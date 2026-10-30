import React from "react";
import { createRoot } from "react-dom/client";

import { warmUpApi } from "./api.js";
import { App } from "./App.js";
import "./styles.css";

warmUpApi();

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

