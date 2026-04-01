/* ============================================================
   CALYRA — dashboard.js
   Full calculator logic, charts, history, insights
   ============================================================ */

// ── Auth Guard ─────────────────────────────────────────────────
let currentUser = null;

(function authGuard() {
  const raw = localStorage.getItem('calyra_session');
  if (!raw) { window.location.href = 'login.html'; return; }
  try {
    currentUser = JSON.parse(raw);
  } catch {
    window.location.href = 'login.html';
  }
})();

// ── Init on Load ───────────────────────────────────────────────
window.addEventListener('load', () => {
  document.getElementById('loadingSpinner').style.display = 'none';

  if (!currentUser) return;

  // Fill user info
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarEmail').textContent = currentUser.email;
  document.getElementById('sidebarAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('welcomeMsg').textContent = `Welcome, ${currentUser.name} 👋`;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('welcomeSub').textContent = `${greet}! Here's your business performance at a glance.`;

  // Apply theme
  applyTheme(getTheme());
  updateThemeIcons();

  // Render overview stats
  renderOverviewStats();
  renderRecentActivity();
});

// ── Logout ─────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('calyra_session');
  window.location.href = 'login.html';
}

// ── Theme (dashboard-specific) ─────────────────────────────────
function toggleThemeDash() {
  toggleTheme();
  updateThemeIcons();
  // Re-render charts with new colors
  setTimeout(() => {
    if (document.getElementById('page-analytics').classList.contains('active')) {
      renderCharts();
    }
  }, 100);
}

function updateThemeIcons() {
  const dark = getTheme() === 'dark';
  const moonSVG = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  const sunSVG = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
  ['themeIcon', 'themeIconTop'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = dark ? sunSVG : moonSVG;
  });
}

// ── Sidebar ────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ── Navigation ─────────────────────────────────────────────────
const pageTitles = {
  overview: 'Overview',
  analytics: 'Analytics',
  calculators: 'Calculators',
  history: 'Calculation History',
  insights: 'Smart Insights'
};

function navigateTo(pageId, navEl) {
  // Deactivate all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Activate target
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  if (navEl) navEl.classList.add('active');

  document.getElementById('topbarTitle').textContent = pageTitles[pageId] || pageId;

  closeSidebar();

  // Page-specific init
  if (pageId === 'analytics') renderCharts();
  if (pageId === 'history') renderFullHistory();
  if (pageId === 'insights') renderInsights();
  if (pageId === 'overview') { renderOverviewStats(); renderRecentActivity(); }
}

// ── Data Helpers ───────────────────────────────────────────────
function getUserKey() {
  return `calyra_calcs_${currentUser.email}`;
}

function getUserCalcs() {
  try {
    return JSON.parse(localStorage.getItem(getUserKey()) || '[]');
  } catch { return []; }
}

function saveUserCalcs(calcs) {
  localStorage.setItem(getUserKey(), JSON.stringify(calcs));
}

// ── Overview Stats ─────────────────────────────────────────────
function renderOverviewStats() {
  const calcs = getUserCalcs();
  document.getElementById('statCalcs').textContent = calcs.length;

  // Latest profit
  const profitCalcs = calcs.filter(c => c.type === 'profit' || c.type === 'product');
  if (profitCalcs.length > 0) {
    const last = profitCalcs[profitCalcs.length - 1];
    const val = last.data.netProfit ?? last.data.profit ?? 0;
    document.getElementById('statProfit').textContent = formatCurrency(val);
  }

  // Latest ROI
  const roiCalcs = calcs.filter(c => c.type === 'roi');
  if (roiCalcs.length > 0) {
    const last = roiCalcs[roiCalcs.length - 1];
    document.getElementById('statROI').textContent = formatPercent(last.data.roi);
  }

  // Days active (days since first calc or account creation)
  if (calcs.length > 0) {
    const first = Math.min(...calcs.map(c => c.timestamp));
    const days = Math.max(1, Math.floor((Date.now() - first) / 86400000) + 1);
    document.getElementById('statStreak').textContent = days;
  }
}

// ── Recent Activity ────────────────────────────────────────────
const calcEmojis = {
  profit: '💹', pricing: '🏷️', breakeven: '🎯', roi: '📊',
  cashflow: '💸', forecast: '🔮', product: '📦', discount: '🏷', goal: '🏆'
};
const calcLabels = {
  profit: 'Profit Calculator', pricing: 'Pricing', breakeven: 'Break-even',
  roi: 'ROI Analysis', cashflow: 'Cash Flow', forecast: 'Revenue Forecast',
  product: 'Product Analyzer', discount: 'Discount Calc', goal: 'Goal Calculator'
};

function renderRecentActivity() {
  const calcs = getUserCalcs().slice(-5).reverse();
  const container = document.getElementById('recentActivity');

  if (calcs.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <p>No calculations yet. Try a calculator!</p>
    </div>`;
    return;
  }

  container.innerHTML = calcs.map((c, i) => {
    const val = getPrimaryValue(c);
    const isNeg = val && (val.startsWith('-') || val.includes('−'));
    return `<div class="history-item" style="animation-delay:${i * 0.07}s">
      <div class="history-icon">${calcEmojis[c.type] || '📊'}</div>
      <div class="history-info">
        <div class="h-type">${calcLabels[c.type] || c.type}</div>
        <div class="h-date">${formatDate(c.timestamp)}</div>
      </div>
      <div class="history-value ${isNeg ? 'neg' : ''}">${val || '—'}</div>
    </div>`;
  }).join('');
}

function getPrimaryValue(c) {
  const d = c.data;
  switch (c.type) {
    case 'profit': return formatCurrency(d.netProfit);
    case 'pricing': return formatCurrency(d.price);
    case 'breakeven': return `${Math.ceil(d.units)} units`;
    case 'roi': return formatPercent(d.roi);
    case 'cashflow': return formatCurrency(d.closing);
    case 'forecast': return formatCurrency(d.projected);
    case 'product': return formatCurrency(d.netProfit);
    case 'discount': return formatCurrency(d.discountedPrice);
    case 'goal': return `${Math.ceil(d.units)} units`;
    default: return '—';
  }
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Save Calculation ───────────────────────────────────────────
function saveCalculation(type) {
  const data = getCurrentCalcData(type);
  if (!data) { showToast('No results to save. Run a calculation first.', 'warning'); return; }

  const calcs = getUserCalcs();
  calcs.push({ id: Date.now(), type, data, timestamp: Date.now() });
  saveUserCalcs(calcs);
  showToast(`${calcLabels[type]} saved!`, 'success');
  renderOverviewStats();
}

function getCurrentCalcData(type) {
  switch (type) {
    case 'profit': {
      const rev = +v('p_revenue'), cogs = +v('p_cogs'), opex = +v('p_opex') || 0, tax = +v('p_tax') || 0;
      if (!rev || !cogs) return null;
      const gross = rev - cogs;
      const taxAmt = (gross - opex) * (tax / 100);
      const net = gross - opex - taxAmt;
      return { revenue: rev, cogs, opex, tax, grossProfit: gross, netProfit: net, grossMargin: (gross/rev)*100, netMargin: (net/rev)*100 };
    }
    case 'pricing': {
      const cost = +v('pr_cost'), markup = +v('pr_markup'), units = +v('pr_units') || 1;
      if (!cost || !markup) return null;
      const price = cost * (1 + markup / 100);
      return { cost, markup, price, unitProfit: price - cost, totalRev: price * units, totalProfit: (price - cost) * units };
    }
    case 'breakeven': {
      const fixed = +v('be_fixed'), varCost = +v('be_varCost'), price = +v('be_price'), sales = +v('be_sales');
      if (!fixed || !varCost || !price || price <= varCost) return null;
      const contrib = price - varCost;
      const units = fixed / contrib;
      return { fixed, varCost, price, sales, units, revenue: units * price, contribution: contrib, safety: ((sales - units) / sales) * 100, profit: (sales - units) * contrib };
    }
    case 'roi': {
      const invest = +v('roi_invest'), ret = +v('roi_return'), period = +v('roi_period') || 12, opCost = +v('roi_opCost') || 0;
      if (!invest || !ret) return null;
      const gain = ret - invest - opCost;
      const roi = (gain / invest) * 100;
      const annual = roi * (12 / period);
      return { invest, return: ret, period, opCost, gain, roi, annual, payback: invest / (gain / period) };
    }
    case 'cashflow': {
      const opening = +v('cf_opening') || 0, inflows = +v('cf_inflows') || 0, opex = +v('cf_opex') || 0, cogs = +v('cf_cogs') || 0, debt = +v('cf_debt') || 0, tax = +v('cf_tax') || 0;
      if (!inflows) return null;
      const outflows = opex + cogs + debt + tax;
      const net = inflows - outflows;
      const closing = opening + net;
      return { opening, inflows, outflows, net, closing, ratio: inflows > 0 ? inflows / outflows : 0 };
    }
    case 'forecast': {
      const rev = +v('fc_revenue'), growth = +v('fc_growth'), months = +v('fc_months') || 12, cost = +v('fc_cost') || 0;
      if (!rev) return null;
      let total = 0, cur = rev;
      for (let i = 0; i < months; i++) { total += cur; cur *= 1 + growth / 100; }
      const projected = rev * Math.pow(1 + growth / 100, months);
      const cagr = (Math.pow(projected / rev, 12 / months) - 1) * 100;
      return { revenue: rev, growth, months, cost, projected, total, profit: total - cost * months, cagr };
    }
    case 'product': {
      const price = +v('pp_price'), cost = +v('pp_cost'), units = +v('pp_units') || 0, overhead = +v('pp_overhead') || 0, shipping = +v('pp_shipping') || 0, returns = +v('pp_returns') || 0;
      if (!price || !cost) return null;
      const totalCost = cost + shipping;
      const returnedUnits = units * (returns / 100);
      const effectiveUnits = units - returnedUnits;
      const netProfit = (price - totalCost) * effectiveUnits - overhead;
      const margin = ((price - totalCost) / price) * 100;
      const be = overhead / (price - totalCost);
      return { price, cost, units, overhead, shipping, returns, netProfit, margin, be, unitProfit: price - totalCost };
    }
    case 'discount': {
      const original = +v('dc_original'), discount = +v('dc_discount'), cost = +v('dc_cost') || 0, units = +v('dc_units') || 1;
      if (!original || !discount) return null;
      const discountedPrice = original * (1 - discount / 100);
      const saving = original - discountedPrice;
      const unitProfit = discountedPrice - cost;
      return { original, discount, cost, units, discountedPrice, saving, unitProfit, totalRev: discountedPrice * units, totalProfit: unitProfit * units };
    }
    case 'goal': {
      const target = +v('gl_targetProfit'), price = +v('gl_price'), varCost = +v('gl_varCost'), fixed = +v('gl_fixed') || 0, months = +v('gl_months') || 1, marketing = +v('gl_marketing') || 0;
      if (!target || !price || !varCost) return null;
      const totalCosts = fixed + marketing;
      const units = (target + totalCosts) / (price - varCost);
      const revenue = units * price;
      const daily = units / (months * 30);
      return { target, price, varCost, fixed, months, marketing, units, revenue, daily, monthly: units / months };
    }
  }
  return null;
}

function v(id) { return document.getElementById(id)?.value || ''; }

// ── Calculator Functions ───────────────────────────────────────
function showResult(id) { document.getElementById(id).classList.add('show'); }
function hideResult(id) { document.getElementById(id).classList.remove('show'); }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setClass(id, cls) { const el = document.getElementById(id); if (el) el.className = 'value ' + cls; }

function showInsight(id, type, msg, icon = '💡') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `insight-box ${type} show`;
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
}
function hideInsight(id) { const el = document.getElementById(id); if (el) el.className = 'insight-box'; }

// PROFIT
function calcProfit() {
  const rev = parseFloat(v('p_revenue')), cogs = parseFloat(v('p_cogs'));
  const opex = parseFloat(v('p_opex')) || 0, tax = parseFloat(v('p_tax')) || 0;
  if (!rev || !cogs) { hideResult('profitResult'); return; }
  const gross = rev - cogs;
  const taxAmt = Math.max(0, (gross - opex) * (tax / 100));
  const net = gross - opex - taxAmt;
  const grossMargin = (gross / rev) * 100;
  const netMargin = (net / rev) * 100;
  const markup = ((rev - cogs) / cogs) * 100;

  setVal('p_grossProfit', formatCurrency(gross));
  setVal('p_netProfit', formatCurrency(net));
  setVal('p_grossMargin', formatPercent(grossMargin));
  setVal('p_netMargin', formatPercent(netMargin));
  setVal('p_markup', formatPercent(markup));

  const netEl = document.getElementById('p_netProfit');
  if (netEl) netEl.className = `value${net < 0 ? ' negative' : ''}`;

  showResult('profitResult');

  if (net < 0) showInsight('profitInsight', 'danger', 'You are operating at a loss. Increase revenue, reduce COGS, or cut operating expenses immediately.', '🚨');
  else if (netMargin < 10) showInsight('profitInsight', 'negative', 'Net margin is below 10%. Consider increasing your prices or reducing costs to improve profitability.', '⚠️');
  else if (netMargin >= 20) showInsight('profitInsight', 'positive', `Excellent! A ${formatPercent(netMargin)} net margin is above industry average. Keep optimizing!`, '🎉');
  else showInsight('profitInsight', 'positive', `Good profit margin. Focus on scaling revenue while keeping costs stable.`, '✅');
}

// PRICING
function calcPricing() {
  const cost = parseFloat(v('pr_cost')), markup = parseFloat(v('pr_markup'));
  const units = parseFloat(v('pr_units')) || 1;
  if (!cost || !markup) { hideResult('pricingResult'); return; }
  const price = cost * (1 + markup / 100);
  const unitProfit = price - cost;
  showResult('pricingResult');
  setVal('pr_price', formatCurrency(price));
  setVal('pr_unitProfit', formatCurrency(unitProfit));
  setVal('pr_totalRev', formatCurrency(price * units));
  setVal('pr_totalProfit', formatCurrency(unitProfit * units));
  const margin = (unitProfit / price) * 100;
  if (markup < 20) showInsight('pricingInsight', 'negative', 'Low markup. Consider whether this price covers all overheads and still yields acceptable profit.', '⚠️');
  else if (margin >= 40) showInsight('pricingInsight', 'positive', 'Strong pricing strategy. High margin gives room for discounts and promotions.', '✅');
  else hideInsight('pricingInsight');
}

function calcPricingFromMargin() {
  const cost = parseFloat(v('pr_cost')), margin = parseFloat(v('pr_margin'));
  if (!cost || !margin || margin >= 100) return;
  const price = cost / (1 - margin / 100);
  const calcMarkup = ((price - cost) / cost) * 100;
  document.getElementById('pr_markup').value = calcMarkup.toFixed(2);
  calcPricing();
}

// BREAK-EVEN
function calcBreakeven() {
  const fixed = parseFloat(v('be_fixed')), varCost = parseFloat(v('be_varCost'));
  const price = parseFloat(v('be_price')), sales = parseFloat(v('be_sales')) || 0;
  if (!fixed || !varCost || !price) { hideResult('breakevenResult'); return; }
  if (price <= varCost) { showInsight('breakevenInsight', 'danger', 'Selling price must be higher than variable cost to reach break-even.', '🚨'); return; }
  const contrib = price - varCost;
  const units = fixed / contrib;
  const revenue = units * price;
  const safety = sales > 0 ? ((sales - units) / sales) * 100 : 0;
  const profit = sales > 0 ? (sales - units) * contrib : 0;
  showResult('breakevenResult');
  setVal('be_units', formatNumber(units, 0) + ' units');
  setVal('be_revenue', formatCurrency(revenue));
  setVal('be_contribution', formatCurrency(contrib) + '/unit');
  setVal('be_safety', sales > 0 ? formatPercent(safety) : 'Enter expected sales');
  setVal('be_profit', sales > 0 ? formatCurrency(profit) : '—');
  if (sales > 0 && sales < units) showInsight('breakevenInsight', 'danger', `At ${sales} units, you won't cover fixed costs. Need ${Math.ceil(units)} units to break even. Reduce costs or increase price.`, '🚨');
  else if (sales > 0 && safety < 20) showInsight('breakevenInsight', 'negative', `Safety margin is only ${formatPercent(safety)}. Small sales drops could push you into loss.`, '⚠️');
  else if (sales > units) showInsight('breakevenInsight', 'positive', `You're ${formatNumber(sales - units, 0)} units above break-even. Great position!`, '✅');
  else hideInsight('breakevenInsight');
}

// ROI
function calcROI() {
  const invest = parseFloat(v('roi_invest')), ret = parseFloat(v('roi_return'));
  const period = parseFloat(v('roi_period')) || 12, opCost = parseFloat(v('roi_opCost')) || 0;
  if (!invest || !ret) { hideResult('roiResult'); return; }
  const gain = ret - invest - opCost;
  const roi = (gain / invest) * 100;
  const annual = roi * (12 / period);
  const payback = gain > 0 ? invest / (gain / period) : Infinity;
  showResult('roiResult');
  setVal('roi_roi', formatPercent(roi));
  setVal('roi_gain', formatCurrency(gain));
  setVal('roi_annual', formatPercent(annual));
  setVal('roi_payback', isFinite(payback) ? formatNumber(payback, 1) + ' months' : 'Never');
  document.getElementById('roi_gain').className = `value${gain < 0 ? ' negative' : ''}`;
  if (roi < 0) showInsight('roiInsight', 'danger', 'Negative ROI — this investment is losing money. Re-evaluate your marketing strategy and cost structure.', '🚨');
  else if (roi < 10) showInsight('roiInsight', 'negative', 'ROI below 10%. Optimize marketing spend, improve conversion rates, or explore higher-margin revenue streams.', '⚠️');
  else if (roi >= 30) showInsight('roiInsight', 'positive', `${formatPercent(roi)} ROI is excellent! Consider scaling this investment to maximize returns.`, '🚀');
  else showInsight('roiInsight', 'positive', 'Healthy ROI. Focus on maintaining efficiency as you scale.', '✅');
}

// CASH FLOW
function calcCashFlow() {
  const opening = parseFloat(v('cf_opening')) || 0, inflows = parseFloat(v('cf_inflows')) || 0;
  const opex = parseFloat(v('cf_opex')) || 0, cogs = parseFloat(v('cf_cogs')) || 0;
  const debt = parseFloat(v('cf_debt')) || 0, tax = parseFloat(v('cf_tax')) || 0;
  if (!inflows) { hideResult('cashflowResult'); return; }
  const outflows = opex + cogs + debt + tax;
  const net = inflows - outflows;
  const closing = opening + net;
  const ratio = outflows > 0 ? inflows / outflows : 0;
  showResult('cashflowResult');
  setVal('cf_closing', formatCurrency(closing));
  setVal('cf_net', formatCurrency(net));
  setVal('cf_outflows', formatCurrency(outflows));
  setVal('cf_ratio', formatNumber(ratio, 2) + 'x');
  document.getElementById('cf_net').className = `value${net < 0 ? ' negative' : ''}`;
  document.getElementById('cf_closing').className = `value${closing < 0 ? ' negative' : ''}`;
  if (net < 0) showInsight('cashflowInsight', 'danger', 'Negative cash flow detected. Reduce expenses or accelerate collections to avoid cash shortfall.', '🚨');
  else if (ratio < 1.2) showInsight('cashflowInsight', 'negative', 'Cash flow ratio is low. Aim for at least 1.5x to maintain healthy operations.', '⚠️');
  else showInsight('cashflowInsight', 'positive', `Cash flow ratio of ${formatNumber(ratio, 2)}x is healthy. Maintain discipline on spending.`, '✅');
}

// FORECAST
function calcForecast() {
  const rev = parseFloat(v('fc_revenue')), growth = parseFloat(v('fc_growth')) || 0;
  const months = parseInt(v('fc_months')) || 12, cost = parseFloat(v('fc_cost')) || 0;
  if (!rev) { hideResult('forecastResult'); return; }
  let total = 0, cur = rev;
  for (let i = 0; i < months; i++) { total += cur; cur *= (1 + growth / 100); }
  const projected = rev * Math.pow(1 + growth / 100, months);
  const cagr = months >= 12 ? ((Math.pow(projected / rev, 12 / months) - 1) * 100) : growth;
  const profit = total - cost * months;
  showResult('forecastResult');
  setVal('fc_projected', formatCurrency(projected));
  setVal('fc_total', formatCurrency(total));
  setVal('fc_profit', formatCurrency(profit));
  setVal('fc_cagr', formatPercent(cagr));
  if (growth < 0) showInsight('forecastInsight', 'danger', 'Declining revenue trend. Investigate churn, market conditions, and adjust strategy.', '🚨');
  else if (growth < 3) showInsight('forecastInsight', 'negative', 'Slow growth rate. Explore new markets, product expansion, or improved marketing.', '⚠️');
  else if (growth >= 10) showInsight('forecastInsight', 'positive', `${formatPercent(growth)} monthly growth is strong. Ensure operations can scale to meet demand.`, '🚀');
  else showInsight('forecastInsight', 'positive', 'Steady growth. Stay consistent with your current strategy.', '✅');
}

// PRODUCT
function calcProduct() {
  const price = parseFloat(v('pp_price')), cost = parseFloat(v('pp_cost'));
  const units = parseFloat(v('pp_units')) || 0, overhead = parseFloat(v('pp_overhead')) || 0;
  const shipping = parseFloat(v('pp_shipping')) || 0, returns = parseFloat(v('pp_returns')) || 0;
  if (!price || !cost) { hideResult('productResult'); return; }
  const totalCost = cost + shipping;
  const returnedUnits = units * (returns / 100);
  const effectiveUnits = units - returnedUnits;
  const netProfit = (price - totalCost) * effectiveUnits - overhead;
  const margin = ((price - totalCost) / price) * 100;
  const be = overhead > 0 ? overhead / (price - totalCost) : 0;
  showResult('productResult');
  setVal('pp_netProfit', formatCurrency(netProfit));
  setVal('pp_margin', formatPercent(margin));
  setVal('pp_be', overhead > 0 ? formatNumber(be, 0) + ' units' : 'N/A');
  setVal('pp_unitProfit', formatCurrency(price - totalCost));
  document.getElementById('pp_netProfit').className = `value${netProfit < 0 ? ' negative' : ''}`;
  if (margin < 15) showInsight('productInsight', 'negative', 'Thin margin. Renegotiate supplier costs or increase selling price.', '⚠️');
  else if (margin >= 40) showInsight('productInsight', 'positive', 'Excellent product margin. This is a strong SKU — consider promoting it more.', '🏆');
  else hideInsight('productInsight');
}

// DISCOUNT
function calcDiscount() {
  const original = parseFloat(v('dc_original')), discount = parseFloat(v('dc_discount'));
  const cost = parseFloat(v('dc_cost')) || 0, units = parseFloat(v('dc_units')) || 1;
  if (!original || !discount) { hideResult('discountResult'); return; }
  const discountedPrice = original * (1 - discount / 100);
  const saving = original - discountedPrice;
  const unitProfit = discountedPrice - cost;
  showResult('discountResult');
  setVal('dc_price', formatCurrency(discountedPrice));
  setVal('dc_saving', formatCurrency(saving));
  setVal('dc_unitProfit', formatCurrency(unitProfit));
  setVal('dc_totalRev', formatCurrency(discountedPrice * units));
  setVal('dc_totalProfit', formatCurrency(unitProfit * units));
  document.getElementById('dc_unitProfit').className = `value${unitProfit < 0 ? ' negative' : ''}`;
  if (unitProfit < 0) showInsight('discountInsight', 'danger', 'Selling below cost! Reduce the discount or increase the base price before applying discounts.', '🚨');
  else if (discount > 40) showInsight('discountInsight', 'negative', 'High discount may attract price-sensitive customers and erode brand value long-term.', '⚠️');
  else showInsight('discountInsight', 'positive', 'Discount is within a healthy range. Monitor conversion rates vs. margin impact.', '✅');
}

// GOAL
function calcGoal() {
  const target = parseFloat(v('gl_targetProfit')), price = parseFloat(v('gl_price'));
  const varCost = parseFloat(v('gl_varCost')), fixed = parseFloat(v('gl_fixed')) || 0;
  const months = parseInt(v('gl_months')) || 1, marketing = parseFloat(v('gl_marketing')) || 0;
  if (!target || !price || !varCost || price <= varCost) { hideResult('goalResult'); return; }
  const totalCosts = fixed + marketing;
  const units = (target + totalCosts) / (price - varCost);
  const revenue = units * price;
  const daily = units / (months * 30);
  const monthly = units / months;
  showResult('goalResult');
  setVal('gl_units', formatNumber(units, 0) + ' units');
  setVal('gl_revenue', formatCurrency(revenue));
  setVal('gl_daily', formatNumber(daily, 1) + ' units/day');
  setVal('gl_monthly', formatNumber(monthly, 0) + ' units/month');
  if (daily > 100) showInsight('goalInsight', 'negative', 'Daily target is ambitious. Consider extending your timeline or increasing margins.', '⚠️');
  else showInsight('goalInsight', 'positive', `To hit your goal, aim for ${formatNumber(daily, 1)} units/day. Break this into weekly targets for easy tracking.`, '🎯');
}

// ── Clear Calculator ───────────────────────────────────────────
function clearCalc(type) {
  const prefixes = {
    profit: ['p_revenue','p_cogs','p_opex','p_tax'],
    pricing: ['pr_cost','pr_markup','pr_margin','pr_units'],
    breakeven: ['be_fixed','be_varCost','be_price','be_sales'],
    roi: ['roi_invest','roi_return','roi_period','roi_opCost'],
    cashflow: ['cf_opening','cf_inflows','cf_opex','cf_cogs','cf_debt','cf_tax'],
    forecast: ['fc_revenue','fc_growth','fc_months','fc_cost'],
    product: ['pp_price','pp_cost','pp_units','pp_overhead','pp_shipping','pp_returns'],
    discount: ['dc_original','dc_discount','dc_cost','dc_units'],
    goal: ['gl_targetProfit','gl_price','gl_varCost','gl_fixed','gl_months','gl_marketing']
  };
  (prefixes[type] || []).forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  hideResult(type + 'Result');
  hideInsight(type + 'Insight');
}

// ── Calc Tab Switch ────────────────────────────────────────────
function switchCalc(id, tabEl) {
  document.querySelectorAll('.calc-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('calc-' + id);
  if (panel) panel.classList.add('active');
  if (tabEl) tabEl.classList.add('active');
  else {
    // find tab by onclick containing the id
    document.querySelectorAll('.calc-tab').forEach(t => {
      if (t.getAttribute('onclick')?.includes(`'${id}'`)) t.classList.add('active');
    });
  }
}

// ── Charts ─────────────────────────────────────────────────────
let charts = {};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function getChartColors() {
  const dark = getTheme() === 'dark';
  return {
    grid: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    text: dark ? '#8faa8f' : '#6a886a',
    green: '#4a9a4a',
    greenLight: 'rgba(74,154,74,0.15)',
    pink: '#e8a0b0',
    pinkLight: 'rgba(232,160,176,0.15)',
  };
}

function renderCharts() {
  const calcs = getUserCalcs();
  const c = getChartColors();

  // Profit Trend
  destroyChart('profitChart');
  const profitData = calcs.filter(x => x.type === 'profit' || x.type === 'product')
    .slice(-10)
    .map(x => ({ x: formatDate(x.timestamp).split(',')[0], y: x.data.netProfit ?? x.data.profit ?? 0 }));

  const profitCtx = document.getElementById('profitChart');
  if (profitCtx && profitData.length > 0) {
    charts.profitChart = new Chart(profitCtx, {
      type: 'line',
      data: {
        labels: profitData.map(d => d.x),
        datasets: [{
          label: 'Net Profit', data: profitData.map(d => d.y),
          borderColor: c.green, backgroundColor: c.greenLight,
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: c.green,
        }]
      },
      options: chartOptions(c, 'Profit ($)')
    });
  } else if (profitCtx) {
    renderEmptyChart(profitCtx, c);
  }

  // Revenue vs Expenses
  destroyChart('revenueChart');
  const cfData = calcs.filter(x => x.type === 'cashflow').slice(-8);
  const revCtx = document.getElementById('revenueChart');
  if (revCtx && cfData.length > 0) {
    charts.revenueChart = new Chart(revCtx, {
      type: 'bar',
      data: {
        labels: cfData.map(x => formatDate(x.timestamp).split(',')[0]),
        datasets: [
          { label: 'Revenue', data: cfData.map(x => x.data.inflows), backgroundColor: c.green },
          { label: 'Expenses', data: cfData.map(x => x.data.outflows), backgroundColor: c.pink }
        ]
      },
      options: chartOptions(c, 'Amount ($)', true)
    });
  } else if (revCtx) {
    renderEmptyChart(revCtx, c);
  }

  // ROI Chart
  destroyChart('roiChart');
  const roiData = calcs.filter(x => x.type === 'roi').slice(-8);
  const roiCtx = document.getElementById('roiChart');
  if (roiCtx && roiData.length > 0) {
    charts.roiChart = new Chart(roiCtx, {
      type: 'line',
      data: {
        labels: roiData.map(x => formatDate(x.timestamp).split(',')[0]),
        datasets: [{
          label: 'ROI %', data: roiData.map(x => x.data.roi),
          borderColor: '#e8a0b0', backgroundColor: c.pinkLight,
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#e8a0b0',
        }]
      },
      options: chartOptions(c, 'ROI (%)')
    });
  } else if (roiCtx) {
    renderEmptyChart(roiCtx, c);
  }
}

function renderEmptyChart(ctx, c) {
  new Chart(ctx, {
    type: 'line',
    data: { labels: ['No data'], datasets: [{ data: [0], borderColor: c.green }] },
    options: { ...chartOptions(c), plugins: { legend: { display: false }, tooltip: { enabled: false } } }
  });
}

function chartOptions(c, yLabel = '', grouped = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: c.text, font: { family: 'DM Sans, sans-serif', size: 11 } } }
    },
    scales: {
      x: { ticks: { color: c.text, font: { size: 10 } }, grid: { color: c.grid } },
      y: { ticks: { color: c.text, font: { size: 10 } }, grid: { color: c.grid }, title: { display: !!yLabel, text: yLabel, color: c.text } }
    }
  };
}

