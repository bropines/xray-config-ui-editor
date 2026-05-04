# 🚀 Xray Config UI Editor

<img width="1914" height="981" alt="msedge_KbKWtRK30y" src="https://github.com/user-attachments/assets/11c13d94-58d9-421f-af34-0f317e6ae086" />

The most advanced, static web-based GUI for **Xray-core**. Manage your configurations with ease, visualize traffic flow, and sync directly with **Remnawave Panel**. No backend required — it runs entirely in your browser.

---

## ✨ Features

- 🛠 **Full Config Support**: Complete management of Inbounds, Outbounds, Routing, DNS, and Policy.
- ☁️ **Remnawave Integration**: Direct sync via API (Credentials or API Token). Load and save profiles to your cloud panel instantly.
- 🕸 **Visual Topology**: Interactive traffic flow graph powered by React Flow.
- 🛡 **Reality Tooling**: Built-in X25519 key generator for Reality security.
- 📝 **Dual Mode Editing**: Switch between a user-friendly GUI and a raw JSON editor ([CodeMirror 6](https://code.haverbeke.berlin/codemirror/dev/)) with one click.
- 📂 **Local Management**: Drag & Drop your `config.json` to edit locally or use built-in presets.
- 🧩 **Smart Routing**: Advanced routing manager with Drag-and-Drop rule reordering.
- 😇 **Lots of tooltips**: Since developers (me) sometimes have silly little sun icons, we decided to label some of the features and explain what they are in tooltips or in captions below.

---

## 🧱 Issues 
- Unfortunately, we cannot be certain that some parameters will not conflict with each other. If you encounter such a combination, please report it in an ISSUE, and we will simply adjust the configurator (or add a WASM validator...).

---

## 📸 Screenshots

### Remnawave Cloud Sync
<img width="413" height="455" alt="msedge_sYTtYMnxge" src="https://github.com/user-attachments/assets/3374f6b7-8605-47f5-bd0e-3bba4e9eeb96" />

*Connect to your panel and manage profiles in real-time.*

### Routing Manager
<img width="1113" height="859" alt="msedge_jAldcIXP2L" src="https://github.com/user-attachments/assets/00386afe-d97d-42a2-ae56-cad40ec4e66a" />

*Manage complex routing logic with simple Drag-and-Drop.*

### Visual Topology
<img width="1112" height="808" alt="msedge_ZkBhtJOeGs" src="https://github.com/user-attachments/assets/be7c017b-e0e7-4ed4-b6e3-125e8929b512" />

*Visualize how traffic moves through your core.*

### GeoFile viewer

<img width="1032" height="927" alt="msedge_WVpvQf2m5D" src="https://github.com/user-attachments/assets/863b26f8-b97a-44b4-9866-3e80ec0a51eb" />

*Allows you to view the contents of any geofile via a link or by uploading it from your PC*

### Inbound Editor

<img width="1105" height="795" alt="msedge_oY8cM3aVVx" src="https://github.com/user-attachments/assets/5ddcb432-f024-4038-8019-cad466823550" />

*We tried to add as many options as possible to the UI for our littlest bread lovers...*

### Outbound editor

<img width="1101" height="791" alt="msedge_ZvODgoqbK4" src="https://github.com/user-attachments/assets/50170d6b-dd8c-45e2-b1cd-cbffd20b62f4" />

*Our implementation of the Outbound parser allows you to import the configuration from Amnezia into the parameters for finalmask in just a few clicks.*

### JSON editor 

<img width="1914" height="981" alt="msedge_piY5rBqkxX" src="https://github.com/user-attachments/assets/b0c559a7-375f-4965-a44e-0141078dd1ff" />

*We have addressed the issue where, for some reason, certain settings are missing from our interface, so you are free to consult the documentation and enter whatever you want in the JSON editor. UI will not override unknown variables*

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
- **CodeMirror** Lightweight in-browser code editor

---

## ⚠️ Disclaimer

This tool is for educational and configuration management purposes only. Ensure you comply with your local laws and regulations regarding the use of proxy software.

---
*Built with ❤️ for the privacy community.*
