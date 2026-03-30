"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MermaidIconifyPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  enabledPacks: ["mdi"],
  searchText: "",
  showOnlyEnabled: false,
  cacheTtlHours: 24,
  maxIconsInPicker: 200,
  previewSize: 24,
  collectionsCache: void 0
};
var IconifyService = class {
  constructor() {
    this.apiBase = "https://api.iconify.design";
    this.packBase = "https://unpkg.com";
  }
  async getJson(url) {
    const response = await (0, import_obsidian.requestUrl)({
      url,
      method: "GET",
      throw: false,
      headers: { Accept: "application/json" }
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return JSON.parse(response.text ?? "");
  }
  fetchCollections() {
    return this.getJson(`${this.apiBase}/collections?pretty=0`);
  }
  fetchCollection(prefix) {
    return this.getJson(
      `${this.apiBase}/collection?prefix=${encodeURIComponent(prefix)}`
    );
  }
  fetchPack(prefix) {
    return this.getJson(`${this.packBase}/@iconify-json/${encodeURIComponent(prefix)}/icons.json`);
  }
  getSvgUrl(prefix, iconName, size) {
    return `${this.apiBase}/${encodeURIComponent(prefix)}/${encodeURIComponent(iconName)}.svg?height=${size}`;
  }
};
var MermaidPackRegistry = class {
  constructor(iconify) {
    this.iconify = iconify;
    this.registered = /* @__PURE__ */ new Set();
  }
  async ensureRegistered(prefixes) {
    const pending = prefixes.map((value) => value.trim()).filter(Boolean).filter((value) => !this.registered.has(value));
    if (pending.length === 0) {
      return;
    }
    const mermaid = await (0, import_obsidian.loadMermaid)();
    mermaid.registerIconPacks(
      pending.map((prefix) => ({
        name: prefix,
        loader: async () => this.iconify.fetchPack(prefix)
      }))
    );
    pending.forEach((prefix) => this.registered.add(prefix));
  }
};
function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}
var IconPickerModal = class extends import_obsidian.Modal {
  constructor(app, plugin, prefix) {
    super(app);
    this.plugin = plugin;
    this.prefix = prefix;
    this.iconNames = [];
    this.selectedIcon = "";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("mermaid-iconify-modal");
    this.setTitle(`Icons from ${this.prefix}`);
    contentEl.createDiv({
      cls: "mermaid-iconify-modal-help",
      text: `Copy Mermaid-ready syntax like ${this.prefix}:icon-name.`
    });
    this.searchEl = contentEl.createEl("input", {
      type: "text",
      placeholder: "Search icons\u2026"
    });
    this.searchEl.addClass("mermaid-iconify-modal-search");
    this.searchEl.addEventListener("input", () => this.renderList());
    const previewCard = contentEl.createDiv({ cls: "mermaid-iconify-preview-card" });
    const previewHead = previewCard.createDiv({ cls: "mermaid-iconify-preview-head" });
    this.previewImageEl = previewHead.createEl("img", {
      cls: "mermaid-iconify-preview-image",
      attr: { alt: "Icon preview" }
    });
    this.previewImageEl.hidden = true;
    this.previewImageEl.addEventListener("error", () => {
      this.previewImageEl.hidden = true;
    });
    const previewMeta = previewHead.createDiv();
    this.previewCodeEl = previewMeta.createDiv({ cls: "mermaid-iconify-code" });
    previewMeta.createDiv({
      cls: "mermaid-iconify-note",
      text: "Copy the icon token or a ready-to-paste Mermaid snippet."
    });
    const actions = previewCard.createDiv({ cls: "mermaid-iconify-actions" });
    actions.createEl("button", { text: "Copy icon" }).addEventListener("click", () => {
      if (!this.selectedIcon) return;
      void this.copy(`${this.prefix}:${this.selectedIcon}`, `Copied ${this.prefix}:${this.selectedIcon}`);
    });
    actions.createEl("button", { text: "Copy Mermaid snippet" }).addEventListener("click", () => {
      if (!this.selectedIcon) return;
      const snippet = ["architecture-beta", `    service example(${this.prefix}:${this.selectedIcon})[Example]`].join("\n");
      void this.copy(snippet, "Mermaid snippet copied");
    });
    this.statusEl = contentEl.createDiv({ cls: "mermaid-iconify-note", text: "Loading icons\u2026" });
    this.listEl = contentEl.createDiv({ cls: "mermaid-iconify-modal-list" });
    void this.loadIcons();
  }
  onClose() {
    this.contentEl.empty();
  }
  async copy(text, notice) {
    try {
      await copyToClipboard(text);
      new import_obsidian.Notice(notice);
    } catch {
      new import_obsidian.Notice("Copy failed.");
    }
  }
  async loadIcons() {
    try {
      this.iconNames = await this.plugin.getPackIconNames(this.prefix);
      this.statusEl.setText(`Pack total: ${this.iconNames.length} icons`);
      this.renderList();
    } catch {
      this.statusEl.setText("Could not load icons for this pack.");
      this.listEl.empty();
      this.listEl.createDiv({ cls: "mermaid-iconify-modal-empty", text: "The icon list could not be retrieved." });
    }
  }
  updatePreview(iconName) {
    this.selectedIcon = iconName;
    this.previewCodeEl.setText(`${this.prefix}:${iconName}`);
    this.previewImageEl.src = this.plugin.getIconSvgUrl(this.prefix, iconName);
    this.previewImageEl.hidden = false;
  }
  renderList() {
    this.listEl.empty();
    const query = this.searchEl.value.trim().toLowerCase();
    const filtered = query ? this.iconNames.filter((name) => name.toLowerCase().includes(query)) : this.iconNames;
    if (filtered.length === 0) {
      this.statusEl.setText("No icons match the current filter.");
      this.listEl.createDiv({ cls: "mermaid-iconify-modal-empty", text: "Nothing matches the current filter." });
      return;
    }
    const shown = filtered.slice(0, this.plugin.settings.maxIconsInPicker);
    const hiddenCount = Math.max(0, filtered.length - shown.length);
    this.statusEl.setText(
      hiddenCount > 0 ? `Showing ${shown.length} of ${filtered.length} filtered results.` : `${filtered.length} results.`
    );
    if (!this.selectedIcon || !shown.includes(this.selectedIcon)) {
      this.updatePreview(shown[0]);
    }
    shown.forEach((iconName) => {
      const row = this.listEl.createDiv({ cls: "mermaid-iconify-modal-row" });
      row.toggleClass("is-selected", iconName === this.selectedIcon);
      const left = row.createDiv({ cls: "mermaid-iconify-modal-left" });
      const image = left.createEl("img", {
        cls: "mermaid-iconify-inline-image",
        attr: {
          src: this.plugin.getIconSvgUrl(this.prefix, iconName),
          alt: `${this.prefix}:${iconName}`,
          loading: "lazy"
        }
      });
      image.addEventListener("error", () => {
        image.replaceWith(left.createDiv({ cls: "mermaid-iconify-inline-fallback", text: "?" }));
      });
      const labels = left.createDiv({ cls: "mermaid-iconify-label-wrap" });
      labels.createDiv({ cls: "mermaid-iconify-code", text: iconName });
      labels.createDiv({ cls: "mermaid-iconify-note", text: `${this.prefix}:${iconName}` });
      row.createEl("button", { text: "Copy" }).addEventListener("click", (event) => {
        event.stopPropagation();
        void this.copy(`${this.prefix}:${iconName}`, `Copied ${this.prefix}:${iconName}`);
      });
      row.addEventListener("click", () => {
        this.updatePreview(iconName);
        this.renderList();
      });
    });
  }
};
var MermaidIconifySettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Mermaid Iconify" });
    containerEl.createDiv({
      cls: "mermaid-iconify-help",
      text: "Discover official Iconify packs, enable them for Mermaid, and open an icon picker."
    });
    new import_obsidian.Setting(containerEl).setName("Filter packs").setDesc("Filter by prefix, pack name, author, category, or license.").addText(
      (text) => text.setPlaceholder("mdi, lucide, logos\u2026").setValue(this.plugin.settings.searchText).onChange(async (value) => {
        this.plugin.settings.searchText = value;
        await this.plugin.saveSettings();
        await this.renderPacks();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Show only enabled packs").setDesc("Hide packs that are not currently enabled.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showOnlyEnabled).onChange(async (value) => {
        this.plugin.settings.showOnlyEnabled = value;
        await this.plugin.saveSettings();
        await this.renderPacks();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Catalog cache TTL").setDesc("Hours before the Iconify catalog is refreshed automatically.").addText(
      (text) => text.setPlaceholder("24").setValue(String(this.plugin.settings.cacheTtlHours)).onChange(async (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return;
        this.plugin.settings.cacheTtlHours = parsed;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Picker result limit").setDesc("Maximum number of filtered icons shown at once.").addText(
      (text) => text.setPlaceholder("200").setValue(String(this.plugin.settings.maxIconsInPicker)).onChange(async (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return;
        this.plugin.settings.maxIconsInPicker = parsed;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Preview size").setDesc("SVG preview height in pixels.").addText(
      (text) => text.setPlaceholder("24").setValue(String(this.plugin.settings.previewSize)).onChange(async (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 12 || parsed > 128) return;
        this.plugin.settings.previewSize = parsed;
        await this.plugin.saveSettings();
      })
    );
    const actions = containerEl.createDiv({ cls: "mermaid-iconify-actions" });
    actions.createEl("button", { text: "Refresh official catalog" }).addEventListener("click", async () => {
      try {
        await this.plugin.refreshCollections(true);
        new import_obsidian.Notice("Iconify catalog refreshed.");
        await this.renderPacks();
      } catch {
        new import_obsidian.Notice("Could not refresh the Iconify catalog.");
      }
    });
    actions.createEl("button", { text: "Open mdi picker" }).addEventListener("click", async () => {
      try {
        await this.plugin.enablePack("mdi");
        new IconPickerModal(this.app, this.plugin, "mdi").open();
      } catch {
        new import_obsidian.Notice("Could not open the mdi picker.");
      }
    });
    this.metaEl = containerEl.createDiv({ cls: "mermaid-iconify-meta" });
    this.listEl = containerEl.createDiv({ cls: "mermaid-iconify-pack-list" });
    void this.renderPacks();
  }
  async renderPacks() {
    this.listEl.empty();
    this.metaEl.setText("Loading catalog\u2026");
    try {
      const collections = await this.plugin.getCollections();
      const entries = Object.entries(collections).filter(([prefix, info]) => {
        if (this.plugin.settings.showOnlyEnabled && !this.plugin.settings.enabledPacks.includes(prefix)) {
          return false;
        }
        const query = this.plugin.settings.searchText.trim().toLowerCase();
        if (!query) return true;
        const haystack = [
          prefix,
          info.name,
          info.author?.name ?? "",
          info.license?.title ?? "",
          info.category ?? ""
        ].join(" ").toLowerCase();
        return haystack.includes(query);
      }).sort((a, b) => a[0].localeCompare(b[0]));
      this.metaEl.setText(`Enabled packs: ${this.plugin.settings.enabledPacks.length} \u2022 Matching packs: ${entries.length}`);
      if (entries.length === 0) {
        this.listEl.createDiv({ text: "No packs found." });
        return;
      }
      entries.forEach(([prefix, info]) => {
        const enabled = this.plugin.settings.enabledPacks.includes(prefix);
        const parts = [`${info.total ?? 0} icons`];
        if (info.author?.name) parts.push(`author: ${info.author.name}`);
        if (info.license?.title) parts.push(`license: ${info.license.title}`);
        if (info.category) parts.push(`category: ${info.category}`);
        if (info.samples?.length) parts.push(`samples: ${info.samples.slice(0, 3).join(", ")}`);
        parts.push(`Mermaid syntax: ${prefix}:icon-name`);
        const setting = new import_obsidian.Setting(this.listEl).setName(`${prefix} \u2014 ${info.name}`).setDesc(parts.join(" \u2022 "));
        setting.addToggle(
          (toggle) => toggle.setValue(enabled).onChange(async (value) => {
            try {
              if (value) {
                await this.plugin.enablePack(prefix);
                new import_obsidian.Notice(`Pack '${prefix}' enabled.`);
              } else {
                await this.plugin.disablePack(prefix);
                new import_obsidian.Notice(`Pack '${prefix}' disabled for future sessions.`);
              }
              await this.renderPacks();
            } catch {
              new import_obsidian.Notice(`Could not update pack '${prefix}'.`);
            }
          })
        );
        setting.addButton(
          (button) => button.setButtonText("Picker").onClick(async () => {
            try {
              await this.plugin.enablePack(prefix);
              new IconPickerModal(this.app, this.plugin, prefix).open();
            } catch {
              new import_obsidian.Notice(`Could not open the picker for '${prefix}'.`);
            }
          })
        );
      });
    } catch {
      this.metaEl.setText("Could not load the Iconify catalog.");
      this.listEl.createDiv({ text: "The official Iconify catalog could not be retrieved." });
    }
  }
};
var MermaidIconifyPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.iconify = new IconifyService();
    this.registry = new MermaidPackRegistry(this.iconify);
    this.addSettingTab(new MermaidIconifySettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => {
      void this.registry.ensureRegistered(this.settings.enabledPacks).catch(() => {
        new import_obsidian.Notice("Some Mermaid icon packs could not be registered.");
      });
    });
  }
  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded ?? {}
    };
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async enablePack(prefix) {
    const clean = prefix.trim();
    if (!clean) throw new Error("Invalid pack prefix.");
    if (!this.settings.enabledPacks.includes(clean)) {
      this.settings.enabledPacks = [...this.settings.enabledPacks, clean].sort();
      await this.saveSettings();
    }
    await this.registry.ensureRegistered([clean]);
  }
  async disablePack(prefix) {
    this.settings.enabledPacks = this.settings.enabledPacks.filter((item) => item !== prefix);
    await this.saveSettings();
  }
  async getCollections() {
    const cache = this.settings.collectionsCache;
    const ttlMs = this.settings.cacheTtlHours * 60 * 60 * 1e3;
    if (cache && Date.now() - cache.fetchedAt < ttlMs) {
      return cache.data;
    }
    return this.refreshCollections(false);
  }
  async refreshCollections(force) {
    if (!force) {
      const cache = this.settings.collectionsCache;
      const ttlMs = this.settings.cacheTtlHours * 60 * 60 * 1e3;
      if (cache && Date.now() - cache.fetchedAt < ttlMs) {
        return cache.data;
      }
    }
    const data = await this.iconify.fetchCollections();
    this.settings.collectionsCache = {
      fetchedAt: Date.now(),
      data
    };
    await this.saveSettings();
    return data;
  }
  async getPackIconNames(prefix) {
    const collection = await this.iconify.fetchCollection(prefix);
    const names = /* @__PURE__ */ new Set();
    collection.uncategorized?.forEach((name) => names.add(name));
    Object.values(collection.categories ?? {}).forEach((group) => group.forEach((name) => names.add(name)));
    collection.hidden?.forEach((name) => names.delete(name));
    return [...names].sort();
  }
  getIconSvgUrl(prefix, iconName) {
    return this.iconify.getSvgUrl(prefix, iconName, this.settings.previewSize);
  }
};
