import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { configureApiBaseUrl } from "@/lib/api-base";
import { initialiseTheme } from "@/lib/theme";

configureApiBaseUrl();
initialiseTheme();

createRoot(document.getElementById("root")!).render(<App />);
