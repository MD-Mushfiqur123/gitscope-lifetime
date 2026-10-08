// GitScope Swiss Minimal Controller & Deep Portfolio Charts
let currentAuditData = null;
let pieLangChart = null;
let pieReposChart = null;
let pieActivityChart = null;

document.addEventListener('DOMContentLoaded', () => {
  const authView = document.getElementById('auth-view');
  const dashboardView = document.getElementById('dashboard-view');
  const btnResetAuth = document.getElementById('btn-reset-auth');

  const tokenInput = document.getElementById('token-input');
  const btnToggleEye = document.getElementById('btn-toggle-eye');
  const btnRunAudit = document.getElementById('btn-run-audit');
  const btnPublicScan = document.getElementById('btn-public-scan');

  const loadingBar = document.getElementById('auth-loading-bar');
  const loadPhase = document.getElementById('load-phase');
  const loadPct = document.getElementById('load-pct');
  const loadProgressFill = document.getElementById('load-progress-fill');
  const loadMsg = document.getElementById('load-msg');

  const tableSearchInput = document.getElementById('table-search-input');
  const tableVisibilitySelect = document.getElementById('table-visibility-select');
  const inventoryTbody = document.getElementById('inventory-tbody');
  const tableCount = document.getElementById('table-count');

  const exportBtnJson = document.getElementById('export-btn-json');
  const exportBtnCsv = document.getElementById('export-btn-csv');
  const exportBtnMd = document.getElementById('export-btn-md');

  btnToggleEye.addEventListener('click', () => {
    if (tokenInput.type === 'password') {
      tokenInput.type = 'text';
      btnToggleEye.textContent = 'HIDE';
    } else {
      tokenInput.type = 'password';
      btnToggleEye.textContent = 'SHOW';
    }
  });

  btnResetAuth.addEventListener('click', () => {
    currentAuditData = null;
    dashboardView.classList.add('hidden');
    authView.classList.remove('hidden');
    btnResetAuth.classList.add('hidden');
    loadingBar.classList.add('hidden');
    tokenInput.value = '';
  });

  if (window.gitscope?.onProgress) {
    window.gitscope.onProgress((progress) => {
      loadingBar.classList.remove('hidden');
      loadProgressFill.style.width = `${progress.percent}%`;
      loadPct.textContent = `${progress.percent}%`;
      loadPhase.textContent = progress.phase.toUpperCase();
      loadMsg.textContent = progress.message;
    });
  }

  btnRunAudit.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      alert('Please enter your GitHub Personal Access Token.');
      tokenInput.focus();
      return;
    }
    await startPortfolioAudit(token);
  });

  btnPublicScan.addEventListener('click', async () => {
    const username = prompt('Enter public GitHub username to audit:', 'MD-Mushfiqur123');
    if (!username) return;
    await startPortfolioAudit('', username.trim());
  });

  async function startPortfolioAudit(token, username = null) {
    btnRunAudit.disabled = true;
    btnPublicScan.disabled = true;
    btnRunAudit.classList.add('opacity-50');

    loadingBar.classList.remove('hidden');
    loadProgressFill.style.width = '10%';
    loadPct.textContent = '10%';
    loadPhase.textContent = 'CONNECTING';
    loadMsg.textContent = 'Querying GitHub REST & GraphQL pipelines...';

    try {
      let result;
      if (window.gitscope?.scanGithub) {
        result = await window.gitscope.scanGithub({ token, username });
      } else {
        const ScannerClass = window.GitScopeScanner || (await import('./scanner.js')).GitScopeScanner;
        const scanner = new ScannerClass(token);
        const data = await scanner.scanAllRepositories((p) => {
          loadProgressFill.style.width = `${p.percent}%`;
          loadPct.textContent = `${p.percent}%`;
          loadPhase.textContent = p.phase.toUpperCase();
          loadMsg.textContent = p.message;
        });
        result = { success: true, data };
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      currentAuditData = result.data;
      renderLifetimePortfolio(result.data);

    } catch (err) {
      alert(`Audit Encountered Error:\n${err.message}`);
      loadMsg.textContent = `Error: ${err.message}`;
    } finally {
      btnRunAudit.disabled = false;
      btnPublicScan.disabled = false;
      btnRunAudit.classList.remove('opacity-50');
    }
  }

  // Global UI State
  let currentCalculationMode = 'source'; // 'source' | 'all'
  let isActivityBalanced = true;

  // Mode Switch Buttons
  const btnModeSource = document.getElementById('btn-mode-source');
  const btnModeAll = document.getElementById('btn-mode-all');
  const scopeModeLabel = document.getElementById('scope-mode-label');
  const btnToggleActivityScale = document.getElementById('btn-toggle-activity-scale');

  btnModeSource?.addEventListener('click', () => {
    if (currentCalculationMode === 'source') return;
    currentCalculationMode = 'source';
    btnModeSource.className = 'px-3.5 py-1.5 bg-white text-black font-bold uppercase transition cursor-pointer';
    btnModeAll.className = 'px-3.5 py-1.5 bg-swiss-black text-zinc-400 hover:text-white border border-swiss-border uppercase transition cursor-pointer';
    if (scopeModeLabel) scopeModeLabel.textContent = 'ORIGINAL SOURCE ONLY (NO FORKS)';
    if (currentAuditData) updateDashboardMetrics(currentAuditData);
  });

  btnModeAll?.addEventListener('click', () => {
    if (currentCalculationMode === 'all') return;
    currentCalculationMode = 'all';
    btnModeAll.className = 'px-3.5 py-1.5 bg-white text-black font-bold uppercase transition cursor-pointer';
    btnModeSource.className = 'px-3.5 py-1.5 bg-swiss-black text-zinc-400 hover:text-white border border-swiss-border uppercase transition cursor-pointer';
    if (scopeModeLabel) scopeModeLabel.textContent = `ALL INCLUSIVE (+ ${currentAuditData?.analytics?.counts?.forks || 0} FORKS)`;
    if (currentAuditData) updateDashboardMetrics(currentAuditData);
  });

  btnToggleActivityScale?.addEventListener('click', () => {
    isActivityBalanced = !isActivityBalanced;
    btnToggleActivityScale.textContent = isActivityBalanced ? 'VIEW: BALANCED' : 'VIEW: RAW SCALE';
    if (currentAuditData) renderActivityPieChart(currentAuditData.analytics.pieCharts);
  });

  // ── Render Lifetime Portfolio ─────────────────────────────────────────────
  function renderLifetimePortfolio(data) {
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    btnResetAuth.classList.remove('hidden');

    const { user, analytics, repositories, gists, rateLimit } = data;

    // Header Rate Limit
    if (rateLimit?.limit) {
      const headerBox = document.getElementById('header-rate-box');
      headerBox.classList.remove('hidden');
      headerBox.classList.add('flex');
      document.getElementById('header-rate-val').textContent = `${rateLimit.remaining}/${rateLimit.limit}`;
    }

    // Profile Info
    document.getElementById('dash-avatar').src = user?.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
    document.getElementById('dash-name').textContent = (user?.name || user?.login || 'GITHUB OPERATOR').toUpperCase();
    document.getElementById('dash-login').textContent = user?.login || 'anonymous';
    document.getElementById('dash-link').href = user?.html_url || 'https://github.com';
    document.getElementById('dash-bio').textContent = user?.bio || 'No public bio provided.';
    document.getElementById('dash-location').textContent = `LOC: ${(user?.location || 'GLOBAL').toUpperCase()}`;
    document.getElementById('dash-created').textContent = `SINCE: ${user?.created_at ? new Date(user.created_at).getFullYear() : '2026'}`;
    document.getElementById('dash-gists').textContent = `GISTS: ${gists?.length || 0}`;

    // Update Mode-dependent Metrics
    updateDashboardMetrics(data);

    // Render Table
    renderPortfolioTable(repositories);
  }

  function updateDashboardMetrics(data) {
    const { analytics, gists } = data;
    const isSource = currentCalculationMode === 'source';
    const vol = isSource ? analytics.sourceVolume : analytics.allVolume;
    const met = analytics.metrics;

    // Grand Repos: If source, show source count; if all, show total
    document.getElementById('dash-grand-total').textContent = isSource
      ? analytics.counts.source.toLocaleString()
      : analytics.totalRepositories.toLocaleString();

    // 10 Detailed Volume Metric Cards
    document.getElementById('stat-commits').textContent = vol.totalCommits.toLocaleString();
    document.getElementById('stat-prs').textContent = vol.totalPullRequests.toLocaleString();
    document.getElementById('stat-merged-prs').textContent = vol.mergedPullRequests.toLocaleString();
    document.getElementById('stat-files').textContent = `~${vol.estimatedTotalFiles.toLocaleString()}`;
    document.getElementById('stat-loc').textContent = `~${vol.estimatedLinesOfCode.toLocaleString()}`;
    document.getElementById('stat-words').textContent = `~${vol.estimatedWordsWritten.toLocaleString()}`;
    document.getElementById('stat-letters').textContent = `~${vol.estimatedLettersOnly.toLocaleString()}`;
    document.getElementById('stat-chars').textContent = vol.estimatedCharactersWritten.toLocaleString();
    document.getElementById('stat-size').textContent = `${vol.totalDiskSizeMb.toLocaleString()} MB`;
    document.getElementById('stat-size-gb').textContent = vol.totalDiskSizeGb;
    document.getElementById('stat-stars').textContent = `${vol.stars.toLocaleString()} ⭐`;
    document.getElementById('stat-forks').textContent = vol.forks.toLocaleString();
    document.getElementById('stat-issues').textContent = vol.totalIssues.toLocaleString();
    document.getElementById('stat-gists-count').textContent = (gists?.length || 0).toLocaleString();

    document.getElementById('table-timestamp').textContent = `AUDIT TIMESTAMP: ${new Date().toISOString()}`;

    // Render 3 Portfolio Pie Charts (Using Source Languages or All Languages according to mode)
    renderPortfolioPieCharts(analytics.pieCharts, isSource);
  }

  // ── Render 3 Swiss Precision Pie Charts ────────────────────────────────────
  function renderPortfolioPieCharts(pieData, isSource = true) {
    const pieConfig = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#a1a1aa',
            font: { family: 'JetBrains Mono', size: 9 },
            boxWidth: 8,
            padding: 8
          }
        }
      },
      cutout: '0%'
    };

    // 1. Languages Pie Chart
    const ctxLang = document.getElementById('pie-languages-chart').getContext('2d');
    if (pieLangChart) pieLangChart.destroy();

    const langsList = isSource ? pieData.sourceLanguages : pieData.allLanguages;
    const topLangs = langsList.slice(0, 6);
    const langPalette = ['#ffffff', '#ff2a2a', '#a1a1aa', '#71717a', '#3f3f46', '#27272a'];

    pieLangChart = new Chart(ctxLang, {
      type: 'pie',
      data: {
        labels: topLangs.map(l => `${l.name.toUpperCase()} (${l.percentage}%)`),
        datasets: [{
          data: topLangs.map(l => l.count),
          backgroundColor: langPalette.slice(0, topLangs.length),
          borderWidth: 1.5,
          borderColor: '#121215'
        }]
      },
      options: pieConfig
    });

    // 2. Repositories Privacy & Type Pie Chart
    const ctxRepos = document.getElementById('pie-repos-chart').getContext('2d');
    if (pieReposChart) pieReposChart.destroy();

    pieReposChart = new Chart(ctxRepos, {
      type: 'pie',
      data: {
        labels: pieData.repoTypes.map(r => `${r.label} (${r.count})`),
        datasets: [{
          data: pieData.repoTypes.map(r => r.count),
          backgroundColor: pieData.repoTypes.map(r => r.color),
          borderWidth: 1.5,
          borderColor: '#121215'
        }]
      },
      options: pieConfig
    });

    // 3. Work Activity Pie Chart
    renderActivityPieChart(pieData);
  }

  function renderActivityPieChart(pieData) {
    const ctxAct = document.getElementById('pie-activity-chart').getContext('2d');
    if (pieActivityChart) pieActivityChart.destroy();

    const pieConfig = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#a1a1aa',
            font: { family: 'JetBrains Mono', size: 9 },
            boxWidth: 8,
            padding: 8
          }
        }
      },
      cutout: '0%'
    };

    const dataset = isActivityBalanced ? pieData.activityBalanced : pieData.activityRaw;

    pieActivityChart = new Chart(ctxAct, {
      type: 'pie',
      data: {
        labels: dataset.map(a => `${a.label}`),
        datasets: [{
          data: dataset.map(a => a.count),
          backgroundColor: dataset.map(a => a.color),
          borderWidth: 1.5,
          borderColor: '#121215'
        }]
      },
      options: pieConfig
    });
  }

  // ── Render Portfolio Master Table ─────────────────────────────────────────
  function renderPortfolioTable(repos) {
    const query = (tableSearchInput.value || '').toLowerCase().trim();
    const vis = tableVisibilitySelect.value;

    const filtered = repos.filter(r => {
      if (vis === 'public' && r.isPrivate) return false;
      if (vis === 'private' && !r.isPrivate) return false;
      if (vis === 'fork' && !r.isFork) return false;

      if (query) {
        return (
          r.name.toLowerCase().includes(query) ||
          (r.language || '').toLowerCase().includes(query) ||
          (r.owner?.login || '').toLowerCase().includes(query)
        );
      }
      return true;
    });

    tableCount.textContent = filtered.length;
    inventoryTbody.innerHTML = '';

    if (filtered.length === 0) {
      inventoryTbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-4 py-8 text-center text-zinc-600">
            NO MATCHING CODEBASES FOUND.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-zinc-900 transition';

      const visBadge = r.isPrivate
        ? '<span class="text-swiss-red font-bold">[PRIVATE]</span>'
        : '<span class="text-zinc-400">[PUBLIC]</span>';

      const forkTag = r.isFork ? '<span class="text-[10px] text-zinc-500 ml-1">(FORK)</span>' : '';

      tr.innerHTML = `
        <td class="px-4 py-3 font-semibold text-white">
          <a href="${r.htmlUrl}" target="_blank" class="hover:text-swiss-red hover:underline">
            ${r.name}
          </a>
          ${forkTag}
          <div class="text-[10px] text-zinc-500 truncate max-w-sm font-normal">${r.description}</div>
        </td>
        <td class="px-4 py-3">${visBadge}</td>
        <td class="px-4 py-3 text-zinc-300 uppercase">${r.ownershipCategory}</td>
        <td class="px-4 py-3 text-zinc-300">${(r.language || 'TEXT').toUpperCase()}</td>
        <td class="px-4 py-3 text-right text-zinc-300">${r.stars}</td>
        <td class="px-4 py-3 text-right text-zinc-400">${r.sizeMb} MB</td>
        <td class="px-4 py-3 text-right text-zinc-500 text-[10px]">${r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : 'N/A'}</td>
      `;

      inventoryTbody.appendChild(tr);
    });
  }

  tableSearchInput.addEventListener('input', () => {
    if (currentAuditData) renderPortfolioTable(currentAuditData.repositories);
  });

  tableVisibilitySelect.addEventListener('change', () => {
    if (currentAuditData) renderPortfolioTable(currentAuditData.repositories);
  });

  // Export handlers
  async function triggerExport(format) {
    if (!currentAuditData) return;
    if (window.gitscope?.exportData) {
      const userPrefix = currentAuditData.user?.login || 'github';
      const res = await window.gitscope.exportData({
        format,
        data: currentAuditData,
        filename: `gitscope-${userPrefix}-portfolio-audit.${format}`
      });
      if (res.success && !res.canceled) {
        alert(`Dossier saved:\n${res.filePath}`);
      }
    } else {
      let content = '';
      let mime = 'text/plain';
      if (format === 'json') {
        content = JSON.stringify(currentAuditData, null, 2);
        mime = 'application/json';
      }
      const blob = new Blob([content], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gitscope-portfolio.${format}`;
      a.click();
    }
  }

  exportBtnJson.addEventListener('click', () => triggerExport('json'));
  exportBtnCsv.addEventListener('click', () => triggerExport('csv'));
  exportBtnMd.addEventListener('click', () => triggerExport('md'));
});
