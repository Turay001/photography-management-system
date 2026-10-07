/* ================================================================== */
/*  Critical Shot — login / register page                              */
/* ================================================================== */
(function () {
  'use strict';
  const CS = window.CS;

  function render(isRegistering) {
    const mount = document.getElementById('auth-content');
    mount.innerHTML =
      '<h2>' + (isRegistering ? 'Create Account' : 'Welcome Back') + '</h2>' +
      '<p class="sub">' + (isRegistering ? 'Create a new account' : 'Sign in to your account to continue') + '</p>' +

      '<div id="auth-error" style="display:none" class="alert alert-red" role="alert"></div>' +

      '<form id="auth-form" novalidate style="margin-top:1.5rem">' +
        (isRegistering
          ? '<div class="auth-field"><label for="auth-name">Full Name</label>' +
            '<input class="input-lite" id="auth-name" type="text" placeholder="Your Name" autocomplete="name"></div>' +
            '<div class="auth-field"><label for="auth-contact">Contact Number</label>' +
            '<input class="input-lite" id="auth-contact" type="tel" placeholder="Phone Number" autocomplete="tel"></div>'
          : '') +
        '<div class="auth-field"><label for="auth-email">Email address</label>' +
          '<input class="input-lite" id="auth-email" type="email" placeholder="you@example.com" autocomplete="email"></div>' +
        '<div class="auth-field"><label for="auth-password">Password</label>' +
          '<input class="input-lite" id="auth-password" type="password" placeholder="••••••••" autocomplete="' + (isRegistering ? 'new-password' : 'current-password') + '">' +
          (isRegistering ? '<p style="margin-top:.4rem;font-size:.75rem;color:#6b7280">Password must be at least 8 characters</p>' : '') +
        '</div>' +
        '<button type="submit" class="btn-auth" id="auth-submit">' + (isRegistering ? 'Sign Up' : 'Sign In') + '</button>' +
      '</form>' +

      '<div style="margin-top:1.5rem;text-align:center">' +
        '<button type="button" id="auth-toggle" class="auth-toggle">' +
          (isRegistering ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up') +
        '</button>' +
      '</div>';

    mount.querySelector('#auth-toggle').addEventListener('click', function () { render(!isRegistering); });
    mount.querySelector('#auth-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submit(isRegistering, mount);
    });
    document.getElementById('auth-email').focus();
  }

  function showError(mount, msg) {
    const el = mount.querySelector('#auth-error');
    el.textContent = msg;
    el.style.display = 'flex';
  }

  function submit(isRegistering, mount) {
    const errorEl = mount.querySelector('#auth-error');
    errorEl.style.display = 'none';

    const email = mount.querySelector('#auth-email').value.trim();
    const password = mount.querySelector('#auth-password').value;

    if (!email || !/^[A-Za-z0-9+_.-]+@(.+)$/.test(email)) return showError(mount, 'Please enter a valid email address.');
    if (!password) return showError(mount, 'Please enter your password.');

    const payload = { email: email, password: password };
    if (isRegistering) {
      const name = mount.querySelector('#auth-name').value.trim();
      const contactNumber = mount.querySelector('#auth-contact').value.trim();
      if (!name) return showError(mount, 'Please enter your full name.');
      if (!contactNumber) return showError(mount, 'Please enter your contact number.');
      if (password.length < 8) return showError(mount, 'Password must be at least 8 characters.');
      payload.name = name;
      payload.contactNumber = contactNumber;
    }

    const btn = mount.querySelector('#auth-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="border-color:rgba(255,255,255,.4);border-top-color:#fff;width:.9rem;height:.9rem"></span> ' + (isRegistering ? 'Creating account...' : 'Signing in...');

    CS.api.post(isRegistering ? '/api/auth/register' : '/api/auth/login', payload)
      .then(function (data) {
        if (!data || !data.userId) throw new Error('No account returned. Please try again.');
        CS.session.save(data);
        const role = String(data.role || '').toUpperCase();
        window.location.href = role === 'ADMIN' ? 'admin.html' : (role === 'STAFF' ? 'staff-dashboard.html' : 'index.html');
      })
      .catch(function (err) {
        showError(mount, err.message || (isRegistering ? 'Registration failed' : 'Login failed'));
      })
      .finally(function () {
        btn.disabled = false;
        btn.innerHTML = isRegistering ? 'Sign Up' : 'Sign In';
      });
  }

  window.addEventListener('DOMContentLoaded', function () { render(false); });
})();