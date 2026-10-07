/* ================================================================== */
/*  Critical Shot — manage packages (admin)                           */
/*  GET /api/packages, DELETE /api/packages/:id, PDF download         */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = { packages: [], loading: false };

  function itemsHtml(p) {
    const ai = p.additionalItems;
    const rows = [];
    if (ai) {
      if (ai.editedImages) rows.push('<li><b>Edited Images:</b> ' + CS.esc(ai.editedImages) + '</li>');
      if (ai.uneditedImages) rows.push('<li><b>Unedited Images:</b> ' + CS.esc(ai.uneditedImages) + '</li>');
      (ai.albums || []).forEach(function (a) { rows.push('<li><b>Album:</b> ' + CS.esc(a.size) + ' ' + CS.esc(a.type) + ' (Spread Count: ' + CS.esc(a.spreadCount) + ')</li>'); });
      (ai.framedPortraits || []).forEach(function (fp) { rows.push('<li><b>Framed Portrait:</b> ' + CS.esc(fp.size) + ' (Quantity: ' + CS.esc(fp.quantity) + ')</li>'); });
      if (ai.thankYouCards) rows.push('<li><b>Thank You Cards:</b> ' + CS.esc(ai.thankYouCards) + '</li>');
    }
    return rows.length
      ? '<div style="margin-top:.75rem"><p style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 .4rem">Additional Items</p><ul style="display:grid;gap:.35rem;font-size:.82rem;color:#4b5563">' + rows.join('') + '</ul></div>'
      : '';
  }

  function card(p) {
    return '<div class="pa-card" data-id="' + CS.esc(p.id) + '" style="background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;box-shadow:0 1px 2px rgba(0,0,0,.05);display:flex;flex-direction:column">' +
      '<div style="padding:1.25rem 1.25rem .5rem;display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem">' +
        '<div>' +
          '<h2 style="font-size:1.08rem;font-weight:700;color:#111827;margin:0 0 .25rem">' + CS.esc(p.name) + '</h2>' +
          '<span style="display:inline-block;padding:.2rem .6rem;border-radius:9999px;font-size:.72rem;font-weight:600;color:#2563eb;background:#dbeafe">' + CS.esc(p.packageType || 'Standard') + '</span>' +
        '</div>' +
        '<p style="font-size:1.15rem;font-weight:800;color:#111827;margin:0">' + 'Le ' + Number(p.investment || 0).toLocaleString() + '</p>' +
      '</div>' +
      '<div style="padding:0 1.25rem 1.1rem">' +
        '<div style="margin-top:.6rem"><p style="font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 .4rem">Services Included</p>' +
          '<ul style="display:grid;gap:.35rem;font-size:.85rem;color:#4b5563">' +
            (p.servicesIncluded || []).map(function (s) { return '<li style="list-style:none;padding-left:1rem;position:relative"><span style="position:absolute;left:0">&bull;</span>' + CS.esc(s) + '</li>'; }).join('') +
          '</ul>' +
        '</div>' +
        itemsHtml(p) +
      '</div>' +
      '<div style="margin-top:auto;display:flex;gap:.5rem;padding:.85rem 1.25rem 1.25rem">' +
        '<a class="btn btn-outline btn-sm" href="packages-edit.html?id=' + encodeURIComponent(p.id) + '" style="flex:1;text-align:center">Edit</a>' +
        '<button class="btn btn-outline btn-sm" data-act="pdf" style="flex:1">Download PDF</button>' +
        '<button class="btn btn-danger-light btn-sm" data-act="delete" style="flex:1">Delete</button>' +
      '</div>' +
    '</div>';
  }

  function render() {
    const mount = document.getElementById('pa-mount');
    if (state.loading && !state.packages.length) {
      mount.innerHTML = '<div class="loading-block"><span class="spinner spinner-dark"></span> Loading packages...</div>';
      return;
    }
    if (!state.packages.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">No packages available.</div>';
      return;
    }
    mount.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem">' + state.packages.map(card).join('') + '</div>';
    mount.querySelectorAll('[data-act="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.closest('.pa-card').dataset.id;
        btn.textContent = 'Deleting...';
        btn.disabled = true;
        CS.api.del('/api/packages/' + encodeURIComponent(id))
          .then(function () {
            state.packages = state.packages.filter(function (p) { return String(p.id) !== id; });
            render();
            CS.toast('Package deleted successfully', 'success');
          })
          .catch(function () {
            btn.textContent = 'Delete';
            btn.disabled = false;
            CS.toast('Failed to delete package', 'error');
          });
      });
    });
    mount.querySelectorAll('[data-act="pdf"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const p = state.packages.find(function (x) { return String(x.id) === btn.closest('.pa-card').dataset.id; });
        if (p) downloadPdf(p);
      });
    });
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
      y += 26;
      pdf.text('Package Type: ' + (pkg.packageType || ''), x, y, { size: 12, color: [107, 114, 128] });
      pdf.text('Le ' + Number(pkg.investment || 0).toLocaleString(), pageW - 40, y, {
        size: 20, bold: true, align: 'right', color: [79, 70, 229]
      });
      y += 46;
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
      pdf.rect(0, pdf.height - 40, pageW, 34, [38, 38, 40]);
      pdf.text('Contact: info@photostudio.com | +94 77 123 4567 | www.photostudio.com', 195, pdf.height - 18, { size: 9, align: 'center', color: [255, 255, 255] });
      pdf.text('Capturing Moments, Creating Memories', 195, pdf.height - 30, { size: 8, align: 'center', color: [156, 163, 175] });
      pdf.save();
    } catch (e) {
      CS.toast('Failed to generate PDF', 'error');
    }
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    state.loading = true;
    render();
    CS.api.get('/api/packages')
      .then(function (data) { state.packages = Array.isArray(data) ? data : []; })
      .catch(function () { state.packages = []; CS.toast('Failed to load packages', 'error'); })
      .finally(function () { state.loading = false; render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();