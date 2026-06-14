Object.assign(Pages, {
  login() {
    return Components.authPage({
      eyebrow: 'Welcome back',
      title: 'Log in',
      subtitle: 'Access your freelancer or client dashboard.',
      content: `
        <form class="auth-form" data-form="login">
          ${Components.authField('Email', 'email', 'email', '', 'required autocomplete="email" placeholder="you@example.com"')}
          ${Components.authField('Password', 'password', 'password', '', 'required autocomplete="current-password" placeholder="••••••••"')}
          <div class="auth-row auth-row-end">
            <a class="auth-link" data-nav="/forgot-password">Forgot password?</a>
          </div>
          <button type="submit" class="btn btn-primary auth-submit">Log in</button>
        </form>`,
      footer: `
        <p class="auth-footer-text">
          New here?
          <a class="auth-link auth-link-strong" data-nav="/register">Create an account</a>
        </p>
        <p class="auth-footer-meta">
          <a class="auth-link" data-nav="/admin/login">Admin login</a>
        </p>`,
    });
  },

  adminLogin() {
    return Components.authPage({
      eyebrow: 'Administration',
      title: 'Admin login',
      subtitle: 'Restricted access for platform administrators.',
      content: `
        <form class="auth-form admin-auth-form" data-form="adminLogin">
          ${Components.authField('Email', 'email', 'email', '', 'required autocomplete="email" placeholder="admin@hiremenow.com"')}
          ${Components.authField('Password', 'password', 'password', '', 'required autocomplete="current-password" placeholder="••••••••"')}
          <button type="submit" class="btn btn-primary auth-submit">Log in as admin</button>
        </form>`,
      footer: `
        <p class="auth-footer-text">
          <a class="auth-link" data-nav="/login">← Back to user login</a>
        </p>`,
    });
  },

  register() {
    return Components.authPage({
      eyebrow: 'Get started',
      title: 'Create account',
      subtitle: 'Join as a freelancer or client in under a minute.',
      content: `
        <form class="auth-form" data-form="register">
          ${Components.authRolePicker('role', 'freelancer')}
          ${Components.authField('Email', 'email', 'email', '', 'required autocomplete="email" placeholder="you@example.com"')}
          ${Components.authField('Password', 'password', 'password', '', 'required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"', 'Use 8 or more characters.')}
          <div id="freelancer-fields">
            ${Components.authField('Display name', 'display_name', 'text', '', 'required placeholder="How clients will see you"')}
          </div>
          <div id="client-fields" hidden>
            ${Components.authField('Company name', 'company_name', 'text', '', 'placeholder="Optional"')}
          </div>
          <button type="submit" class="btn btn-primary auth-submit">Create account</button>
        </form>`,
      footer: `
        <p class="auth-footer-text">
          Already have an account?
          <a class="auth-link auth-link-strong" data-nav="/login">Log in</a>
        </p>`,
    });
  },

  forgotPassword() {
    return Components.authPage({
      eyebrow: 'Account recovery',
      title: 'Forgot password',
      subtitle: 'We will email you a link to reset your password.',
      content: `
        <form class="auth-form" data-form="forgotPassword">
          ${Components.authField('Email', 'email', 'email', '', 'required autocomplete="email" placeholder="you@example.com"')}
          <button type="submit" class="btn btn-primary auth-submit">Send reset link</button>
        </form>
        <div id="reset-token-area" hidden class="auth-dev-token card alert">
          <p>Dev mode: reset token returned by API</p>
          <code id="reset-token-display"></code>
          <a class="btn btn-sm" id="use-reset-token">Use this token</a>
        </div>`,
      footer: `
        <p class="auth-footer-text">
          <a class="auth-link" data-nav="/login">← Back to login</a>
        </p>`,
    });
  },

  resetPassword() {
    const { token } = Utils.getQueryParams();
    if (!token) {
      return Components.authPage({
        eyebrow: 'Account recovery',
        title: 'Reset link invalid',
        subtitle: 'This link is missing or expired. Request a new reset email.',
        content: `
          <a class="btn btn-primary auth-submit" data-nav="/forgot-password">Request new link</a>`,
        footer: `
          <p class="auth-footer-text">
            <a class="auth-link" data-nav="/login">← Back to login</a>
          </p>`,
      });
    }
    return Components.authPage({
      eyebrow: 'Account recovery',
      title: 'Reset password',
      subtitle: 'Choose a new password for your account.',
      content: `
        <form class="auth-form" data-form="resetPassword">
          ${Components.authField('New password', 'new_password', 'password', '', 'required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"')}
          <button type="submit" class="btn btn-primary auth-submit">Update password</button>
        </form>`,
      footer: `
        <p class="auth-footer-text">
          <a class="auth-link" data-nav="/login">← Back to login</a>
        </p>`,
    });
  },
});

