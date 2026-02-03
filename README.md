# 🚀 Xray Config UI Editor

**PIC**

The most advanced, static web-based GUI for **Xray-core**. Manage your configurations with ease, visualize traffic flow, and sync directly with **Remnawave Panel**. No backend required — it runs entirely in your browser.

---

## ✨ Features

- 🛠 **Full Config Support**: Complete management of Inbounds, Outbounds, Routing, DNS, and Policy.
- ☁️ **Remnawave Integration**: Direct sync via API (Credentials or API Token). Load and save profiles to your cloud panel instantly.
- 🕸 **Visual Topology**: Interactive traffic flow graph powered by React Flow.
- 🛡 **Reality Tooling**: Built-in X25519 key generator for Reality security.
- 📝 **Dual Mode Editing**: Switch between a user-friendly GUI and a raw JSON editor (Monaco Editor) with one click.
- 📂 **Local Management**: Drag & Drop your `config.json` to edit locally or use built-in presets.
- 🧩 **Smart Routing**: Advanced routing manager with Drag-and-Drop rule reordering.

---

## 📸 Screenshots

### Remnawave Cloud Sync
**PIC**
*Connect to your panel and manage profiles in real-time.*

### Routing Manager
**PIC**
*Manage complex routing logic with simple Drag-and-Drop.*

### Visual Topology
**PIC**
*Visualize how traffic moves through your core.*

---

## ☁️ Remnawave Connection (CORS Setup)

Since this is a **static web application** (hosted on GitHub Pages), your browser will block requests to your Remnawave server unless **CORS** is properly configured. 

### Mandatory Nginx Configuration

To allow this UI to communicate with your Remnawave API, add the following block inside your `location /` in your Nginx config:

```nginx
# 1. Hide potential duplicate headers from the backend
proxy_hide_header 'Access-Control-Allow-Origin';
proxy_hide_header 'Access-Control-Allow-Methods';
proxy_hide_header 'Access-Control-Allow-Headers';

# 2. Allow this UI domain
add_header 'Access-Control-Allow-Origin' 'https://bropines.github.io' always;

# 3. Allow required methods (PATCH is critical for saving!)
add_header 'Access-Control-Allow-Methods' 'GET, POST, PATCH, DELETE, OPTIONS' always;

# 4. Allow required headers
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Cache-Control, X-Requested-With' always;

# 5. Handle preflight (OPTIONS) requests
if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' 'https://bropines.github.io' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PATCH, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Cache-Control, X-Requested-With' always;
    add_header 'Access-Control-Max-Age' 1728000;
    add_header 'Content-Type' 'text/plain; charset=utf-8';
    add_header 'Content-Length' 0;
    return 204;
}
```
*Don't forget to reload Nginx:* `nginx -s reload`

---

## 🛠 Installation & Dev

This project is built with **React**, **TypeScript**, **Zustand**, and **Bun**.

### 1. Install dependencies
```bash
bun install
```

### 2. Run development server
```bash
bun run dev
```

### 3. Build for production
```bash
bun run build
```

---

## 🤝 Credits

- **Xray-core**: The heart of the configuration.
- **Remnawave**: Awesome proxy management panel.
- **Phosphor Icons**: Beautiful iconography.
- **xyflow**: For the powerful topology visualization.

---

## ⚠️ Disclaimer

This tool is for educational and configuration management purposes only. Ensure you comply with your local laws and regulations regarding the use of proxy software.

---
*Built with ❤️ for the privacy community.*