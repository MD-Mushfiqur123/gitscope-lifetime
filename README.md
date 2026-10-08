# 🌌 GitScope Lifetime — Total GitHub Repository Counter & Deep Analytics

> **Creator & Author:** **Md Mushfiqur Rahim**  
> **Repository:** [MD-Mushfiqur123/gitscope-lifetime](https://github.com/MD-Mushfiqur123)  
> **Tech Stack:** Electron 34, Node.js, Tailwind CSS v4, Chart.js, Fira Code  
> **Theme:** Dark Mode (OLED Cyberpunk)

---

## 🚀 Overview
**GitScope Lifetime** is a cross-platform desktop application designed to accurately scan, count, and audit **100% of your lifetime GitHub repositories** using a personal authentication token (`ghp_...` or `github_pat_...`).

Unlike standard GitHub web views which cap or separate organizations and private forks, GitScope performs an exhaustive pagination scan across all affiliations:
- 🔒 **Owned Private Repositories**
- 🌐 **Owned Public Repositories**
- 👥 **Organization & Team Repositories**
- 🤝 **Collaborator & Shared Codebases**
- 🍴 **Source vs. Forked Repositories**
- 📝 **Lifetime Gists (Public & Secret)**
- ⭐ **Lifetime Stars, Forks, Open Issues & Watchers**
- 💾 **Total Source Code Disk Footprint (MB / GB)**
- 💻 **Programming Language & License Distribution**

---

## ⚡ Quick Start

### 1. Launch Desktop App (Electron)
```bash
cd projects/gitscope-lifetime
npm start
```

### 2. Launch Web Mode (Browser)
```bash
cd projects/gitscope-lifetime
npm run web
# Open in browser: http://localhost:3456
```

---

## 🔑 How to Use
1. Generate a GitHub Personal Access Token (Classic or Fine-Grained) at [GitHub Token Settings](https://github.com/settings/tokens).
2. Ensure you check the **`repo`** scope (for private repositories) and **`read:org`** (for organization access).
3. Paste the token into GitScope and hit **`START LIFETIME DEEP SCAN`**.
4. View real-time progress, deep KPI metrics, language charts, and filterable repository tables.
5. Export your complete audit report in **JSON**, **CSV**, or **Markdown** formats with a single click.

---

## 🛡️ Security & Privacy
- **Zero Token Leakage:** Tokens are held purely in volatile memory during the session and are **never** stored on disk or sent to third-party servers.
- **Direct GitHub API Connection:** All network queries route directly from your local machine to `https://api.github.com`.

---
*Built with ❤️ by Md Mushfiqur Rahim for developers, researchers, and open-source architects.*