FormHandlers.login = async (form) => {
  const fd = new FormData(form);
  try {
    await Auth.login(fd.get('email'), fd.get('password'));
    Utils.showToast('Welcome back!', 'success');
    Router.navigate(Auth.dashboardPath());
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

FormHandlers.adminLogin = async (form) => {
  const fd = new FormData(form);
  try {
    await Auth.login(fd.get('email'), fd.get('password'), true);
    Utils.showToast('Admin logged in', 'success');
    Router.navigate('/admin');
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

FormHandlers.register = async (form) => {
  const fd = new FormData(form);
  const payload = {
    email: fd.get('email'),
    password: fd.get('password'),
    role: fd.get('role'),
  };
  if (payload.role === 'freelancer') payload.display_name = fd.get('display_name');
  else payload.company_name = fd.get('company_name');

  try {
    await Auth.register(payload);
    Utils.showToast('Account created!', 'success');
    Router.navigate(Auth.dashboardPath());
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

FormHandlers.forgotPassword = async (form) => {
  const fd = new FormData(form);
  try {
    const res = await Api.post('/auth/forgot-password', { email: fd.get('email') }, { auth: false });
    Utils.showToast(res.message || 'Check your email', 'success');
    if (res.reset_token) {
      const area = document.getElementById('reset-token-area');
      const display = document.getElementById('reset-token-display');
      if (area && display) {
        area.hidden = false;
        display.textContent = res.reset_token;
        document.getElementById('use-reset-token')?.addEventListener('click', () => {
          Router.navigate(`/reset-password?token=${encodeURIComponent(res.reset_token)}`);
        });
      }
    }
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

FormHandlers.resetPassword = async (form) => {
  const token = Utils.getQueryParams().token;
  if (!token) {
    Utils.showToast('Reset link is invalid or expired', 'error');
    Router.navigate('/forgot-password');
    return;
  }
  const fd = new FormData(form);
  try {
    await Api.post('/auth/reset-password', {
      token,
      new_password: fd.get('new_password'),
    }, { auth: false });
    Utils.showToast('Password reset successfully', 'success');
    Router.navigate('/login');
  } catch (err) {
    Utils.showToast(Utils.parseApiError(err), 'error');
  }
};

function syncRegisterRoleFields(form) {
  const role = form?.querySelector('input[name="role"]:checked')?.value || 'freelancer';
  const isFreelancer = role === 'freelancer';
  const freelancerFields = document.getElementById('freelancer-fields');
  const clientFields = document.getElementById('client-fields');
  if (freelancerFields) freelancerFields.hidden = !isFreelancer;
  if (clientFields) clientFields.hidden = isFreelancer;
  form?.querySelectorAll('.auth-role-option').forEach((el) => {
    const input = el.querySelector('input[type="radio"]');
    el.classList.toggle('is-active', input?.checked);
  });
}

document.addEventListener('change', (e) => {
  if (e.target.name === 'role' && e.target.closest('form[data-form="register"]')) {
    syncRegisterRoleFields(e.target.closest('form'));
  }
});

document.addEventListener('click', (e) => {
  const option = e.target.closest('.auth-role-option');
  if (!option) return;
  const form = option.closest('form[data-form="register"]');
  if (!form) return;
  requestAnimationFrame(() => syncRegisterRoleFields(form));
});
