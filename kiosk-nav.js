class KioskNav extends HTMLElement {

  handleLocationChanged = () => {
    this.updateActiveItem();
  };

  static VERSION = '1.0.0';
  static logged = false;
  static stylesheet = null;
  static stylesheetUrl = new URL('kiosk-nav.css', import.meta.url);

  static normalizePath(path) {
    if (typeof path !== 'string' || path === '') {
      return '/';
    }

    return path === '/'
      ? '/'
      : path.replace(/\/+$/, '');
  }

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
        content: "≡ kiosk-nav",
        background: "#12dba9",
        color: "#111",
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
      "border-color": "#424242",
      "border-style": "solid",
      display: "inline-block",
      "font-family": "monospace",
      "font-size": "12px",
    };

    const styleToString = (style) => Object.entries(style)
      .map(([property, value]) => `${property}: ${value}`)
      .join("; ");

    lines.forEach(
      (
        {
          content,
          background = "white",
          color = "#424242",
        },
        index,
      ) => {
        const isFirstLine = index === 0;
        const isLastLine = index === lastIndex;

        const endTypo = isFirstLine ? '⋮' : ' ';

        output.push(
          `%c${content.padEnd(maxLength)}%c${endTypo}%c`,
        );

        if (!isLastLine) {
          output.push("\n");
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

        styles.push("");
      },
    );

    console.info(output.join(''), ...styles);
  }

  constructor() {
    super();

    this.items = [];
    this.linkMap = new Map();
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

  connectedCallback() {
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

  navigate(event, path) {
    event.preventDefault();

    const normalizedPath = KioskNav.normalizePath(path);

    if (this.currentPath === normalizedPath) {
      return;
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

  async render() {
    try {
      const { items } = this;

      this.linkMap.clear();

      const nav = document.createElement('nav');

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

      const stylesheet = await KioskNav.loadStylesheet();
      this.shadowRoot.adoptedStyleSheets = [stylesheet];
      this.shadowRoot.replaceChildren(nav);

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
      throw new Error(`Unable to load stylesheet ${KioskNav.stylesheetUrl.href}: ${response.status}`);
    }

    this.config = config;
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
}

if (!customElements.get('kiosk-nav')) {
  customElements.define('kiosk-nav', KioskNav);
}
