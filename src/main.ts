import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  loadMermaid,
  requestUrl,
} from 'obsidian';

interface IconifyAuthorInfo {
  name: string;
  url?: string;
}

interface IconifyLicenseInfo {
  title: string;
  spdx?: string;
  url?: string;
}

interface IconifyCollectionInfo {
  name: string;
  total: number;
  author?: IconifyAuthorInfo;
  license?: IconifyLicenseInfo;
  samples?: string[];
  category?: string;
}

type IconifyCollectionsResponse = Record<string, IconifyCollectionInfo>;

interface IconifyCollectionResponse {
  prefix: string;
  uncategorized?: string[];
  categories?: Record<string, string[]>;
  hidden?: string[];
}

interface CollectionsCacheEntry {
  fetchedAt: number;
  data: IconifyCollectionsResponse;
}

interface PluginSettingsData {
  enabledPacks: string[];
  searchText: string;
  showOnlyEnabled: boolean;
  cacheTtlHours: number;
  maxIconsInPicker: number;
  previewSize: number;
  collectionsCache?: CollectionsCacheEntry;
}

const DEFAULT_SETTINGS: PluginSettingsData = {
  enabledPacks: ['mdi'],
  searchText: '',
  showOnlyEnabled: false,
  cacheTtlHours: 24,
  maxIconsInPicker: 200,
  previewSize: 24,
  collectionsCache: undefined,
};

class IconifyService {
  private readonly apiBase = 'https://api.iconify.design';
  private readonly packBase = 'https://unpkg.com';

  private async getJson<T>(url: string): Promise<T> {
    const response = await requestUrl({
      url,
      method: 'GET',
      throw: false,
      headers: { Accept: 'application/json' },
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return JSON.parse(response.text ?? '') as T;
  }

  fetchCollections(): Promise<IconifyCollectionsResponse> {
    return this.getJson<IconifyCollectionsResponse>(`${this.apiBase}/collections?pretty=0`);
  }

  fetchCollection(prefix: string): Promise<IconifyCollectionResponse> {
    return this.getJson<IconifyCollectionResponse>(
      `${this.apiBase}/collection?prefix=${encodeURIComponent(prefix)}`
    );
  }

  fetchPack(prefix: string): Promise<unknown> {
    return this.getJson<unknown>(`${this.packBase}/@iconify-json/${encodeURIComponent(prefix)}/icons.json`);
  }

  getSvgUrl(prefix: string, iconName: string, size: number): string {
    return `${this.apiBase}/${encodeURIComponent(prefix)}/${encodeURIComponent(iconName)}.svg?height=${size}`;
  }
}

class MermaidPackRegistry {
  private readonly registered = new Set<string>();

  constructor(private readonly iconify: IconifyService) {}

  async ensureRegistered(prefixes: string[]): Promise<void> {
    const pending = prefixes
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => !this.registered.has(value));

    if (pending.length === 0) {
      return;
    }

    const mermaid = await loadMermaid();

    mermaid.registerIconPacks(
      pending.map((prefix) => ({
        name: prefix,
        loader: async () => this.iconify.fetchPack(prefix),
      }))
    );

    pending.forEach((prefix) => this.registered.add(prefix));
  }
}

<<<<<<< HEAD
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard API is unavailable in this environment.');
=======
async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard API is not available.');
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
  }

  await navigator.clipboard.writeText(text);
}

class IconPickerModal extends Modal {
  private iconNames: string[] = [];
  private selectedIcon = '';
  private statusEl!: HTMLDivElement;
  private listEl!: HTMLDivElement;
  private searchEl!: HTMLInputElement;
  private previewImageEl!: HTMLImageElement;
  private previewCodeEl!: HTMLDivElement;

