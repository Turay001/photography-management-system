/* ================================================================== */
/*  Critical Shot — staff list (admin)                                */
/*  GET /api/staff, DELETE /api/staff/:id, table/grid + search        */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const state = { all: [], list: [], view: 'table', search: '', loading: false };

  function fmtRange(s) {
    if (!s.availabilityStartDate && !s.availabilityEndDate) return '';
    const from = s.availabilityStartDate ? new Date(s.availabilityStartDate) : null;
    const to = s.availabilityEndDate ? new Date(s.availabilityEndDate) : null;
    const part = (from && !isNaN(from)) ? from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const part2 = (to && !isNaN(to)) ? to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return part + ' - ' + part2;
  }

  function statusCell(s) {
    return '<div style="display:flex;flex-direction:column;gap:.15rem">' +
      '<span style="color:' + (s.availability ? '#16a34a' : '#dc2626') + ';font-weight:600;font-size:.85rem">' + (s.availability ? 'Active' : 'InActive') + '</span>' +
      (fmtRange(s) ? '<span style="font-size:.72rem;color:#6b7280">' + CS.esc(fmtRange(s)) + '</span>' : '') +
    '</div>';
  }

  function actions(s) {
    const a = s.availability;
    return '<div style="display:flex;gap:.4rem;justify-content:flex-end">' +
      '<button class="btn btn-sm btn-green" data-act="assign" ' + (a ? '' : 'disabled style="opacity:.5;cursor:not-allowed;background:#d1d5db;color:#6b7280"') + '>Assign</button>' +
      '<a class="btn btn-sm btn-blue" href="staff-edit.html?id=' + encodeURIComponent(s.id) + '">Update</a>' +
      '<button class="btn btn-sm btn-danger-light" data-act="delete">Delete</button>' +
    '</div>';
  }

  function tableHtml() {
    if (!state.list.length) return '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">No staff members found.</div>';
    return '<div class="card" style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:.85rem;min-width:720px">' +
      '<thead><tr style="color:#6b7280;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">' +
        '<th style="text-align:left;padding:.8rem .9rem">Name</th>' +
        '<th style="text-align:left;padding:.8rem .9rem">Email</th>' +
        '<th style="text-align:left;padding:.8rem .9rem">Phone</th>' +
        '<th style="text-align:left;padding:.8rem .9rem">Experience</th>' +
        '<th style="text-align:left;padding:.8rem .9rem">Hourly Rate</th>' +
        '<th style="text-align:left;padding:.8rem .9rem">Status</th>' +
        '<th style="text-align:right;padding:.8rem .9rem">Actions</th>' +
      '</tr></thead><tbody>' +
      state.list.map(function (s) {
        return '<tr style="border-bottom:1px solid #f3f4f6">' +
          '<td style="padding:.7rem .9rem;font-weight:600;color:#111827">' + CS.esc(s.name) + '</td>' +
          '<td style="padding:.7rem .9rem;color:#4b5563">' + CS.esc(s.email) + '</td>' +
          '<td style="padding:.7rem .9rem;color:#4b5563">' + CS.esc(s.phone) + '</td>' +
          '<td style="padding:.7rem .9rem;color:#4b5563">' + CS.esc(s.experience || 'N/A') + (s.experience ? ' years' : '') + '</td>' +
          '<td style="padding:.7rem .9rem;color:#4b5563">' + CS.esc(s.hourlyRate) + '/hr</td>' +
          '<td style="padding:.7rem .9rem">' + statusCell(s) + '</td>' +
          '<td style="padding:.7rem .9rem">' + actions(s) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function cardHtml(s) {
    return '<div class="st-card" data-id="' + CS.esc(s.id) + '" style="background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;box-shadow:0 1px 2px rgba(0,0,0,.05);padding:1.25rem;display:flex;flex-direction:column;gap:.4rem">' +
      '<div class="flex align-center justify-between"><h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0">' + CS.esc(s.name) + '</h3>' + statusCell(s) + '</div>' +
      '<p style="font-size:.82rem;color:#6b7280;margin:0">' + CS.esc(s.email) + '</p>' +
      '<p style="font-size:.82rem;color:#6b7280;margin:0">' + CS.esc(s.phone) + '</p>' +
      '<p style="font-size:.82rem;color:#6b7280;margin:0">' + CS.esc(s.experience || 'N/A') + (s.experience ? ' years' : '') + ' &middot; ' + CS.esc(s.hourlyRate) + '/hr</p>' +
      '<div style="display:flex;gap:.4rem;margin-top:.6rem;padding-top:.75rem;border-top:1px solid #e5e7eb">' + actions(s) + '</div>' +
    '</div>';
  }

  function render() {
    const q = state.search.trim().toLowerCase();
    state.list = state.all.filter(function (s) {
      if (!q) return true;
      return [s.name, s.email, s.phone].some(function (v) { return String(v || '').toLowerCase().includes(q); });
    });

    const avail = state.list.filter(function (s) { return s.availability; }).length;
    const total = state.list.length;
    const sum = state.list.reduce(function (acc, s) { return acc + Number(s.hourlyRate || 0); }, 0);
    const avg = total ? sum / total : 0;
    document.getElementById('st-summary').innerHTML =
      '<div class="card" style="padding:.9rem 1rem"><div style="font-weight:700;color:#2563eb;font-size:.8rem">Available Photographer</div><div style="font-size:1.2rem;font-weight:700;color:#111827;margin-top:.2rem">' + avail + '</div></div>' +
      '<div class="card" style="padding:.9rem 1rem"><div style="font-weight:700;color:#2563eb;font-size:.8rem">Total Staff</div><div style="font-size:1.2rem;font-weight:700;color:#111827;margin-top:.2rem">' + total + '</div></div>' +
      '<div class="card" style="padding:.9rem 1rem"><div style="font-weight:700;color:#2563eb;font-size:.8rem">Average Base Rate</div><div style="font-size:1.2rem;font-weight:700;color:#111827;margin-top:.2rem">$' + avg.toFixed(2) + '/hr</div></div>';

    const mount = document.getElementById('st-mount');
    if (state.loading) {
      mount.innerHTML = '<div class="loading-block"><span class="spinner spinner-dark"></span> Loading staff...</div>';
      return;
    }
    mount.innerHTML = state.view === 'table' ? tableHtml() : '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">' + state.list.map(cardHtml).join('') + '</div>';

    if (state.view === 'grid' && !state.list.length) {
      mount.innerHTML = '<div class="card" style="padding:3rem;text-align:center;color:#6b7280">No staff members found.</div>';
    }

    mount.querySelectorAll('[data-act="assign"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.closest('[data-id]').dataset.id;
        window.location.href = 'staff-assign.html?id=' + encodeURIComponent(id);
      });
    });
    mount.querySelectorAll('[data-act="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const s = state.all.find(function (x) { return String(x.id) === btn.closest('[data-id]').dataset.id; });
        CS.confirm('Are you sure you want to delete this staff member?', 'Delete Staff')
          .then(function (ok) {
            if (!ok) return;
            CS.api.del('/api/staff/' + encodeURIComponent(s.id))
              .then(function () {
                state.all = state.all.filter(function (x) { return x.id !== s.id; });
                render();
                CS.toast('Staff deleted successfully!', 'success');
              })
              .catch(function () { CS.toast('Failed to delete staff.', 'error'); });
          });
      });
    });
  }

  function load() {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');
    document.querySelectorAll('[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.view = btn.dataset.view;
        document.querySelectorAll('[data-view]').forEach(function (b) {
          if (b === btn) { b.classList.add('btn-indigo'); b.classList.remove('btn-outline'); }
          else { b.classList.add('btn-outline'); b.classList.remove('btn-indigo'); }
        });
        render();
      });
    });
    document.getElementById('st-search').addEventListener('input', function (e) { state.search = e.target.value; render(); });

    state.loading = true;
    render();
    CS.api.get('/api/staff')
      .then(function (data) { state.all = Array.isArray(data) ? data : []; })
      .catch(function () { state.all = []; CS.toast('Failed to load staff', 'error'); })
      .finally(function () { state.loading = false; render(); });
  }

  window.addEventListener('DOMContentLoaded', load);
})();