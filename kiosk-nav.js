class KioskNav extends HTMLElement {

  handleLocationChanged = () => {
    this.updateActiveItem();
  };

  handleDrawerToggle = () => {
    this.setDrawerOpen(!this.isOpen);
  };

  handleOutsidePointerDown = (event) => {
    if (event.composedPath().includes(this)) {
      return;
    }

    this.setDrawerOpen(false);
  };

  handleKeyDown = (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    this.setDrawerOpen(false);
  };

  static TRANSITION_DURATION_MS = 250;
  static TRANSITION_FALLBACK_MS = 50;
  static VERSION = '1.1.2';
  static logged = false;
  static stylesheet = null;
  static stylesheetUrl = new URL('kiosk-nav.css', import.meta.url);

  static async loadStylesheet() {
    if (KioskNav.stylesheet) {
      return KioskNav.stylesheet;
    }

    const response = await fetch(KioskNav.stylesheetUrl.href);

    if (!response.ok) {
      throw new Error(`Unable to load stylesheet ${KioskNav.stylesheetUrl.href}: ${response.status}`);
    }

    const stylesheet = new CSSStyleSheet();

    await stylesheet.replace(await response.text());

    KioskNav.stylesheet = stylesheet;

    return stylesheet;
  }

  static logInfo(items) {
    const lines = [
      {
        content: '≡ kiosk-nav',
        background: '#12dba9',
        color: '#111',
      },
      {
        content: `version ${KioskNav.VERSION}`,
      },
      ...items.map(({ label, path }) => ({
        content: `${label}: ${path}`,
      })),
    ];

    const output = [];
    const styles = [];
    const lastIndex = lines.length - 1;
    const maxLength = Math.max(...lines.map(({ content }) => content.length));

    const baseStyle = {
      'border-color': '#424242',
      'border-style': 'solid',
      display: 'inline-block',
      'font-family': 'monospace',
      'font-size': '12px',
      'white-space': 'pre',
    };

    const styleToString = (style) => Object.entries(style)
      .map(([property, value]) => `${property}: ${value}`)
      .join('; ');

    lines.forEach(
      (
        {
          content,
          background = 'white',
          color = '#424242',
        },
        index,
      ) => {
        const isFirstLine = index === 0;
        const isLastLine = index === lastIndex;

        const endTypo = isFirstLine ? '⋮' : '\u00a0';

        const padding = '\u00a0'.repeat(maxLength - content.length);

        output.push(
          `%c${content}${padding}%c${endTypo}%c`,
        );

        if (!isLastLine) {
          output.push('\n');
        }

        const leftBorderWidth = isFirstLine
          ? '1px 0 0 1px'
          : isLastLine
            ? '0 0 1px 1px'
            : '0 0 0 1px';

        const rightBorderWidth = isFirstLine
          ? '1px 1px 0 0'
          : isLastLine
            ? '0 1px 1px 0'
            : '0 1px 0 0';

        styles.push(
          styleToString({
            ...baseStyle,
            background,
            color,
            padding: isFirstLine
              ? '1px 3px 1px 5px'
              : '1px 0 1px 10px',
            'border-width': leftBorderWidth,
          }),
        );

        styles.push(
          styleToString({
            ...baseStyle,
            background,
            color,
            padding: isFirstLine
              ? '1px 5px'
              : '1px 5px 1px 0',
            'border-width': rightBorderWidth,
          }),
        );

        styles.push('');
      },
    );

    console.info(output.join(''), ...styles);
  }

  static normalizePath(path) {
    if (typeof path !== 'string' || path === '') {
      return '/';
    }

    return path === '/'
      ? '/'
      : path.replace(/\/+$/, '');
  }

  constructor() {
    super();

    this.items = [];
    this.linkMap = new Map();
    this.drawer = null;
    this.toggleButton = null;
    this.toggleIcon = null;
    this.nav = null;
    this.isOpen = false;
    this.lovelaceConfig = null;
    this.lovelaceConfigPromise = null;

    this.attachShadow({ mode: 'open' });
  }

  get currentPath() {
    return KioskNav.normalizePath(window.location.pathname);
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.lovelaceConfig && !this.lovelaceConfigPromise) {
      this.lovelaceConfigPromise = this.loadLovelaceConfig();
    }
  }

  addDrawerEventListeners() {
    window.addEventListener('pointerdown', this.handleOutsidePointerDown, {
      capture: true,
    });
    window.addEventListener('keydown', this.handleKeyDown);
  }

  connectedCallback() {
    this.style.setProperty(
      '--kiosk-nav-transition-duration',
      `${KioskNav.TRANSITION_DURATION_MS}ms`,
    );

    window.addEventListener(
      'location-changed',
      this.handleLocationChanged,
    );

    window.addEventListener(
      'popstate',
      this.handleLocationChanged,
    );

    this.updateActiveItem();
  }

  disconnectedCallback() {
    window.removeEventListener(
      'location-changed',
      this.handleLocationChanged,
    );

    window.removeEventListener(
      'popstate',
      this.handleLocationChanged,
    );

    this.removeDrawerEventListeners();
  }

  async loadLovelaceConfig() {
    const [, dashboardPath] = this.currentPath.split('/');

    try {
      const config = await this._hass.callWS({
        type: 'lovelace/config',
        url_path: dashboardPath,
      });

      this.lovelaceConfig = config;

      this.items = config.views.map(({ title, path, icon }) => ({
        label: title,
        icon,
        path: KioskNav.normalizePath(`/${dashboardPath}/${path ?? 0}`),
      }));

      if (!KioskNav.logged) {
        KioskNav.logInfo(this.items);
        KioskNav.logged = true;
      }

      await this.render();
    } catch (error) {
      this.renderError(error);
    } finally {
      this.lovelaceConfigPromise = null;
    }
  }

  async navigate(event, path) {
    event.preventDefault();

    const normalizedPath = KioskNav.normalizePath(path);

    if (this.currentPath === normalizedPath) {
      this.setDrawerOpen(false);

      return;
    }

    const wasOpen = this.isOpen;

    this.setDrawerOpen(false);

    if (wasOpen) {
      await this.waitForDrawerTransition();
    }

    window.history.pushState(null, '', normalizedPath);

    window.dispatchEvent(
      new CustomEvent('location-changed', {
        detail: {
          replace: false,
        },
      }),
    );
  }

  removeDrawerEventListeners() {
    window.removeEventListener('pointerdown', this.handleOutsidePointerDown, {
      capture: true,
    });
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  async render() {
    try {
      const { items } = this;
      const navId  = 'kiosk-nav-items';

      this.linkMap.clear();

      const drawer = document.createElement('div');
      drawer.classList.add('drawer');

      const toggleButton = document.createElement('button');
      toggleButton.classList.add('handle');
      toggleButton.type = 'button';
      toggleButton.addEventListener('click', this.handleDrawerToggle);

      const toggleIcon = document.createElement('ha-icon');
      toggleIcon.classList.add('handle-icon');
      toggleIcon.setAttribute('icon', 'mdi:chevron-up');

      const toggleText = document.createElement('span');
      toggleText.textContent = 'Navigace';
      toggleButton.append(toggleIcon, toggleText);
      toggleButton.setAttribute('aria-controls', navId);

      const nav = document.createElement('nav');
      nav.id = navId;

      items.forEach(({ icon, label, path }) => {
        const link = document.createElement('a');
        link.title = label;

        link.href = path;

        if (icon) {
          const haIcon = document.createElement('ha-icon');
          haIcon.setAttribute('icon', icon);

          link.append(haIcon);
        }

        const text = document.createElement('span');
        text.textContent = label;

        link.append(text);

        link.addEventListener('click', (event) => {
          this.navigate(event, path);
        });

        this.linkMap.set(path, link);

        nav.append(link);
      });

      drawer.append(toggleButton, nav);

      const stylesheet = await KioskNav.loadStylesheet();
      this.shadowRoot.adoptedStyleSheets = [stylesheet];
      this.shadowRoot.replaceChildren(drawer);

      this.drawer = drawer;
      this.toggleButton = toggleButton;
      this.toggleIcon = toggleIcon;
      this.nav = nav;

      this.updateDrawerState();
      this.updateActiveItem();
    } catch (error) {
      this.renderError(error);
    }
  }

  renderError(error) {
    console.error('kiosk-nav:', error);

    const message = document.createElement('div');

    message.textContent = `Kiosk Nav error: ${error.message}`;

    this.shadowRoot.replaceChildren(message);
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Kiosk Nav requires a card configuration.');
    }

    this.config = config;
  }

  setDrawerOpen(isOpen) {
    if (this.isOpen === isOpen) {
      return;
    }

    this.isOpen = isOpen;
    this.updateDrawerState();
  }

  updateActiveItem() {
    this.linkMap.forEach((link, path) => {
      const isActive = KioskNav.normalizePath(path) === this.currentPath;

      link.toggleAttribute('data-active', isActive);

      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  waitForDrawerTransition() {
    if (!this.drawer || KioskNav.TRANSITION_DURATION_MS === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let isResolved = false;

      const finish = () => {
        if (isResolved) {
          return;
        }

        isResolved = true;
        this.drawer.removeEventListener('transitionend', handleTransitionEnd);
        resolve();
      };

      const handleTransitionEnd = (event) => {
        if (event.target !== this.drawer || event.propertyName !== 'transform') {
          return;
        }

        finish();
      };

      this.drawer.addEventListener('transitionend', handleTransitionEnd);
      window.setTimeout(finish, KioskNav.TRANSITION_DURATION_MS + KioskNav.TRANSITION_FALLBACK_MS);
    });
  }

  updateDrawerState() {
    if (!this.drawer || !this.toggleButton || !this.toggleIcon || !this.nav) {
      return;
    }

    this.drawer.toggleAttribute('data-open', this.isOpen);

    if (this.isOpen) {
      this.addDrawerEventListeners();
    } else {
      this.removeDrawerEventListeners();
    }

    this.nav.toggleAttribute('inert', !this.isOpen);
    this.nav.setAttribute('aria-hidden', String(!this.isOpen));

    this.toggleButton.setAttribute('aria-expanded', String(this.isOpen));
    this.toggleButton.setAttribute(
      'aria-label',
      this.isOpen ? 'Close navigation' : 'Open navigation',
    );

    this.toggleButton.title = this.isOpen ? 'Close navigation' : 'Open navigation';
  }
}

if (!customElements.get('kiosk-nav')) {
  customElements.define('kiosk-nav', KioskNav);
}