  constructor(
    app: App,
    private readonly plugin: MermaidIconifyPlugin,
    private readonly prefix: string
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('mermaid-iconify-modal');

    this.setTitle(`Icons from ${this.prefix}`);

    contentEl.createDiv({
      cls: 'mermaid-iconify-modal-help',
      text: `Copy Mermaid-ready syntax like ${this.prefix}:icon-name.`,
    });

    this.searchEl = contentEl.createEl('input', {
      type: 'text',
      placeholder: 'Search icons…',
    });
    this.searchEl.addClass('mermaid-iconify-modal-search');
    this.searchEl.addEventListener('input', () => {
      this.renderList();
    });

    const previewCard = contentEl.createDiv({ cls: 'mermaid-iconify-preview-card' });
    const previewHead = previewCard.createDiv({ cls: 'mermaid-iconify-preview-head' });
    this.previewImageEl = previewHead.createEl('img', {
      cls: 'mermaid-iconify-preview-image',
      attr: { alt: 'Icon preview' },
    });
    this.previewImageEl.hidden = true;
    this.previewImageEl.addEventListener('error', () => {
      this.previewImageEl.hidden = true;
    });

    const previewMeta = previewHead.createDiv();
    this.previewCodeEl = previewMeta.createDiv({ cls: 'mermaid-iconify-code' });
    previewMeta.createDiv({
      cls: 'mermaid-iconify-note',
      text: 'Copy the icon token or a ready-to-paste Mermaid snippet.',
    });

    const actions = previewCard.createDiv({ cls: 'mermaid-iconify-actions' });
    actions.createEl('button', { text: 'Copy icon' }).addEventListener('click', () => {
      void this.handleCopyIconClick();
    });

    actions.createEl('button', { text: 'Copy Mermaid snippet' }).addEventListener('click', () => {
      void this.handleCopySnippetClick();
    });

    this.statusEl = contentEl.createDiv({ cls: 'mermaid-iconify-note', text: 'Loading icons…' });
    this.listEl = contentEl.createDiv({ cls: 'mermaid-iconify-modal-list' });

    void this.loadIcons();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async handleCopyIconClick(): Promise<void> {
    if (!this.selectedIcon) {
      return;
    }

    await this.copy(`${this.prefix}:${this.selectedIcon}`, `Copied ${this.prefix}:${this.selectedIcon}`);
  }

  private async handleCopySnippetClick(): Promise<void> {
    if (!this.selectedIcon) {
      return;
    }

    const snippet = ['architecture-beta', `    service example(${this.prefix}:${this.selectedIcon})[Example]`].join('\n');
    await this.copy(snippet, 'Mermaid snippet copied');
  }

  private async copy(text: string, notice: string): Promise<void> {
    try {
      await copyToClipboard(text);
      new Notice(notice);
    } catch (error) {
      console.error(error);
      new Notice('Copy failed.');
    }
  }

  private async loadIcons(): Promise<void> {
    try {
      this.iconNames = await this.plugin.getPackIconNames(this.prefix);
      this.statusEl.setText(`Pack total: ${this.iconNames.length} icons`);
      this.renderList();
    } catch (error) {
      console.error(error);
      this.statusEl.setText('Could not load icons for this pack.');
      this.listEl.empty();
      this.listEl.createDiv({ cls: 'mermaid-iconify-modal-empty', text: 'The icon list could not be retrieved.' });
    }
  }

  private updatePreview(iconName: string): void {
    this.selectedIcon = iconName;
    this.previewCodeEl.setText(`${this.prefix}:${iconName}`);
    this.previewImageEl.src = this.plugin.getIconSvgUrl(this.prefix, iconName);
    this.previewImageEl.hidden = false;
  }

  private renderList(): void {
    this.listEl.empty();

    const query = this.searchEl.value.trim().toLowerCase();
    const filtered = query
      ? this.iconNames.filter((name) => name.toLowerCase().includes(query))
      : this.iconNames;

    if (filtered.length === 0) {
      this.statusEl.setText('No icons match the current filter.');
      this.listEl.createDiv({ cls: 'mermaid-iconify-modal-empty', text: 'Nothing matches the current filter.' });
      return;
    }

    const shown = filtered.slice(0, this.plugin.settings.maxIconsInPicker);
    const hiddenCount = Math.max(0, filtered.length - shown.length);

    this.statusEl.setText(
      hiddenCount > 0
        ? `Showing ${shown.length} of ${filtered.length} filtered results.`
        : `${filtered.length} results.`
    );

    if (!this.selectedIcon || !shown.includes(this.selectedIcon)) {
      this.updatePreview(shown[0]);
    }

    shown.forEach((iconName) => {
      const row = this.listEl.createDiv({ cls: 'mermaid-iconify-modal-row' });
      row.toggleClass('is-selected', iconName === this.selectedIcon);

      const left = row.createDiv({ cls: 'mermaid-iconify-modal-left' });
      const image = left.createEl('img', {
        cls: 'mermaid-iconify-inline-image',
        attr: {
          src: this.plugin.getIconSvgUrl(this.prefix, iconName),
          alt: `${this.prefix}:${iconName}`,
          loading: 'lazy',
        },
      });

      image.addEventListener('error', () => {
        image.replaceWith(left.createDiv({ cls: 'mermaid-iconify-inline-fallback', text: '?' }));
      });

      const labels = left.createDiv({ cls: 'mermaid-iconify-label-wrap' });
      labels.createDiv({ cls: 'mermaid-iconify-code', text: iconName });
      labels.createDiv({ cls: 'mermaid-iconify-note', text: `${this.prefix}:${iconName}` });

      row.createEl('button', { text: 'Copy' }).addEventListener('click', (event) => {
        event.stopPropagation();
        void this.copy(`${this.prefix}:${iconName}`, `Copied ${this.prefix}:${iconName}`);
      });

      row.addEventListener('click', () => {
        this.updatePreview(iconName);
        this.renderList();
      });
    });
  }
}

class MermaidIconifySettingTab extends PluginSettingTab {
  private metaEl!: HTMLDivElement;
  private listEl!: HTMLDivElement;

