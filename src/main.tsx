import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App"; // Импортируем App из App.tsx

const rootElement = document.getElementById("app");
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
} else {
    console.error("Root element #app not found");
}