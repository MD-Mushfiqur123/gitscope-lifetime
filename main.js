const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { GitScopeScanner } = require('./src/scanner.js');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0a0f1d',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0f1d',
      symbolColor: '#94a3b8',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('scan-github', async (event, { token, username }) => {
  try {
    const scanner = new GitScopeScanner(token);
    const result = await scanner.scanAllRepositories((progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('scan-progress', progress);
      }
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-data', async (event, { format, data, filename }) => {
  try {
    const defaultName = filename || `gitscope-lifetime-audit-${Date.now()}.${format}`;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Lifetime GitHub Audit',
      defaultPath: defaultName,
      filters: [
        { name: format.toUpperCase(), extensions: [format] }
      ]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    let fileContent = '';
    if (format === 'json') {
      fileContent = JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      fileContent = generateCsv(data.repositories || []);
    } else if (format === 'md') {
      fileContent = generateMarkdownReport(data);
    }

    fs.writeFileSync(filePath, fileContent, 'utf-8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function generateCsv(repos) {
  const headers = [
    'ID', 'Name', 'Full Name', 'Owner', 'Visibility', 'Category', 
    'Language', 'Stars', 'Forks', 'Open Issues', 'Size (MB)', 
    'Is Fork', 'Is Archived', 'License', 'Created At', 'URL'
  ];

  const rows = repos.map(r => [
    r.id,
    `"${(r.name || '').replace(/"/g, '""')}"`,
    `"${(r.fullName || '').replace(/"/g, '""')}"`,
    `"${(r.owner?.login || '').replace(/"/g, '""')}"`,
    r.visibility,
    `"${r.ownershipCategory}"`,
    `"${r.language}"`,
    r.stars,
    r.forks,
    r.openIssues,
    r.sizeMb,
    r.isFork ? 'Yes' : 'No',
    r.isArchived ? 'Yes' : 'No',
    `"${(r.license || '').replace(/"/g, '""')}"`,
    r.createdAt,
    r.htmlUrl
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateMarkdownReport(auditData) {
  const { user, analytics, repositories, gists, rateLimit } = auditData;
  const counts = analytics.counts;
  const metrics = analytics.metrics;

  return `# 🌌 GitScope Lifetime Repository Audit Report
**User:** ${user?.name || user?.login || 'N/A'} (@${user?.login || 'anonymous'})  
**Audit Date:** ${new Date().toUTCString()}  
**Rate Limit Remaining:** ${rateLimit?.remaining || 'N/A'} / ${rateLimit?.limit || 'N/A'}

---

## 📊 Summary KPI Metrics
- **Total Repositories Accessible:** **${analytics.totalRepositories}**
- **Owned Repositories:** **${counts.totalOwned}** (${counts.ownedPublic} Public / ${counts.ownedPrivate} Private)
- **Organization Repositories:** **${counts.organization}**
- **Collaborator / Contributed:** **${counts.collaborator}**
- **Source Repositories:** **${counts.source}** | **Forked Repos:** **${counts.forks}**
- **Lifetime Stars Earned:** **${metrics.lifetimeStars.toLocaleString()}** ⭐
- **Lifetime Forks:** **${metrics.lifetimeForks.toLocaleString()}** 🍴
- **Total Lifetime Code Disk Size:** **${metrics.totalDiskSizeMb} MB** (~${metrics.totalDiskSizeGb} GB)
- **Lifetime Gists:** **${gists?.length || 0}** (${analytics.gists.public} Public, ${analytics.gists.secret} Secret)

---

## 💻 Top Programming Languages
| Language | Repositories | Distribution % |
| :--- | :--- | :--- |
${analytics.topLanguages.slice(0, 15).map(l => `| **${l.name}** | ${l.count} | ${l.percentage}% |`).join('\n')}

---

## 📁 Complete Repositories Inventory (${repositories.length})
| # | Name | Visibility | Ownership | Lang | Stars | Size (MB) | URL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${repositories.map((r, i) => `| ${i + 1} | [${r.name}](${r.htmlUrl}) | \`${r.visibility}\` | ${r.ownershipCategory} | ${r.language} | ${r.stars} | ${r.sizeMb} MB | [Link](${r.htmlUrl}) |`).join('\n')}

---
*Generated by GitScope Lifetime Auditor — Built with ❤️ by Md Mushfiqur Rahim*
`;
}