  constructor(app: App, private readonly plugin: MermaidIconifyPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

<<<<<<< HEAD
    new Setting(containerEl).setName('Mermaid Iconify').setHeading();
=======
    new Setting(containerEl)
      .setName('Mermaid Iconify')
      .setHeading();

>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
    containerEl.createDiv({
      cls: 'mermaid-iconify-help',
      text: 'Discover official Iconify packs, enable them for Mermaid, and open an icon picker.',
    });

    new Setting(containerEl)
      .setName('Filter packs')
      .setDesc('Filter by prefix, pack name, author, category, or license.')
      .addText((text) =>
<<<<<<< HEAD
        text.setPlaceholder('mdi, lucide, logos…').setValue(this.plugin.settings.searchText).onChange((value) => {
          void (async () => {
            this.plugin.settings.searchText = value;
            await this.plugin.saveSettings();
            await this.renderPacks();
          })();
        })
=======
        text
          .setPlaceholder('mdi, lucide, logos…')
          .setValue(this.plugin.settings.searchText)
          .onChange((value) => {
            void this.handleSearchTextChange(value);
          })
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
      );

    new Setting(containerEl)
      .setName('Show only enabled packs')
      .setDesc('Hide packs that are not currently enabled.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showOnlyEnabled).onChange((value) => {
<<<<<<< HEAD
          void (async () => {
            this.plugin.settings.showOnlyEnabled = value;
            await this.plugin.saveSettings();
            await this.renderPacks();
          })();
=======
          void this.handleShowOnlyEnabledChange(value);
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
        })
      );

