import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./i18n";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import DebugOverlay from "./components/DebugOverlay";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <>
    <DebugOverlay />
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </>
);
