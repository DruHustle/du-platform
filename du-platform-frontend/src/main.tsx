import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/content.css";
import { initializeI18n } from "./i18n";

// Initialize the i18n instance synchronously; deferred locale files load after the app mounts.
initializeI18n();

createRoot(document.getElementById("root")!).render(<App />);
