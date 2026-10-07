/* ================================================================== */
/*  Critical Shot — admin dashboard                                    */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  const STAT_CARDS = [
    { name: 'Total Bookings', key: 'totalBookings', icon: 'calendar' },
    { name: 'Pending Bookings', key: 'pendingBookings', icon: 'clock' },
    { name: 'Total Albums', key: 'totalAlbums', icon: 'album' },
    { name: 'Total Staff', key: 'totalStaff', icon: 'users' },
    { name: 'Total Packages', key: 'totalPackages', icon: 'package' },
    { name: 'Portfolio Items', key: 'totalPortfolioItems', icon: 'portfolio' }
  ];

  function renderStats(stats) {
    const grid = document.getElementById('dash-stats');
    if (!grid) return;
    grid.innerHTML = STAT_CARDS.map(function (c) {
      return '<div class="stat-card">' +
        '<div class="icon-box">' + CS.icon(c.icon, 'h-6 w-6') + '</div>' +
        '<p class="label">' + CS.esc(c.name) + '</p>' +
        '<p class="value">' + (Number(stats[c.key] || 0).toLocaleString()) + '</p>' +
      '</div>';
    }).join('');
  }

  function activityIcon(type) {
    var t = String(type || '').toUpperCase();
    if (t === 'BOOKING') return 'calendar';
    if (t === 'ALBUM') return 'album';
    if (t === 'PORTFOLIO') return 'portfolio';
    return 'star';
  }

  function renderActivity(activities) {
    const wrap = document.getElementById('dash-activity');
    if (!wrap) return;
    if (!activities || !activities.length) {
      wrap.innerHTML = '<div class="empty-state">No recent activity yet.</div>';
      return;
    }
    wrap.innerHTML = '<ul class="timeline">' + activities.map(function (a, i) {
      return '<li>' +
        '<span class="tl-dot">' + CS.icon(activityIcon(a.type), 'h-5 w-5') + '</span>' +
        '<div class="tl-body">' +
          '<p style="font-size:.875rem;color:#4b5563;line-height:1.5">' + CS.esc(a.description || 'Activity') +
            (a.userName ? ' by <strong style="color:#111827">' + CS.esc(a.userName) + '</strong>' : '') + '</p>' +
          '<time class="tl-time" style="margin-top:.25rem;display:block" datetime="' + CS.esc(a.timestamp || '') + '">' + CS.fmtDateTime(a.timestamp) + '</time>' +
        '</div>' +
      '</li>';
    }).join('') + '</ul>';
  }

  window.addEventListener('DOMContentLoaded', function () {
    if (String(CS.session.role || '').toUpperCase() !== 'ADMIN') {
      window.location.href = 'login.html';
      return;
    }
    CS.renderAdminShell('admin-shell');

    const nb = document.getElementById('dash-new-booking');
    if (nb) nb.addEventListener('click', function () { window.location.href = 'bookings-admin-detail.html?new=1'; });

    CS.api.get('/api/dashboard/stats').then(function (data) {
      renderStats(data || {});
    }).catch(function () {
      renderStats({});
      CS.toast('Could not load dashboard stats', 'error');
    });

    CS.api.get('/api/dashboard/recent-activities').then(renderActivity).catch(function () {
      renderActivity([]);
    });
  });
})();