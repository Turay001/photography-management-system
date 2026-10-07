/* ================================================================== */
/*  Critical Shot — packages (customer browsing)                      */
/*  GET /api/packages, wishlist hearts, PDF download, assistant    */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = { packages: [], search: '', minPrice: '', maxPrice: '', loading: false };

  function additionalItemsHtml(p) {
    const ai = p.additionalItems;
    if (!ai) return '';
    const rows = [];
    if (ai.editedImages) rows.push('<li><span style="color:#111827;font-weight:600">Edited Images — </span>' + CS.esc(ai.editedImages) + '</li>');
    if (ai.uneditedImages) rows.push('<li><span style="color:#111827;font-weight:600">Unedited Images — </span>' + CS.esc(ai.uneditedImages) + '</li>');
    if (ai.thankYouCards) rows.push('<li><span style="color:#111827;font-weight:600">Thank You Cards — </span>' + CS.esc(ai.thankYouCards) + '</li>');
    (ai.albums || []).forEach(function (a) {
      rows.push('<li><span style="color:#111827;font-weight:600">Album: </span>' + CS.esc(a.size) + ', ' + CS.esc(a.type) + ', ' + CS.esc(a.spreadCount) + ' spreads</li>');
    });
    (ai.framedPortraits || []).forEach(function (fp) {
      rows.push('<li><span style="color:#111827;font-weight:600">Framed Portrait: </span>' + CS.esc(fp.size) + ', Quantity: ' + CS.esc(fp.quantity) + '</li>');
    });
    return rows.length ? '<div><p style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:1rem 0 .4rem">Additional Items</p><ul style="display:grid;gap:.35rem;font-size:.85rem;color:#4b5563">' + rows.join('') + '</ul></div>' : '';
  }

  function wishItem(p) {
    return { packageId: p.id, packageType: p.packageType || 'standard', packageName: p.name, price: p.investment, imageUrl: p.image || '' };
  }

  function card(p) {
    return '<div class="pk-card" data-id="' + CS.esc(p.id) + '" style="background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;box-shadow:0 1px 2px rgba(0,0,0,.05);display:flex;flex-direction:column">' +
      '<div style="padding:1.25rem 1.25rem .75rem;display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem">' +
        '<div>' +
          '<h2 style="font-size:1.1rem;font-weight:700;color:#111827;margin:0 0 .25rem">' + CS.esc(p.name) + '</h2>' +
          '<span style="display:inline-block;padding:.2rem .6rem;border-radius:9999px;font-size:.72rem;font-weight:600;color:#6d28d9;background:#ede9fe">' + CS.esc(p.packageType || 'Standard') + '</span>' +
        '</div>' +
        CS.wishButton(Object.assign({}, wishItem(p))) +
      '</div>' +
      '<div style="padding:0 1.25rem">' +
        '<div style="margin:.5rem 0 1rem;padding:.9rem 1.1rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:.6rem;color:#fff">' +
          '<p style="font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;opacity:.85;margin:0 0 .2rem">Investment</p>' +
          '<p style="font-size:1.5rem;font-weight:800;margin:0">' + 'Le ' + Number(p.investment || 0).toLocaleString() + '</p>' +
        '</div>' +
        '<div><p style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 .4rem">Services Included</p>' +
          '<ul style="display:grid;gap:.4rem;font-size:.85rem;color:#4b5563">' +
            (p.servicesIncluded || []).map(function (s) {
              return '<li style="display:flex;align-items:flex-start;gap:.45rem"><span style="display:inline-flex;height:1.15rem;width:1.15rem;flex-shrink:0;align-items:center;justify-content:center;border-radius:9999px;background:#dcfce7;color:#16a34a;font-size:.7rem">&#10003;</span>' + CS.esc(s) + '</li>';
            }).join('') +
          '</ul>' +
        '</div>' +
        additionalItemsHtml(p) +
      '</div>' +
      '<div style="margin-top:auto;display:flex;gap:.5rem;padding:1.1rem 1.25rem 1.25rem">' +
        '<a class="btn btn-amber" style="flex:1;justify-content:center;border-radius:9999px;padding:.7rem .5rem;font-size:.85rem" href="bookings-create.html?packageName=' + encodeURIComponent(p.name) + '">Book Now</a>' +
        '<a class="btn btn-outline" style="flex:1;justify-content:center;border-radius:9999px;padding:.7rem .5rem;font-size:.85rem" href="packages-customize.html?id=' + encodeURIComponent(p.id) + '">Customize</a>' +
        '<button class="btn btn-outline" data-act="pdf" title="Download PDF" style="width:2.6rem;padding:0;justify-content:center;border-radius:9999px">' + CS.icon('download', 'h-5 w-5') + '</button>' +
      '</div>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('pk-mount');
    if (state.loading && !state.packages.length) {
      mount.innerHTML = '<div class="loading-block"><span class="spinner spinner-dark"></span> Loading packages...</div>';
      return;
    }
    const q = state.search.trim().toLowerCase();
    const min = parseFloat(state.minPrice);
    const max = parseFloat(state.maxPrice);
    const list = state.packages.filter(function (p) {
      if (q && !String(p.name || '').toLowerCase().includes(q)) return false;
      if (!isNaN(min) && Number(p.investment) < min) return false;
      if (!isNaN(max) && Number(p.investment) > max) return false;
      return true;
    });
    if (!list.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">' +
        (state.packages.length ? 'No packages match your filters.' : 'No packages available yet. Check back soon!') +
      '</div>';
      return;
    }
    mount.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem">' + list.map(card).join('') + '</div>';
    mount.querySelectorAll('[data-act="pdf"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const p = state.packages.find(function (x) { return String(x.id) === btn.closest('.pk-card').dataset.id; });
        if (p) downloadPdf(p);
      });
    });
  }

  function footerBar(pdf, y) {
    pdf.rect(0, y, pdf.width, 34, [38, 38, 40]);
    pdf.text('Contact: info@photostudio.com | +94 77 123 4567 | www.photostudio.com', 195, y + 22, { size: 9, align: 'center', color: [255, 255, 255] });
    pdf.text('Capturing Moments, Creating Memories', 195, y + 10, { size: 8, align: 'center', color: [156, 163, 175] });
  }

  function downloadPdf(pkg) {
    try {
      const pdf = CS.pdf.create((pkg.name || 'custom-package') + '.pdf');
      const pageW = pdf.width;
      const x = 40;
      pdf.rect(0, 60, pageW, 120, [38, 38, 40]);
      pdf.text('PhotoStudio', 40, 115, { size: 20, bold: true, color: [255, 255, 255] });
      pdf.text('Package Details', 40, 96, { size: 10, color: [156, 163, 175] });
      let y = 220;
      pdf.text(pkg.name || 'Package', x, y, { size: 24, bold: true });
      y += 24;
      pdf.text('Package Type: ' + (pkg.packageType || ''), x, y, { size: 12, color: [107, 114, 128] });
      pdf.text('Le ' + Number(pkg.investment || 0).toLocaleString(), pageW - 40, y, {
        size: 20, bold: true, align: 'right', color: [79, 70, 229]
      });
      y += 44;
      pdf.line(x, y, pageW - 40, y);
      y += 26;
      pdf.text('Services Included', x, y, { size: 15, bold: true });
      y += 22;
      (pkg.servicesIncluded || []).forEach(function (s) {
        pdf.text('\u2022 ' + s, x + 12, y, { size: 11 });
        y += 18;
      });
      const ai = pkg.additionalItems;
      if (ai) {
        y += 10;
        pdf.text('Additional Items', x, y, { size: 15, bold: true });
        y += 22;
        const lines = [];
        if (ai.editedImages) lines.push('Edited Images: ' + ai.editedImages);
        if (ai.uneditedImages) lines.push('Unedited Images: ' + ai.uneditedImages);
        (ai.albums || []).forEach(function (a) { lines.push('Album: ' + a.size + ' ' + a.type + ' (Spread Count: ' + a.spreadCount + ')'); });
        (ai.framedPortraits || []).forEach(function (fp) { lines.push('Framed Portrait: ' + fp.size + ' (Quantity: ' + fp.quantity + ')'); });
        if (ai.thankYouCards) lines.push('Thank You Cards: ' + ai.thankYouCards);
        lines.forEach(function (l) {
          pdf.text('\u2022 ' + l, x + 12, y, { size: 11 });
          y += 18;
        });
      }
      footerBar(pdf, pdf.height - 40);
      pdf.save();
    } catch (e) {
      CS.toast('Failed to generate PDF', 'error');
    }
  }

  function load() {
    document.getElementById('pk-search').addEventListener('input', function (e) { state.search = e.target.value; render(); });
    document.getElementById('pk-min').addEventListener('input', function (e) { state.minPrice = e.target.value; render(); });
    document.getElementById('pk-max').addEventListener('input', function (e) { state.maxPrice = e.target.value; render(); });

    if (window.CS && typeof CS.Assistant === 'function' && !new URLSearchParams(window.location.search).get('no-ai')) {
      new CS.Assistant('#ai-mount', { packages: state.packages });
    }

    state.loading = true;
    render();
    CS.api.get('/api/packages')
      .then(function (data) {
        state.packages = Array.isArray(data) ? data : [];
      })
      .catch(function () { state.packages = []; CS.toast('Failed to load packages', 'error'); })
      .finally(function () { state.loading = false; render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();