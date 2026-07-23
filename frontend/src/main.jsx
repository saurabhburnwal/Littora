import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { StatsProvider } from "./context/StatsContext.jsx";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <StatsProvider>
        <App />
      </StatsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
