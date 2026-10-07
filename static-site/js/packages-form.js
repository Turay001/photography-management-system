/* ================================================================== */
/*  Critical Shot — shared package create/edit form                   */
/*  Exposed as CS.renderPackageForm(mountId, initial, mode, id)       */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS = window.CS || {};

  function serviceRow(text, remove) {
    return '<div class="dyn-row" style="display:flex;gap:.6rem;margin-bottom:.6rem">' +
      '<input type="text" class="input-lite srv-value" placeholder="e.g. 4 hours coverage" value="' + CS.esc(text || '') + '">' +
      '<button type="button" class="btn btn-danger-light btn-sm dyn-remove">Remove</button>' +
    '</div>';
  }

  function albumRow(a) {
    a = a || {};
    return '<div class="dyn-row" style="display:grid;grid-template-columns:1fr 1.4fr .7fr auto;gap:.5rem;margin-bottom:.6rem">' +
      '<input type="text" class="input-lite alb-size" placeholder="Size" value="' + CS.esc(a.size || '') + '">' +
      '<input type="text" class="input-lite alb-type" placeholder="Type" value="' + CS.esc(a.type || '') + '">' +
      '<input type="number" class="input-lite alb-count" placeholder="Spreads" min="0" value="' + (a.spreadCount == null ? '' : a.spreadCount) + '">' +
      '<button type="button" class="btn btn-danger-light btn-sm dyn-remove">Remove</button>' +
    '</div>';
  }

  function portraitRow(p) {
    p = p || {};
    return '<div class="dyn-row" style="display:grid;grid-template-columns:1.4fr .8fr auto;gap:.5rem;margin-bottom:.6rem">' +
      '<input type="text" class="input-lite por-size" placeholder="Size" value="' + CS.esc(p.size || '') + '">' +
      '<input type="number" class="input-lite por-qty" placeholder="Quantity" min="1" value="' + (p.quantity == null ? '' : p.quantity) + '">' +
      '<button type="button" class="btn btn-danger-light btn-sm dyn-remove">Remove</button>' +
    '</div>';
  }

  function renderForm(mount, initial, mode, packageId) {
    const has = initial != null;
    const F = has ? initial : {};

    mount.innerHTML =
      '<form id="pkg-form" class="card" style="padding:1.5rem 1.75rem 2rem" novalidate>' +
        '<div class="form-2col">' +
          '<div class="field"><label for="f-name">Package Name <span class="req">*</span></label><input type="text" id="f-name" class="input-lite" value="' + CS.esc(F.name || '') + '"></div>' +
          '<div class="field"><label for="f-type">Package Type <span class="req">*</span></label><input type="text" id="f-type" class="input-lite" placeholder="e.g. Wedding" value="' + CS.esc(F.packageType || '') + '"></div>' +
        '</div>' +
        '<div class="field"><label for="f-invest">Investment (Le) <span class="req">*</span></label><input type="number" id="f-invest" class="input-lite" min="0" value="' + (F.investment == null ? '' : F.investment) + '"></div>' +

        '<div class="field">' +
          '<label>Services Included <span class="req">*</span></label>' +
          '<div id="srv-list">' + (((F.servicesIncluded || []).length) ? F.servicesIncluded.map(serviceRow).join('') : serviceRow('', false)) + '</div>' +
          '<button type="button" class="btn btn-outline btn-sm" id="srv-add">+ Add Service</button>' +
        '</div>' +

        '<div style="border-top:1px solid #e5e7eb;padding-top:1.25rem;margin-top:1.25rem">' +
          '<h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0 0 1rem">Additional Items</h3>' +
          '<div class="form-2col">' +
            '<div class="field"><label for="f-edited">Edited Images <span class="req">*</span></label><input type="text" id="f-edited" class="input-lite" placeholder="e.g. 50 edited images" value="' + CS.esc((F.additionalItems && F.additionalItems.editedImages) || '') + '"></div>' +
            '<div class="field"><label for="f-unedited">Unedited Images <span class="req">*</span></label><input type="text" id="f-unedited" class="input-lite" placeholder="e.g. 300 unedited images" value="' + CS.esc((F.additionalItems && F.additionalItems.uneditedImages) || '') + '"></div>' +
          '</div>' +
          '<div class="field"><label for="f-cards">Thank You Cards <span class="req">*</span></label><input type="number" id="f-cards" class="input-lite" min="1" value="' + ((F.additionalItems && F.additionalItems.thankYouCards) || '') + '"></div>' +
        '</div>' +

        '<div class="field">' +
          '<label>Albums</label>' +
          '<div id="alb-list">' + ((F.additionalItems && F.additionalItems.albums || []).length ? F.additionalItems.albums.map(albumRow).join('') : '') + '</div>' +
          '<button type="button" class="btn btn-outline btn-sm" id="alb-add">+ Add Album</button>' +
        '</div>' +

        '<div class="field">' +
          '<label>Framed Portraits</label>' +
          '<div id="por-list">' + ((F.additionalItems && F.additionalItems.framedPortraits || []).length ? F.additionalItems.framedPortraits.map(portraitRow).join('') : '') + '</div>' +
          '<button type="button" class="btn btn-outline btn-sm" id="por-add">+ Add Portrait</button>' +
        '</div>' +

        '<div id="pkg-err"></div>' +
        '<div class="flex justify-end" style="gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e5e7eb">' +
          '<a href="packages-admin.html" class="btn btn-outline">Cancel</a>' +
          '<button type="submit" class="btn btn-indigo" id="pkg-submit">' + (has ? 'Save Changes' : 'Create Package') + '</button>' +
        '</div>' +
      '</form>';

    document.getElementById('srv-add').addEventListener('click', function () {
      document.getElementById('srv-list').insertAdjacentHTML('beforeend', serviceRow('', false));
      bindRemoves(mount);
    });
    document.getElementById('alb-add').addEventListener('click', function () {
      document.getElementById('alb-list').insertAdjacentHTML('beforeend', albumRow(null));
      bindRemoves(mount);
    });
    document.getElementById('por-add').addEventListener('click', function () {
      document.getElementById('por-list').insertAdjacentHTML('beforeend', portraitRow(null));
      bindRemoves(mount);
    });
    bindRemoves(mount);

    mount.querySelector('#pkg-form').addEventListener('submit', function (e) {
      e.preventDefault();
      setErr('');
      const name = document.getElementById('f-name').value.trim();
      const packageType = document.getElementById('f-type').value.trim();
      const investment = Number(document.getElementById('f-invest').value);
      const servicesIncluded = Array.prototype.map.call(document.querySelectorAll('#srv-list .srv-value'), function (i) { return i.value.trim(); }).filter(Boolean);
      const editedImages = document.getElementById('f-edited').value.trim();
      const uneditedImages = document.getElementById('f-unedited').value.trim();
      const thankYouCards = Number(document.getElementById('f-cards').value);
      const albums = Array.prototype.map.call(document.querySelectorAll('#alb-list .dyn-row'), function (row) {
        return {
          size: row.querySelector('.alb-size').value.trim(),
          type: row.querySelector('.alb-type').value.trim(),
          spreadCount: Number(row.querySelector('.alb-count').value)
        };
      }).filter(function (a) { return a.size || a.type || rowHasNumber(a.spreadCount); });
      const framedPortraits = Array.prototype.map.call(document.querySelectorAll('#por-list .dyn-row'), function (row) {
        return {
          size: row.querySelector('.por-size').value.trim(),
          quantity: Number(row.querySelector('.por-qty').value)
        };
      }).filter(function (p) { return p.size || rowHasNumber(p.quantity); });

      if (!name) return setErr('Package name is required.');
      if (!packageType) return setErr('Package type is required.');
      if (!(investment > 0)) return setErr('Investment must be a positive number.');
      if (!servicesIncluded.length) return setErr('At least one service is required.');
      if (!editedImages) return setErr('Edited images is required.');
      if (!uneditedImages) return setErr('Unedited images is required.');
      if (!(thankYouCards > 0)) return setErr('Thank you cards must be a positive number.');
      for (const a of albums) {
        if (isNaN(a.spreadCount) || a.spreadCount < 0) return setErr('Each album spread count must be a number 0 or greater.');
      }
      for (const p of framedPortraits) {
        if (isNaN(p.quantity) || p.quantity <= 0) return setErr('Each framed portrait quantity must be a number greater than 0.');
      }

      const payload = {
        name: name,
        servicesIncluded: servicesIncluded,
        additionalItems: {
          editedImages: editedImages,
          uneditedImages: uneditedImages,
          albums: albums,
          framedPortraits: framedPortraits,
          thankYouCards: thankYouCards
        },
        investment: investment,
        packageType: packageType
      };

      const btn = document.getElementById('pkg-submit');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      const req = has
        ? CS.api.put('/api/packages/' + encodeURIComponent(packageId), payload)
        : CS.api.post('/api/packages', payload);
      req.then(function () {
        CS.toast(has ? 'Package updated successfully' : 'Package created successfully', 'success');
        window.location.href = 'packages-admin.html';
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = has ? 'Save Changes' : 'Create Package';
        setErr(has ? 'Something went wrong while updating the package.' : 'Something went wrong while creating the package.');
      });
    });

    function setErr(msg) {
      document.getElementById('pkg-err').innerHTML = msg ? '<div class="alert alert-red">' + CS.esc(msg) + '</div>' : '';
    }
    function rowHasNumber(v) { return !isNaN(v) && v !== ''; }
  }

  function bindRemoves(mount) {
    mount.querySelectorAll('.dyn-remove').forEach(function (btn) {
      btn.addEventListener('click', function () { btn.closest('.dyn-row').remove(); });
    });
  }

  CS.renderPackageForm = renderForm;
})();