    new Setting(containerEl)
      .setName('Catalog cache time-to-live')
      .setDesc('Hours before the Iconify catalog is refreshed automatically.')
      .addText((text) =>
        text.setPlaceholder('24').setValue(String(this.plugin.settings.cacheTtlHours)).onChange((value) => {
<<<<<<< HEAD
          void (async () => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            this.plugin.settings.cacheTtlHours = parsed;
            await this.plugin.saveSettings();
          })();
=======
          void this.handleCacheTtlChange(value);
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
        })
      );

    new Setting(containerEl)
      .setName('Picker result limit')
      .setDesc('Maximum number of filtered icons shown at once.')
      .addText((text) =>
        text.setPlaceholder('200').setValue(String(this.plugin.settings.maxIconsInPicker)).onChange((value) => {
<<<<<<< HEAD
          void (async () => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            this.plugin.settings.maxIconsInPicker = parsed;
            await this.plugin.saveSettings();
          })();
=======
          void this.handleMaxIconsChange(value);
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
        })
      );

    new Setting(containerEl)
      .setName('Preview size')
      .setDesc('SVG preview height in pixels.')
      .addText((text) =>
        text.setPlaceholder('24').setValue(String(this.plugin.settings.previewSize)).onChange((value) => {
<<<<<<< HEAD
          void (async () => {
            const parsed = Number(value);
            if (!Number.isFinite(parsed) || parsed < 12 || parsed > 128) return;
            this.plugin.settings.previewSize = parsed;
            await this.plugin.saveSettings();
          })();
=======
          void this.handlePreviewSizeChange(value);
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
        })
      );

    const actions = containerEl.createDiv({ cls: 'mermaid-iconify-actions' });
    actions.createEl('button', { text: 'Refresh official catalog' }).addEventListener('click', () => {
<<<<<<< HEAD
      void (async () => {
        try {
          await this.plugin.refreshCollections(true);
          new Notice('Iconify catalog refreshed.');
          await this.renderPacks();
        } catch {
          new Notice('Could not refresh the Iconify catalog.');
        }
      })();
    });

    actions.createEl('button', { text: 'Open mdi picker' }).addEventListener('click', () => {
      void (async () => {
        try {
          await this.plugin.enablePack('mdi');
          new IconPickerModal(this.app, this.plugin, 'mdi').open();
        } catch {
          new Notice('Could not open the mdi picker.');
        }
      })();
=======
      void this.handleRefreshCatalogClick();
    });

    actions.createEl('button', { text: 'Open MDI picker' }).addEventListener('click', () => {
      void this.handleOpenMdiPickerClick();
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
    });

    this.metaEl = containerEl.createDiv({ cls: 'mermaid-iconify-meta' });
    this.listEl = containerEl.createDiv({ cls: 'mermaid-iconify-pack-list' });

    void this.renderPacks();
  }

  private async handleSearchTextChange(value: string): Promise<void> {
    this.plugin.settings.searchText = value;
    await this.plugin.saveSettings();
    await this.renderPacks();
  }

  private async handleShowOnlyEnabledChange(value: boolean): Promise<void> {
    this.plugin.settings.showOnlyEnabled = value;
    await this.plugin.saveSettings();
    await this.renderPacks();
  }

  private async handleCacheTtlChange(value: string): Promise<void> {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    this.plugin.settings.cacheTtlHours = parsed;
    await this.plugin.saveSettings();
  }

  private async handleMaxIconsChange(value: string): Promise<void> {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    this.plugin.settings.maxIconsInPicker = parsed;
    await this.plugin.saveSettings();
  }

  private async handlePreviewSizeChange(value: string): Promise<void> {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 12 || parsed > 128) {
      return;
    }

    this.plugin.settings.previewSize = parsed;
    await this.plugin.saveSettings();
  }

  private async handleRefreshCatalogClick(): Promise<void> {
    try {
      await this.plugin.refreshCollections(true);
      new Notice('Iconify catalog refreshed.');
      await this.renderPacks();
    } catch (error) {
      console.error(error);
      new Notice('Could not refresh the Iconify catalog.');
    }
  }

  private async handleOpenMdiPickerClick(): Promise<void> {
    try {
      await this.plugin.enablePack('mdi');
      new IconPickerModal(this.app, this.plugin, 'mdi').open();
    } catch (error) {
      console.error(error);
      new Notice('Could not open the MDI picker.');
    }
  }

  private async updatePackEnabled(prefix: string, enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        await this.plugin.enablePack(prefix);
        new Notice(`Pack '${prefix}' enabled.`);
      } else {
        await this.plugin.disablePack(prefix);
        new Notice(`Pack '${prefix}' disabled for future sessions.`);
      }

      await this.renderPacks();
    } catch (error) {
      console.error(error);
      new Notice(`Could not update pack '${prefix}'.`);
    }
  }

  private async openPackPicker(prefix: string): Promise<void> {
    try {
      await this.plugin.enablePack(prefix);
      new IconPickerModal(this.app, this.plugin, prefix).open();
    } catch (error) {
      console.error(error);
      new Notice(`Could not open the picker for '${prefix}'.`);
    }
  }

  private async renderPacks(): Promise<void> {
    this.listEl.empty();
    this.metaEl.setText('Loading catalog…');

    try {
      const collections = await this.plugin.getCollections();
      const entries = Object.entries(collections)
        .filter(([prefix, info]) => {
          if (this.plugin.settings.showOnlyEnabled && !this.plugin.settings.enabledPacks.includes(prefix)) {
            return false;
          }

          const query = this.plugin.settings.searchText.trim().toLowerCase();
          if (!query) {
            return true;
          }

          const haystack = [
            prefix,
            info.name,
            info.author?.name ?? '',
            info.license?.title ?? '',
            info.category ?? '',
          ]
            .join(' ')
            .toLowerCase();

          return haystack.includes(query);
        })
        .sort((a, b) => a[0].localeCompare(b[0]));

      this.metaEl.setText(`Enabled packs: ${this.plugin.settings.enabledPacks.length} • Matching packs: ${entries.length}`);

      if (entries.length === 0) {
        this.listEl.createDiv({ text: 'No packs found.' });
        return;
      }

      entries.forEach(([prefix, info]) => {
        const enabled = this.plugin.settings.enabledPacks.includes(prefix);
        const parts = [`${info.total ?? 0} icons`];
        if (info.author?.name) parts.push(`author: ${info.author.name}`);
        if (info.license?.title) parts.push(`license: ${info.license.title}`);
        if (info.category) parts.push(`category: ${info.category}`);
        if (info.samples?.length) parts.push(`samples: ${info.samples.slice(0, 3).join(', ')}`);
        parts.push(`Mermaid syntax: ${prefix}:icon-name`);

        const setting = new Setting(this.listEl)
          .setName(`${prefix} — ${info.name}`)
          .setDesc(parts.join(' • '));

        setting.addToggle((toggle) =>
          toggle.setValue(enabled).onChange((value) => {
<<<<<<< HEAD
            void (async () => {
              try {
                if (value) {
                  await this.plugin.enablePack(prefix);
                  new Notice(`Pack '${prefix}' enabled.`);
                } else {
                  await this.plugin.disablePack(prefix);
                  new Notice(`Pack '${prefix}' disabled for future sessions.`);
                }
                await this.renderPacks();
              } catch {
                new Notice(`Could not update pack '${prefix}'.`);
              }
            })();
=======
            void this.updatePackEnabled(prefix, value);
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
          })
        );

        setting.addButton((button) =>
          button.setButtonText('Picker').onClick(() => {
<<<<<<< HEAD
            void (async () => {
              try {
                await this.plugin.enablePack(prefix);
                new IconPickerModal(this.app, this.plugin, prefix).open();
              } catch {
                new Notice(`Could not open the picker for '${prefix}'.`);
              }
            })();
=======
            void this.openPackPicker(prefix);
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
          })
        );
      });
    } catch (error) {
      console.error(error);
      this.metaEl.setText('Could not load the Iconify catalog.');
      this.listEl.createDiv({ text: 'The official Iconify catalog could not be retrieved.' });
    }
  }
}