// ── Full History ───────────────────────────────────────────────
function renderFullHistory() {
  const calcs = getUserCalcs().reverse();
  const container = document.getElementById('fullHistory');
  const clearBtn = document.getElementById('clearHistoryBtn');
  if (clearBtn) clearBtn.style.display = calcs.length > 0 ? 'flex' : 'none';

  if (calcs.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <p>No saved calculations yet.</p>
    </div>`;
    return;
  }

  container.innerHTML = calcs.map((c, i) => {
    const val = getPrimaryValue(c);
    const isNeg = val && val.includes('-');
    return `<div class="history-item" style="animation-delay:${i * 0.04}s">
      <div class="history-icon">${calcEmojis[c.type] || '📊'}</div>
      <div class="history-info">
        <div class="h-type">${calcLabels[c.type] || c.type}</div>
        <div class="h-date">${formatDate(c.timestamp)}</div>
      </div>
      <div class="history-value ${isNeg ? 'neg' : ''}">${val}</div>
    </div>`;
  }).join('');
}

function clearHistory() {
  if (!confirm('Clear all saved calculations? This cannot be undone.')) return;
  saveUserCalcs([]);
  renderFullHistory();
  renderOverviewStats();
  showToast('History cleared.', 'info');
}

// ── Smart Insights ─────────────────────────────────────────────
function renderInsights() {
  const calcs = getUserCalcs();
  const container = document.getElementById('smartInsightsContainer');
  const insights = [];

  if (calcs.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg>
      <p>Save some calculations to generate smart insights.</p>
    </div>`;
    document.getElementById('healthScoreVal').textContent = '—';
    document.getElementById('healthScoreLabel').textContent = 'Save some calculations to see your score';
    return;
  }

  // Profit insights
  const profitCalcs = calcs.filter(c => c.type === 'profit');
  if (profitCalcs.length > 0) {
    const avgMargin = profitCalcs.reduce((s, c) => s + (c.data.netMargin || 0), 0) / profitCalcs.length;
    if (avgMargin < 10) insights.push({ icon: '📉', title: 'Low Profit Margin', msg: `Average margin is ${formatPercent(avgMargin)}. Increase prices or reduce operating costs.`, type: 'negative' });
    else if (avgMargin >= 20) insights.push({ icon: '💪', title: 'Strong Profit Margin', msg: `Avg margin of ${formatPercent(avgMargin)} is excellent. Focus on scaling volume.`, type: 'positive' });
  }

  // Cash flow insights
  const cfCalcs = calcs.filter(c => c.type === 'cashflow');
  if (cfCalcs.length > 0) {
    const lastCF = cfCalcs[cfCalcs.length - 1];
    if (lastCF.data.net < 0) insights.push({ icon: '💸', title: 'Negative Cash Flow', msg: 'Your latest period shows negative cash flow. Reduce discretionary expenses and tighten payment terms.', type: 'danger' });
    else insights.push({ icon: '✅', title: 'Positive Cash Flow', msg: `You have ${formatCurrency(lastCF.data.net)} net inflow. Consider allocating surplus to growth or emergency reserves.`, type: 'positive' });
  }

  // ROI insights
  const roiCalcs = calcs.filter(c => c.type === 'roi');
  if (roiCalcs.length > 0) {
    const avgROI = roiCalcs.reduce((s, c) => s + (c.data.roi || 0), 0) / roiCalcs.length;
    if (avgROI < 0) insights.push({ icon: '🚨', title: 'Negative ROI', msg: 'Investments are not generating returns. Audit your marketing spend and eliminate underperforming channels.', type: 'danger' });
    else if (avgROI < 15) insights.push({ icon: '🎯', title: 'Optimize Marketing Strategy', msg: `Average ROI of ${formatPercent(avgROI)} is below benchmark. Test new acquisition channels and optimize conversion.`, type: 'negative' });
    else insights.push({ icon: '🚀', title: 'Healthy ROI', msg: `${formatPercent(avgROI)} average ROI. Consider increasing investment in top-performing channels.`, type: 'positive' });
  }

  // Break-even insights
  const beCalcs = calcs.filter(c => c.type === 'breakeven');
  if (beCalcs.length > 0) {
    const last = beCalcs[beCalcs.length - 1];
    if (last.data.safety < 20) insights.push({ icon: '⚠️', title: 'Low Safety Margin', msg: `Safety margin of ${formatPercent(last.data.safety)} means a small sales dip puts you in the red. Reduce fixed costs.`, type: 'negative' });
  }

  // General tips if few insights
  if (insights.length < 3) {
    insights.push({ icon: '📊', title: 'Track Regularly', msg: 'Run calculations monthly to spot trends early and adapt before small issues become big problems.', type: 'info' });
    insights.push({ icon: '🏆', title: 'Set Clear Goals', msg: 'Use the Goal Calculator to reverse-engineer your sales targets from desired profit outcomes.', type: 'info' });
  }

  const typeClass = { positive: 'positive', negative: 'warning', danger: 'danger', info: '' };
  const bgColors = {
    positive: 'rgba(74,154,74,0.06)', negative: 'rgba(249,115,22,0.06)',
    danger: 'rgba(220,38,38,0.06)', info: 'rgba(37,99,235,0.06)'
  };

  container.innerHTML = insights.map(ins => `
    <div class="insight-card" style="background:${bgColors[ins.type] || 'var(--glass-bg)'}">
      <div class="insight-card-icon">${ins.icon}</div>
      <div class="insight-card-text">
        <strong>${ins.title}</strong>
        <span>${ins.msg}</span>
      </div>
    </div>`).join('');

  // Health Score
  const posCount = insights.filter(i => i.type === 'positive').length;
  const dangerCount = insights.filter(i => i.type === 'danger').length;
  const negCount = insights.filter(i => i.type === 'negative').length;
  const scoreCalc = Math.max(10, Math.min(100, 100 - dangerCount * 30 - negCount * 15 + posCount * 10));
  document.getElementById('healthScoreVal').textContent = scoreCalc + '/100';
  document.getElementById('healthScoreLabel').textContent = scoreCalc >= 70 ? '🏆 Excellent business health!' : scoreCalc >= 50 ? '📈 Room for improvement' : '⚠️ Needs attention';
}

// ── Toast Notifications ─────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="dot"></span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
