import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeI18n } from "./i18n";

initializeI18n().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