export default class MermaidIconifyPlugin extends Plugin {
  settings!: PluginSettingsData;

  private iconify!: IconifyService;
  private registry!: MermaidPackRegistry;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.iconify = new IconifyService();
    this.registry = new MermaidPackRegistry(this.iconify);

    this.addSettingTab(new MermaidIconifySettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
<<<<<<< HEAD
      void this.registry.ensureRegistered(this.settings.enabledPacks).catch((error: unknown) => {
        const safeError = toError(error);
        console.error(safeError);
=======
      void this.registry.ensureRegistered(this.settings.enabledPacks).catch((error) => {
        console.error(error);
>>>>>>> d3ebda0 (Fix review issues and clean repository for submission)
        new Notice('Some Mermaid icon packs could not be registered.');
      });
    });
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<PluginSettingsData> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(loaded ?? {}),
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async enablePack(prefix: string): Promise<void> {
    const clean = prefix.trim();
    if (!clean) {
      throw new Error('Invalid pack prefix.');
    }

    if (!this.settings.enabledPacks.includes(clean)) {
      this.settings.enabledPacks = [...this.settings.enabledPacks, clean].sort();
      await this.saveSettings();
    }

    await this.registry.ensureRegistered([clean]);
  }

  async disablePack(prefix: string): Promise<void> {
    this.settings.enabledPacks = this.settings.enabledPacks.filter((item) => item !== prefix);
    await this.saveSettings();
  }

  async getCollections(): Promise<IconifyCollectionsResponse> {
    const cache = this.settings.collectionsCache;
    const ttlMs = this.settings.cacheTtlHours * 60 * 60 * 1000;

    if (cache && Date.now() - cache.fetchedAt < ttlMs) {
      return cache.data;
    }

    return this.refreshCollections(false);
  }

  async refreshCollections(force: boolean): Promise<IconifyCollectionsResponse> {
    if (!force) {
      const cache = this.settings.collectionsCache;
      const ttlMs = this.settings.cacheTtlHours * 60 * 60 * 1000;
      if (cache && Date.now() - cache.fetchedAt < ttlMs) {
        return cache.data;
      }
    }

    const data = await this.iconify.fetchCollections();
    this.settings.collectionsCache = {
      fetchedAt: Date.now(),
      data,
    };
    await this.saveSettings();
    return data;
  }

  async getPackIconNames(prefix: string): Promise<string[]> {
    const collection = await this.iconify.fetchCollection(prefix);
    const names = new Set<string>();

    collection.uncategorized?.forEach((name) => names.add(name));
    Object.values(collection.categories ?? {}).forEach((group) => group.forEach((name) => names.add(name)));
    collection.hidden?.forEach((name) => names.delete(name));

    return [...names].sort();
  }

  getIconSvgUrl(prefix: string, iconName: string): string {
    return this.iconify.getSvgUrl(prefix, iconName, this.settings.previewSize);
  }
}
