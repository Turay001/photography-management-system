/* ================================================================== */
/*  Critical Shot — customize package (customer)                      */
/*  GET /api/packages/:id, client-side addon pricing, PDF quote       */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const id = CS.qs('id');

  const ADDONS = [
    { name: 'Drone Photography', price: 15000 },
    { name: 'Same Day Edit', price: 25000 },
    { name: 'Extended Hours (per hour)', price: 10000 },
    { name: 'Additional Photographer', price: 20000 },
    { name: 'Photo Booth', price: 15000 },
    { name: 'Live Streaming', price: 30000 }
  ];

  let pkg = null;
  let selected = {};

  function itemsRows(p) {
    const ai = p.additionalItems;
    const rows = [];
    if (ai) {
      rows.push('<tr><td>Edited Images</td><td>' + CS.esc(ai.editedImages || 'N/A') + '</td></tr>');
      rows.push('<tr><td>Unedited Images</td><td>' + CS.esc(ai.uneditedImages || 'N/A') + '</td></tr>');
      (ai.albums || []).forEach(function (a) {
        rows.push('<tr><td>Album</td><td>' + CS.esc(a.size) + ' ' + CS.esc(a.type) + ' (' + CS.esc(a.spreadCount) + ' spreads)</td></tr>');
      });
      (ai.framedPortraits || []).forEach(function (fp) {
        rows.push('<tr><td>Framed Portrait</td><td>' + CS.esc(fp.size) + ' (Quantity: ' + CS.esc(fp.quantity) + ')</td></tr>');
      });
      rows.push('<tr><td>Thank You Cards</td><td>' + CS.esc(ai.thankYouCards) + '</td></tr>');
    }
    return rows.join('');
  }

  function total() {
    let t = Number(pkg.investment || 0);
    ADDONS.forEach(function (a) { if (selected[a.name]) t += a.price; });
    return t;
  }

  function render() {
    document.getElementById('cu-name').textContent = pkg.name + ' - Customize';
    document.getElementById('cu-base').textContent = 'Base Price: Le ' + Number(pkg.investment || 0).toLocaleString();
    const mount = document.getElementById('cu-mount');

    mount.innerHTML =
      '<div class="card" style="padding:1.5rem 1.75rem;margin-bottom:1.5rem">' +
        '<h3 style="font-size:1.05rem;font-weight:700;color:#111827;margin:0 0 .75rem">Base Services Included</h3>' +
        '<ul style="display:grid;gap:.5rem;font-size:.9rem;color:#374151">' +
          (pkg.servicesIncluded || []).map(function (s) {
            return '<li style="display:flex;align-items:flex-start;gap:.5rem"><span style="display:inline-flex;height:1.2rem;width:1.2rem;flex-shrink:0;align-items:center;justify-content:center;border-radius:9999px;background:#dcfce7;color:#16a34a;font-size:.72rem">&#10003;</span>' + CS.esc(s) + '</li>';
          }).join('') +
        '</ul>' +
      '</div>' +

      '<div class="card" style="padding:1.5rem 1.75rem;margin-bottom:1.5rem">' +
        '<h3 style="font-size:1.05rem;font-weight:700;color:#111827;margin:0 0 .75rem">Additional Services</h3>' +
        '<div style="display:grid;gap:.65rem">' +
          ADDONS.map(function (a) {
            return '<label style="display:flex;align-items:center;justify-content:space-between;gap:1rem;border:1px solid #e5e7eb;border-radius:.5rem;padding:.65rem .9rem;cursor:pointer">' +
              '<span style="display:flex;align-items:center;gap:.6rem"><input type="checkbox" class="cu-addon" data-name="' + CS.esc(a.name) + '">' + CS.esc(a.name) + '</span>' +
              '<span style="font-weight:700;color:#4f46e5">' + 'Le ' + a.price.toLocaleString() + '</span>' +
            '</label>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="card" style="padding:1.5rem 1.75rem;margin-bottom:1.5rem;overflow:hidden">' +
        '<h3 style="font-size:1.05rem;font-weight:700;color:#111827;margin:0 0 .75rem">Package Items</h3>' +
        '<table style="width:100%;border-collapse:collapse;font-size:.88rem">' +
          '<thead><tr style="color:#6b7280;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em">' +
            '<th style="text-align:left;padding:.5rem .6rem">Item</th><th style="text-align:left;padding:.5rem .6rem">Details</th></tr></thead>' +
          '<tbody style="color:#374151">' + itemsRows(pkg) + '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="card" style="padding:1.75rem;background:#1e1b2e;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">' +
        '<div><p style="font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .25rem;color:#a5b4fc">Total Investment</p>' +
          '<p id="cu-total" style="font-size:1.8rem;font-weight:800;margin:0;color:#fff">' + 'Le ' + total().toLocaleString() + '</p></div>' +
        '<a class="btn btn-amber" title="Book this package" style="border-radius:9999px;padding:.85rem 1.6rem" href="bookings-create.html?packageName=' + encodeURIComponent(pkg.name) + '">Book Now</a>' +
      '</div>';

    mount.querySelectorAll('.cu-addon').forEach(function (cb) {
      cb.addEventListener('change', function () {
        selected[cb.dataset.name] = cb.checked;
        document.getElementById('cu-total').textContent = 'Le ' + total().toLocaleString();
      });
    });
  }

  function downloadPdf() {
    const chosen = ADDONS.filter(function (a) { return selected[a.name]; });
    try {
      const pdf = CS.pdf.create((pkg.name || 'custom-package') + '-customized.pdf');
      const pageW = pdf.width;
      const x = 40;
      pdf.rect(0, 60, pageW, 130, [38, 38, 40]);
      pdf.text('PhotoStudio', 40, 118, { size: 20, bold: true, color: [255, 255, 255] });
      pdf.text('Customized Package Details', 40, 98, { size: 10, color: [182, 164, 137] });
      let y = 225;
      pdf.text(pkg.name + ' - Customized', x, y, { size: 22, bold: true });
      y += 30;
      pdf.text('Base Price: Le ' + Number(pkg.investment || 0).toLocaleString(), x, y, { size: 13, color: [107, 114, 128] });
      y += 40;
      pdf.line(x, y, pageW - 40, y);
      y += 26;
      pdf.text('Base Services Included', x, y, { size: 15, bold: true });
      y += 22;
      (pkg.servicesIncluded || []).forEach(function (s) {
        pdf.text('\u2022 ' + s, x + 12, y, { size: 11 });
        y += 18;
      });
      y += 10;
      pdf.text('Additional Services Selected', x, y, { size: 15, bold: true });
      y += 22;
      if (chosen.length) {
        chosen.forEach(function (a) {
          pdf.text('\u2022 ' + a.name + ' - Le ' + a.price.toLocaleString(), x + 12, y, { size: 11 });
          y += 18;
        });
      } else {
        pdf.text('None', x + 12, y, { size: 11, color: [156, 163, 175] });
        y += 18;
      }
      const ai = pkg.additionalItems;
      if (ai) {
        y += 10;
        pdf.text('Package Items', x, y, { size: 15, bold: true });
        y += 22;
        const lines = [];
        if (ai.editedImages) lines.push('Edited Images: ' + ai.editedImages);
        if (ai.uneditedImages) lines.push('Unedited Images: ' + ai.uneditedImages);
        (ai.albums || []).forEach(function (a) { lines.push('Album: ' + a.size + ' ' + a.type + ' (' + a.spreadCount + ' spreads)'); });
        (ai.framedPortraits || []).forEach(function (fp) { lines.push('Framed Portrait: ' + fp.size + ' (Quantity: ' + fp.quantity + ')'); });
        if (ai.thankYouCards) lines.push('Thank You Cards: ' + ai.thankYouCards);
        lines.forEach(function (l) {
          pdf.text('\u2022 ' + l, x + 12, y, { size: 11 });
          y += 18;
        });
      }
      y += 14;
      pdf.text('Total Investment: Le ' + total().toLocaleString(), x, y, { size: 16, bold: true, color: [79, 70, 229] });
      pdf.rect(0, pdf.height - 40, pageW, 34, [38, 38, 40]);
      pdf.text('Contact: info@photostudio.com | +94 77 123 4567 | www.photostudio.com', 195, pdf.height - 18, { size: 9, align: 'center', color: [255, 255, 255] });
      pdf.text('Capturing Moments, Creating Memories', 195, pdf.height - 30, { size: 8, align: 'center', color: [156, 163, 175] });
      pdf.save();
    } catch (e) {
      CS.toast('Failed to generate PDF', 'error');
    }
  }

  function load() {
    if (!id) { window.location.href = 'packages.html'; return; }
    document.getElementById('cu-pdf').addEventListener('click', downloadPdf);
    CS.api.get('/api/packages/' + encodeURIComponent(id))
      .then(function (data) {
        pkg = data;
        render();
      })
      .catch(function () {
        document.getElementById('cu-mount').innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">Package not found</div>';
        document.getElementById('cu-name').textContent = 'Package not found - Customize';
      });
  }

  window.addEventListener('DOMContentLoaded', load);
})();