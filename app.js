(function () {
  "use strict";

  const DB_NAME = "wardrobe-companion-db";
  const STORE = "items";
  const VERSION = 1;
  const LOCAL_MIRROR_KEY = "dandan-wardrobe-items-v4";
  const LOCAL_MIRROR_TIME_KEY = "dandan-wardrobe-last-save";
  const CATEGORY_CATALOG_KEY = "dandan-wardrobe-category-catalog-v1";

  const seasons = [
    { id: "spring", name: "春", months: [3, 4, 5], hint: "衬衫、薄外套、长袖、牛仔裤更适合忽冷忽热的天气。" },
    { id: "summer", name: "夏", months: [6, 7, 8], hint: "短袖、短裤、裙子、凉鞋优先，颜色可以更清爽。" },
    { id: "autumn", name: "秋", months: [9, 10, 11], hint: "针织、卫衣、风衣、长裤适合叠穿。" },
    { id: "winter", name: "冬", months: [12, 1, 2], hint: "毛衣、大衣、羽绒服、靴子优先保暖。" }
  ];

  const categories = [
    { id: "uncategorized", name: "未分类", icon: "?", seasons: [] },
    { id: "tshirt", name: "短袖", icon: "T", seasons: ["summer"] },
    { id: "longsleeve", name: "长袖", icon: "L", seasons: ["spring", "autumn"] },
    { id: "shirt", name: "衬衫", icon: "S", seasons: ["spring", "summer", "autumn"] },
    { id: "hoodie", name: "卫衣", icon: "H", seasons: ["spring", "autumn"] },
    { id: "sweater", name: "毛衣", icon: "W", seasons: ["autumn", "winter"] },
    { id: "pants", name: "长裤", icon: "P", seasons: ["spring", "autumn", "winter"] },
    { id: "jeans", name: "牛仔裤", icon: "牛", seasons: ["spring", "autumn", "winter"] },
    { id: "sweatpants", name: "卫裤", icon: "卫", seasons: ["spring", "autumn", "winter"] },
    { id: "cargo-pants", name: "工装裤", icon: "工", seasons: ["spring", "autumn", "winter"] },
    { id: "shorts", name: "短裤", icon: "B", seasons: ["summer"] },
    { id: "sport-shorts", name: "运动短裤", icon: "动", seasons: ["summer"] },
    { id: "skirt", name: "裙子", icon: "Q", seasons: ["spring", "summer"] },
    { id: "dress", name: "连衣裙", icon: "D", seasons: ["spring", "summer"] },
    { id: "coat", name: "外套", icon: "C", seasons: ["spring", "autumn", "winter"] },
    { id: "down", name: "羽绒服", icon: "Y", seasons: ["winter"] },
    { id: "shoes", name: "鞋子", icon: "X", seasons: ["spring", "summer", "autumn", "winter"] },
    { id: "bag", name: "包包", icon: "M", seasons: ["spring", "summer", "autumn", "winter"] },
    { id: "accessory", name: "配饰", icon: "+", seasons: ["spring", "summer", "autumn", "winter"] }
  ];

  const defaultCategoryGroups = [
    { id: "tops", name: "上装专区", categoryIds: ["tshirt", "longsleeve", "shirt", "hoodie", "sweater"] },
    { id: "bottoms", name: "下装专区", categoryIds: ["pants", "jeans", "sweatpants", "cargo-pants", "shorts", "sport-shorts", "skirt", "dress"] },
    { id: "outerwear", name: "外套专区", categoryIds: ["coat", "down"] },
    { id: "shoes-bags", name: "鞋包专区", categoryIds: ["shoes", "bag"] },
    { id: "accessories", name: "配饰专区", categoryIds: ["accessory"] },
    { id: "uncategorized-group", name: "待整理", categoryIds: ["uncategorized"] }
  ];

  let categoryGroups = [];

  const colors = [
    { id: "white", name: "白色", family: "浅色系", hex: "#f8f5ec", matches: ["牛仔蓝", "黑色", "米色", "浅粉"] },
    { id: "black", name: "黑色", family: "深色系", hex: "#202020", matches: ["白色", "灰色", "牛仔蓝", "酒红"] },
    { id: "gray", name: "灰色", family: "中性色", hex: "#9a9a95", matches: ["白色", "黑色", "雾蓝", "浅粉"] },
    { id: "beige", name: "米色", family: "暖色系", hex: "#d8c2a1", matches: ["棕色", "白色", "牛仔蓝", "橄榄绿"] },
    { id: "brown", name: "棕色", family: "暖色系", hex: "#8a5f42", matches: ["米色", "白色", "深蓝", "橄榄绿"] },
    { id: "blue", name: "蓝色", family: "冷色系", hex: "#4e77a1", matches: ["白色", "灰色", "卡其", "棕色"] },
    { id: "denim", name: "牛仔蓝", family: "冷色系", hex: "#3e6683", matches: ["白色", "黑色", "米色", "红色"] },
    { id: "green", name: "绿色", family: "自然色系", hex: "#6f7f61", matches: ["米色", "棕色", "白色", "黑色"] },
    { id: "pink", name: "粉色", family: "柔和色系", hex: "#e7aaa8", matches: ["白色", "灰色", "牛仔蓝", "米色"] },
    { id: "red", name: "红色", family: "亮色系", hex: "#b85043", matches: ["黑色", "白色", "牛仔蓝", "米色"] },
    { id: "yellow", name: "黄色", family: "亮色系", hex: "#d9ad45", matches: ["白色", "牛仔蓝", "棕色", "绿色"] },
    { id: "other", name: "其他", family: "混合色系", hex: "#c9b9a3", matches: ["白色", "黑色", "灰色"] }
  ];

  const styles = ["休闲", "通勤", "温柔", "甜美", "运动", "复古", "约会", "旅行"];
  const occasions = ["日常", "上班", "约会", "旅行", "运动", "居家", "聚会"];

  const state = {
    items: [],
    activeTab: "category",
    activeGroup: "",
    activeCategory: "",
    activeSeason: getCurrentSeason().id,
    activeColor: "all",
    imageDraft: "",
    outfitSeed: 0
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    loadCategoryCatalog();
    fillOptions();
    bindEvents();
    state.items = await dbGetAll();
    state.activeGroup = categoryGroups[0] ? categoryGroups[0].id : "";
    state.activeCategory = categoriesForGroup(state.activeGroup)[0]?.id || categories[0].id;
    renderAll();
    ensurePersistentStorage();
  }

  function cacheElements() {
    [
      "seasonLine", "todayPanel", "totalCount", "seasonCount", "idleCount",
      "categoryRail", "subcategoryPanel", "categoryGrid", "activeCategoryName", "activeCategoryHint",
      "categorySearch", "categorySort", "seasonTabs", "seasonGrid", "shuffleOutfit",
      "outfitCard", "itemForm", "editingId", "imageInput", "imagePreview", "uploadText",
      "itemName", "itemGroup", "itemCategory", "itemColor", "itemStyle", "itemOccasion", "itemWarmth",
      "seasonChecks", "itemNotes", "resetForm", "bulkInput", "exportData", "importData",
      "seedSamples", "recognizeImage", "aiStatus", "manageSearch", "manageList", "palette", "colorAdvice", "colorGrid",
      "detailDialog", "detailContent", "closeDetail", "toast"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function loadCategoryCatalog() {
    const defaultCatalog = {
      groups: defaultCategoryGroups,
      categories: categories.map((category) => ({
        ...category,
        groupId: groupIdForCategory(defaultCategoryGroups, category.id)
      }))
    };

    try {
      const saved = JSON.parse(localStorage.getItem(CATEGORY_CATALOG_KEY) || "null");
      if (saved && Array.isArray(saved.groups) && Array.isArray(saved.categories)) {
        categoryGroups = normalizeCategoryGroups(saved.groups);
        categories.splice(0, categories.length, ...normalizeCategories(saved.categories, categoryGroups));
        ensureUncategorizedCatalog();
        return;
      }
    } catch (error) {
      console.warn("Category catalog read failed.", error);
    }

    categoryGroups = normalizeCategoryGroups(defaultCatalog.groups);
    categories.splice(0, categories.length, ...normalizeCategories(defaultCatalog.categories, categoryGroups));
    saveCategoryCatalog();
  }

  function saveCategoryCatalog() {
    try {
      localStorage.setItem(CATEGORY_CATALOG_KEY, JSON.stringify({
        groups: categoryGroups,
        categories
      }));
    } catch (error) {
      console.warn("Category catalog save failed.", error);
    }
  }

  function normalizeCategoryGroups(groups) {
    const seen = new Set();
    return groups
      .filter((group) => group && group.id && group.name)
      .map((group) => ({
        id: String(group.id),
        name: String(group.name).slice(0, 12),
        categoryIds: Array.isArray(group.categoryIds) ? group.categoryIds.map(String) : []
      }))
      .filter((group) => {
        if (seen.has(group.id)) return false;
        seen.add(group.id);
        return true;
      });
  }

  function normalizeCategories(rawCategories, groups) {
    const seen = new Set();
    return rawCategories
      .filter((category) => category && category.id && category.name)
      .map((category) => {
        const groupId = groups.some((group) => group.id === category.groupId)
          ? category.groupId
          : groupIdForCategory(groups, category.id);
        return {
          id: String(category.id),
          name: String(category.name).slice(0, 16),
          icon: String(category.icon || category.name || "?").slice(0, 1).toUpperCase(),
          seasons: Array.isArray(category.seasons) ? category.seasons.filter(seasonExists) : [],
          groupId
        };
      })
      .filter((category) => {
        if (seen.has(category.id)) return false;
        seen.add(category.id);
        return true;
      });
  }

  function ensureUncategorizedCatalog() {
    if (!categories.some((category) => category.id === "uncategorized")) {
      categories.push({ id: "uncategorized", name: "未分类", icon: "?", seasons: [], groupId: "uncategorized-group" });
    }
    if (!categoryGroups.some((group) => group.id === "uncategorized-group")) {
      categoryGroups.push({ id: "uncategorized-group", name: "待整理", categoryIds: ["uncategorized"] });
    }
    categoryGroups.forEach((group) => {
      group.categoryIds = group.categoryIds.filter((id) => categories.some((category) => category.id === id));
    });
    categories.forEach((category) => {
      const group = categoryGroups.find((entry) => entry.id === category.groupId) || categoryGroups[0];
      category.groupId = group.id;
      if (!group.categoryIds.includes(category.id)) group.categoryIds.push(category.id);
    });
  }

  function groupIdForCategory(groups, categoryId) {
    return (groups.find((group) => group.categoryIds.includes(categoryId)) || groups[0] || {}).id || "";
  }

  function fillOptions() {
    els.itemGroup.innerHTML = categoryGroups.map((item) => option(item.id, item.name)).join("");
    fillCategoryOptions(els.itemGroup.value || categoryGroups[0]?.id, els.itemCategory.value);
    els.itemColor.innerHTML = colors.map((item) => option(item.id, item.name)).join("");
    els.itemStyle.innerHTML = styles.map((item) => option(item, item)).join("");
    els.itemOccasion.innerHTML = occasions.map((item) => option(item, item)).join("");
    els.seasonChecks.innerHTML = seasons.map((season) => `
      <label class="pill">
        <input type="checkbox" name="season" value="${season.id}" />
        ${season.name}
      </label>
    `).join("");
  }

  function fillCategoryOptions(groupId, selectedCategoryId) {
    const groupCategories = categoriesForGroup(groupId);
    const fallback = groupCategories[0]?.id || "uncategorized";
    els.itemCategory.innerHTML = groupCategories.map((item) => option(item.id, item.name)).join("");
    els.itemCategory.value = groupCategories.some((item) => item.id === selectedCategoryId) ? selectedCategoryId : fallback;
  }

  function bindEvents() {
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    document.querySelectorAll("[data-open-manage]").forEach((button) => {
      button.addEventListener("click", () => switchTab("manage"));
    });

    els.categorySearch.addEventListener("input", renderCategoryGrid);
    els.categorySort.addEventListener("change", renderCategoryGrid);
    els.itemGroup.addEventListener("change", () => fillCategoryOptions(els.itemGroup.value));
    els.recognizeImage.addEventListener("click", () => classifyCurrentImage(false));
    els.manageSearch.addEventListener("input", renderManageList);
    els.shuffleOutfit.addEventListener("click", () => {
      state.outfitSeed += 1;
      renderOutfit();
    });

    els.imageInput.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      showToast("正在优化照片...");
      state.imageDraft = await prepareImageFile(file);
      previewImage(state.imageDraft);
      showToast("照片已压缩，保存后会留在本机。");
      classifyCurrentImage(true);
    });

    els.itemForm.addEventListener("submit", saveFromForm);
    els.resetForm.addEventListener("click", resetForm);
    els.bulkInput.addEventListener("change", bulkUpload);
    els.exportData.addEventListener("click", exportData);
    els.importData.addEventListener("change", importData);
    els.seedSamples.addEventListener("click", seedSamples);
    els.closeDetail.addEventListener("click", () => els.detailDialog.close());

    els.detailDialog.addEventListener("click", (event) => {
      if (event.target === els.detailDialog) els.detailDialog.close();
    });
  }

  function switchTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === tab);
    });
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("is-active", view.dataset.view === tab);
    });
    if (tab === "season") renderSeason();
    if (tab === "manage") renderManageList();
    if (tab === "color") renderColor();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveFromForm(event) {
    event.preventDefault();
    await ensurePersistentStorage();
    const editingId = els.editingId.value;
    const existing = state.items.find((item) => item.id === editingId);
    const checkedSeasons = [...els.seasonChecks.querySelectorAll("input:checked")].map((input) => input.value);
    const category = categories.find((item) => item.id === els.itemCategory.value);
    const itemSeasons = checkedSeasons.length ? checkedSeasons : inferSeasons(category);

    if (!state.imageDraft && !existing) {
      showToast("请先上传一张衣服照片。");
      return;
    }

    const now = new Date().toISOString();
    const item = {
      id: editingId || createId(),
      name: els.itemName.value.trim(),
      category: els.itemCategory.value,
      color: els.itemColor.value,
      seasons: itemSeasons,
      style: els.itemStyle.value,
      occasion: els.itemOccasion.value,
      warmth: els.itemWarmth.value,
      notes: els.itemNotes.value.trim(),
      image: state.imageDraft || existing.image,
      wearCount: existing ? existing.wearCount || 0 : 0,
      lastWorn: existing ? existing.lastWorn || "" : "",
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    try {
      await dbPut(item);
      state.items = upsert(state.items, item);
      writeLocalMirror(state.items);
      resetForm();
      renderAll();
      showToast(editingId ? "已更新并保存到本机。" : "已加入衣橱并保存到本机。");
    } catch (error) {
      console.error(error);
      showToast("保存失败，请先导出备份或清理浏览器空间。");
    }
  }

  async function bulkUpload(event) {
    const files = [...event.target.files];
    if (!files.length) return;
    await ensurePersistentStorage();
    const now = new Date().toISOString();
    const nextItems = [];

    for (const file of files) {
      const image = await prepareImageFile(file);
      const item = {
        id: createId(),
        name: cleanFileName(file.name) || "未命名衣服",
        category: "uncategorized",
        color: "other",
        seasons: [],
        style: "休闲",
        occasion: "日常",
        warmth: "适中",
        notes: "批量上传后待整理",
        image,
        wearCount: 0,
        lastWorn: "",
        createdAt: now,
        updatedAt: now
      };
      await dbPut(item);
      nextItems.push(item);
    }

    state.items = [...nextItems, ...state.items];
    writeLocalMirror(state.items);
    event.target.value = "";
    renderAll();
    showToast(`已批量上传 ${nextItems.length} 件，先放在“未分类”。`);
  }

  async function classifyCurrentImage(isAuto) {
    if (!state.imageDraft) {
      setAiStatus("请先上传一张照片。");
      return;
    }

    els.recognizeImage.disabled = true;
    setAiStatus(isAuto ? "正在自动识别衣服..." : "正在重新识别...");

    try {
      const response = await fetch("/.netlify/functions/classify-clothing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: state.imageDraft,
          groups: categoryGroups.map((group) => ({ id: group.id, name: group.name })),
          categories: categories.map((category) => ({
            id: category.id,
            name: category.name,
            groupId: category.groupId
          })),
          colors: colors.map((color) => ({ id: color.id, name: color.name }))
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "识别失败");
      applyAiClassification(result);
    } catch (error) {
      console.warn(error);
      setAiStatus("AI 识别暂不可用，可先手动选择分类。请确认 Netlify 环境变量 DASHSCOPE_API_KEY 已配置。");
    } finally {
      els.recognizeImage.disabled = false;
    }
  }

  function applyAiClassification(result) {
    const groupId = categoryGroups.some((group) => group.id === result.groupId)
      ? result.groupId
      : (categories.find((category) => category.id === result.categoryId)?.groupId || els.itemGroup.value);
    els.itemGroup.value = groupId;
    fillCategoryOptions(groupId, result.categoryId);

    if (colorExists(result.colorId)) els.itemColor.value = result.colorId;
    if (!els.itemName.value.trim() && result.suggestedName) els.itemName.value = result.suggestedName;

    const seasonsFromAi = Array.isArray(result.seasons) ? result.seasons : [];
    if (seasonsFromAi.length) {
      els.seasonChecks.querySelectorAll("input").forEach((input) => {
        input.checked = seasonsFromAi.includes(input.value);
      });
    }

    const confidence = Math.round((Number(result.confidence || 0) || 0) * 100);
    setAiStatus(`已识别：${groupName(els.itemGroup.value)} / ${categoryName(els.itemCategory.value)} / ${colorName(els.itemColor.value)}${confidence ? `，可信度 ${confidence}%` : ""}。可修改后保存。`);
  }

  function setAiStatus(text) {
    els.aiStatus.textContent = text;
  }

  async function seedSamples() {
    await ensurePersistentStorage();
    if (state.items.length && !window.confirm("会新增一组示例衣服，不会覆盖已有数据。继续吗？")) return;
    const now = Date.now();
    const samples = [
      makeSample("奶油白短袖", "tshirt", "white", ["summer"], "休闲", "日常", "薄", "#f7efe0", "#d7b98d", now - 900000),
      makeSample("牛仔直筒裤", "pants", "denim", ["spring", "autumn", "winter"], "休闲", "日常", "适中", "#3e6683", "#f5ead8", now - 800000),
      makeSample("橄榄绿薄外套", "coat", "green", ["spring", "autumn"], "通勤", "上班", "适中", "#6f7f61", "#f2e5d0", now - 700000),
      makeSample("黑色乐福鞋", "shoes", "black", ["spring", "autumn", "winter"], "通勤", "上班", "适中", "#202020", "#c9b9a3", now - 600000),
      makeSample("粉色针织开衫", "sweater", "pink", ["spring", "autumn"], "温柔", "约会", "适中", "#e7aaa8", "#fff3df", now - 500000),
      makeSample("米色短裤", "shorts", "beige", ["summer"], "休闲", "旅行", "薄", "#d8c2a1", "#f8f5ec", now - 400000),
      makeSample("棕色托特包", "bag", "brown", ["spring", "summer", "autumn", "winter"], "复古", "日常", "适中", "#8a5f42", "#edd9b7", now - 300000),
      makeSample("浅蓝衬衫", "shirt", "blue", ["spring", "summer", "autumn"], "通勤", "上班", "薄", "#84a8c6", "#f6eddf", now - 200000)
    ];

    for (const item of samples) await dbPut(item);
    state.items = [...samples, ...state.items];
    writeLocalMirror(state.items);
    renderAll();
    showToast("已导入示例衣橱，可以直接体验推荐和配色。");
  }

  function makeSample(name, category, color, itemSeasons, style, occasion, warmth, main, accent, time) {
    return {
      id: createId(),
      name,
      category,
      color,
      seasons: itemSeasons,
      style,
      occasion,
      warmth,
      notes: "示例数据，可编辑或删除。",
      image: sampleSvg(name, categoryName(category), main, accent),
      wearCount: Math.floor(Math.random() * 6),
      lastWorn: "",
      createdAt: new Date(time).toISOString(),
      updatedAt: new Date(time).toISOString()
    };
  }

  function renderAll() {
    renderHeader();
    renderStats();
    renderCategory();
    renderSeason();
    renderManageList();
    renderColor();
  }

  function renderHeader() {
    const current = getCurrentSeason();
    const seasonItems = state.items.filter((item) => item.seasons.includes(current.id));
    const recommendation = pickTodayRecommendation(seasonItems);

    els.seasonLine.textContent = `现在是${current.name}季视角：${current.hint}`;

    if (!recommendation) {
      els.todayPanel.innerHTML = `
        <span class="hero__tag">今日建议</span>
        <strong>先上传几件衣服</strong>
        <p>上传后，我会按当前季节把最适合的分类和搭配放在前面。</p>
      `;
      return;
    }

    els.todayPanel.innerHTML = `
      <span class="hero__tag">今日建议</span>
      <strong>${escapeHtml(recommendation.name)}</strong>
      <p>${current.name}天优先考虑「${categoryName(recommendation.category)}」，它是${colorName(recommendation.color)}、${recommendation.style}风，适合${recommendation.occasion}。</p>
    `;
  }

  function renderStats() {
    const current = getCurrentSeason();
    const now = Date.now();
    const idle = state.items.filter((item) => {
      if (!item.lastWorn) return state.items.length > 6;
      return now - new Date(item.lastWorn).getTime() > 1000 * 60 * 60 * 24 * 120;
    });
    els.totalCount.textContent = state.items.length;
    els.seasonCount.textContent = state.items.filter((item) => item.seasons.includes(current.id)).length;
    els.idleCount.textContent = idle.length;
  }

  function renderCategory() {
    if (!categoryGroups.some((group) => group.id === state.activeGroup)) {
      state.activeGroup = categoryGroups[0] ? categoryGroups[0].id : "";
    }

    const activeGroupCategories = categoriesForGroup(state.activeGroup);
    if (!activeGroupCategories.some((item) => item.id === state.activeCategory)) {
      state.activeCategory = activeGroupCategories[0]?.id || "uncategorized";
    }

    els.categoryRail.innerHTML = categoryGroups.map((group) => {
      const count = state.items.filter((item) => categoriesForGroup(group.id).some((category) => category.id === item.category)).length;
      const active = group.id === state.activeGroup ? " is-active" : "";
      return `
        <button class="category-btn${active}" type="button" data-group="${group.id}">
          <span><b>${escapeHtml(group.name)}</b></span>
          <b class="category-count">${count}</b>
        </button>
      `;
    }).join("") + `
      <button class="category-btn category-add" type="button" data-add-group>+ 大类</button>
    `;

    els.categoryRail.querySelectorAll("[data-group]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeGroup = button.dataset.group;
        state.activeCategory = categoriesForGroup(state.activeGroup)[0]?.id || "uncategorized";
        renderCategory();
      });
    });
    els.categoryRail.querySelector("[data-add-group]").addEventListener("click", addCategoryGroup);

    renderSubcategoryPanel(activeGroupCategories);

    const active = categories.find((item) => item.id === state.activeCategory);
    els.activeCategoryName.textContent = active ? active.name : "分类";
    els.activeCategoryHint.textContent = active && active.seasons.length
      ? `适合：${active.seasons.map(seasonName).join(" / ")}`
      : "等待整理的衣服会放在这里";
    renderCategoryGrid();
  }

  function renderSubcategoryPanel(groupCategories) {
    const activeGroup = categoryGroups.find((group) => group.id === state.activeGroup);
    const cards = groupCategories.map((category) => {
      const count = state.items.filter((item) => item.category === category.id).length;
      const cover = categoryCover(category.id);
      const active = category.id === state.activeCategory ? " is-active" : "";
      return `
        <article class="subcategory-card${active}">
          <button type="button" data-category="${category.id}">
            <span class="subcategory-cover">${cover ? `<img src="${cover}" alt="" />` : `<b>${escapeHtml(category.icon || category.name.slice(0, 1))}</b>`}</span>
            <strong>${escapeHtml(category.name)}</strong>
            <small>${count} 件</small>
          </button>
          ${category.id === "uncategorized" ? "" : `<button class="subcategory-delete" type="button" data-delete-category="${category.id}" aria-label="删除${escapeHtml(category.name)}">×</button>`}
        </article>
      `;
    }).join("");

    els.subcategoryPanel.innerHTML = `
      <div class="subcategory-head">
        <div>
          <strong>${escapeHtml(activeGroup ? activeGroup.name : "分类")}</strong>
          <span>${groupCategories.length} 个细分种类</span>
        </div>
        <div class="subcategory-actions">
          <button class="ghost" type="button" data-add-category>+ 细分</button>
          ${activeGroup && activeGroup.id !== "uncategorized-group" ? `<button class="ghost danger-text" type="button" data-delete-group>删除大类</button>` : ""}
        </div>
      </div>
      <div class="subcategory-grid">${cards}</div>
    `;

    els.subcategoryPanel.querySelectorAll("[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeCategory = button.dataset.category;
        renderCategory();
      });
    });
    els.subcategoryPanel.querySelector("[data-add-category]").addEventListener("click", addSubcategory);
    els.subcategoryPanel.querySelector("[data-delete-group]")?.addEventListener("click", deleteCategoryGroup);
    els.subcategoryPanel.querySelectorAll("[data-delete-category]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteSubcategory(button.dataset.deleteCategory);
      });
    });
  }

  function categoryCover(categoryId) {
    const item = state.items.find((entry) => entry.category === categoryId);
    return item ? item.image : "";
  }

  function addCategoryGroup() {
    const name = window.prompt("请输入新的大类名称，例如：上装专区、下装专区、运动专区");
    const cleanName = cleanCategoryName(name, 12);
    if (!cleanName) return;
    const group = { id: createCatalogId("group"), name: cleanName, categoryIds: [] };
    categoryGroups.push(group);
    state.activeGroup = group.id;
    saveCategoryCatalog();
    renderCategory();
    showToast("已添加大类。");
  }

  function addSubcategory() {
    const activeGroup = categoryGroups.find((group) => group.id === state.activeGroup);
    if (!activeGroup) return;
    const name = window.prompt(`给「${activeGroup.name}」添加一个细分种类，例如：牛仔裤、卫衣、乐福鞋`);
    const cleanName = cleanCategoryName(name, 16);
    if (!cleanName) return;
    const category = {
      id: createCatalogId("cat"),
      name: cleanName,
      icon: cleanName.slice(0, 1),
      seasons: [getCurrentSeason().id],
      groupId: activeGroup.id
    };
    categories.push(category);
    activeGroup.categoryIds.push(category.id);
    state.activeCategory = category.id;
    saveCategoryCatalog();
    fillOptions();
    renderAll();
    showToast("已添加细分种类。");
  }

  function deleteCategoryGroup() {
    const group = categoryGroups.find((entry) => entry.id === state.activeGroup);
    if (!group || group.id === "uncategorized-group") return;
    if (!window.confirm(`删除「${group.name}」吗？这个大类下的衣服会移动到“未分类”。`)) return;
    const movingIds = new Set(group.categoryIds);
    state.items = state.items.map((item) => movingIds.has(item.category) ? { ...item, category: "uncategorized", updatedAt: new Date().toISOString() } : item);
    categories.splice(0, categories.length, ...categories.filter((category) => !movingIds.has(category.id)));
    categoryGroups = categoryGroups.filter((entry) => entry.id !== group.id);
    ensureUncategorizedCatalog();
    state.activeGroup = categoryGroups[0].id;
    state.activeCategory = categoriesForGroup(state.activeGroup)[0]?.id || "uncategorized";
    saveCategoryCatalog();
    persistAllItems();
    fillOptions();
    renderAll();
    showToast("已删除大类，相关衣服已移到未分类。");
  }

  function deleteSubcategory(categoryId) {
    const category = categories.find((entry) => entry.id === categoryId);
    if (!category || category.id === "uncategorized") return;
    if (!window.confirm(`删除「${category.name}」吗？这个分类里的衣服会移动到“未分类”。`)) return;
    state.items = state.items.map((item) => item.category === categoryId ? { ...item, category: "uncategorized", updatedAt: new Date().toISOString() } : item);
    categories.splice(0, categories.length, ...categories.filter((entry) => entry.id !== categoryId));
    categoryGroups.forEach((group) => {
      group.categoryIds = group.categoryIds.filter((id) => id !== categoryId);
    });
    ensureUncategorizedCatalog();
    state.activeCategory = categoriesForGroup(state.activeGroup)[0]?.id || "uncategorized";
    saveCategoryCatalog();
    persistAllItems();
    fillOptions();
    renderAll();
    showToast("已删除细分种类，相关衣服已移到未分类。");
  }

  function cleanCategoryName(value, maxLength) {
    return String(value || "").trim().replace(/\s+/g, "").slice(0, maxLength);
  }

  function createCatalogId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function renderCategoryGrid() {
    const query = els.categorySearch.value.trim().toLowerCase();
    const sort = els.categorySort.value;
    const current = getCurrentSeason().id;
    let list = state.items.filter((item) => item.category === state.activeCategory);

    if (query) {
      list = list.filter((item) => searchableText(item).includes(query));
    }

    list.sort((a, b) => compareItems(a, b, sort, current));
    els.categoryGrid.innerHTML = list.length ? list.map(renderItemCard).join("") : emptyState("这里还没有衣服", "去“管理”页上传照片，或先导入示例体验。");
    bindCardClicks(els.categoryGrid);
  }

  function renderSeason() {
    els.seasonTabs.innerHTML = seasons.map((season) => `
      <button class="tab-chip ${season.id === state.activeSeason ? "is-active" : ""}" type="button" data-season="${season.id}">
        ${season.name} · ${state.items.filter((item) => item.seasons.includes(season.id)).length}
      </button>
    `).join("");

    els.seasonTabs.querySelectorAll("[data-season]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeSeason = button.dataset.season;
        renderSeason();
      });
    });

    renderOutfit();

    const list = state.items
      .filter((item) => item.seasons.includes(state.activeSeason))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    els.seasonGrid.innerHTML = list.length ? list.map(renderItemCard).join("") : emptyState(`${seasonName(state.activeSeason)}季还没有衣服`, "编辑衣服时勾选适合的季节，就会出现在这里。");
    bindCardClicks(els.seasonGrid);
  }

  function renderOutfit() {
    const list = state.items.filter((item) => item.seasons.includes(state.activeSeason));
    const outfit = makeOutfit(list);
    const activeSeason = seasons.find((item) => item.id === state.activeSeason);

    if (!outfit.length) {
      els.outfitCard.innerHTML = `
        <div class="outfit-copy">
          <span class="pill">${activeSeason.name}季推荐</span>
          <h3>还缺少可推荐的衣服</h3>
          <p>${activeSeason.hint} 上传几件后，这里会自动组合上衣、下装、外套和鞋子。</p>
        </div>
        <div class="empty">暂无搭配</div>
      `;
      return;
    }

    const palette = outfit.map((item) => colorName(item.color)).join(" + ");
    els.outfitCard.innerHTML = `
      <div class="outfit-copy">
        <span class="pill">${activeSeason.name}季推荐</span>
        <h3>${outfit.map((item) => item.name).join(" / ")}</h3>
        <p>这套偏${outfit[0].style}，主色是 ${palette}。如果觉得太素，可以用包包或配饰增加一个亮点。</p>
      </div>
      <div class="outfit-pieces">
        ${outfit.map((item) => `
          <button class="outfit-piece" type="button" data-id="${item.id}">
            <img src="${item.image}" alt="${escapeHtml(item.name)}" />
            <span>${escapeHtml(item.name)}</span>
          </button>
        `).join("")}
      </div>
    `;
    bindCardClicks(els.outfitCard);
  }

  function renderManageList() {
    const query = els.manageSearch.value.trim().toLowerCase();
    let list = [...state.items].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (query) list = list.filter((item) => searchableText(item).includes(query));

    els.manageList.innerHTML = list.length ? list.map((item) => `
      <article class="manage-row">
        <img src="${item.image}" alt="${escapeHtml(item.name)}" />
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${categoryName(item.category)} · ${colorName(item.color)} · ${item.seasons.map(seasonName).join(" / ") || "未设季节"}</p>
          <p>穿过 ${item.wearCount || 0} 次${item.lastWorn ? ` · 最近 ${formatDate(item.lastWorn)}` : ""}</p>
        </div>
        <div class="row-actions">
          <button class="icon-btn" type="button" data-edit="${item.id}">编辑</button>
          <button class="icon-btn" type="button" data-worn="${item.id}">穿过</button>
          <button class="icon-btn danger" type="button" data-delete="${item.id}">删除</button>
        </div>
      </article>
    `).join("") : emptyState("衣橱还是空的", "上传照片，或者点击“导入示例”先体验完整流程。");

    els.manageList.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => editItem(button.dataset.edit));
    });
    els.manageList.querySelectorAll("[data-worn]").forEach((button) => {
      button.addEventListener("click", () => markWorn(button.dataset.worn));
    });
    els.manageList.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteItem(button.dataset.delete));
    });
  }

  function renderColor() {
    const families = colorFamilies();
    if (!families.some((item) => item.id === state.activeColor)) state.activeColor = "all";

    els.palette.innerHTML = families.map((family) => `
      <button class="color-chip ${family.id === state.activeColor ? "is-active" : ""}" type="button" data-color="${family.id}">
        <span class="swatch" style="background:${family.hex}"></span>${family.name} · ${family.count}
      </button>
    `).join("");

    els.palette.querySelectorAll("[data-color]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeColor = button.dataset.color;
        renderColor();
      });
    });

    const activeColor = colors.find((item) => item.id === state.activeColor);
    if (state.activeColor === "all") {
      els.colorAdvice.innerHTML = `
        <h3>先选择一个色系</h3>
        <p>色系页会把衣橱里的颜色集中展示，并给出协调搭配。常用原则：浅色提亮、深色压稳、牛仔蓝很好搭，亮色尽量只做一个重点。</p>
        <div class="match-row">
          <span class="pill">白 + 牛仔蓝</span>
          <span class="pill">米 + 棕</span>
          <span class="pill">黑 + 灰 + 白</span>
          <span class="pill">粉 + 白</span>
        </div>
      `;
    } else {
      els.colorAdvice.innerHTML = `
        <h3>${activeColor.name}怎么搭？</h3>
        <p>${activeColor.name}属于${activeColor.family}。建议搭配：${activeColor.matches.join("、")}。如果整套颜色超过三种，优先让包包或鞋子做呼应。</p>
        <div class="match-row">
          ${activeColor.matches.map((match) => `<span class="pill">${activeColor.name} + ${match}</span>`).join("")}
        </div>
      `;
    }

    const list = state.activeColor === "all"
      ? [...state.items]
      : state.items.filter((item) => item.color === state.activeColor);

    els.colorGrid.innerHTML = list.length ? list.map(renderItemCard).join("") : emptyState("这个色系还没有衣服", "新增衣服时选择颜色，就能在这里看到配色建议。");
    bindCardClicks(els.colorGrid);
  }

  function colorFamilies() {
    const all = [{ id: "all", name: "全部色系", hex: "linear-gradient(135deg,#f8f5ec,#6f7f61,#202020)", count: state.items.length }];
    return all.concat(colors.map((color) => ({
      ...color,
      count: state.items.filter((item) => item.color === color.id).length
    })));
  }

  function renderItemCard(item) {
    const seasonTag = item.seasons.map(seasonName).slice(0, 2).join(" / ") || "未设季节";
    return `
      <article class="item-card">
        <button type="button" data-id="${item.id}">
          <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy" />
          <div class="item-meta">
            <h3>${escapeHtml(item.name)}</h3>
            <div class="item-tags">
              <span>${categoryName(item.category)}</span>
              <span>${colorName(item.color)}</span>
              <span>${seasonTag}</span>
            </div>
          </div>
        </button>
      </article>
    `;
  }

  function bindCardClicks(container) {
    container.querySelectorAll("[data-id]").forEach((button) => {
      button.addEventListener("click", () => openDetail(button.dataset.id));
    });
  }

  function openDetail(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    const matches = recommendMatches(item);
    els.detailContent.innerHTML = `
      <div class="detail-body">
        <img src="${item.image}" alt="${escapeHtml(item.name)}" />
        <div class="detail-info">
          <span class="pill">${categoryName(item.category)}</span>
          <h3>${escapeHtml(item.name)}</h3>
          <div class="detail-grid">
            <div><small>颜色</small>${colorName(item.color)}</div>
            <div><small>季节</small>${item.seasons.map(seasonName).join(" / ") || "未设置"}</div>
            <div><small>风格</small>${item.style}</div>
            <div><small>场合</small>${item.occasion}</div>
            <div><small>厚薄</small>${item.warmth}</div>
            <div><small>穿着</small>${item.wearCount || 0} 次</div>
          </div>
          <p>${escapeHtml(item.notes || "暂无备注")}</p>
          <h3>搭配建议</h3>
          <p>${matches.text}</p>
          <div class="match-row">${matches.items.map((match) => `<span class="pill">${match}</span>`).join("")}</div>
          <div class="form-actions" style="margin-top:18px">
            <button class="primary" type="button" data-detail-worn="${item.id}">记录今天穿过</button>
            <button class="ghost" type="button" data-detail-edit="${item.id}">编辑</button>
          </div>
        </div>
      </div>
    `;
    els.detailContent.querySelector("[data-detail-worn]").addEventListener("click", async () => {
      await markWorn(item.id);
      els.detailDialog.close();
    });
    els.detailContent.querySelector("[data-detail-edit]").addEventListener("click", () => {
      els.detailDialog.close();
      editItem(item.id);
    });
    els.detailDialog.showModal();
  }

  function recommendMatches(item) {
    const color = colors.find((entry) => entry.id === item.color) || colors[colors.length - 1];
    const available = state.items
      .filter((entry) => entry.id !== item.id)
      .filter((entry) => color.matches.includes(colorName(entry.color)) || entry.color === "white" || entry.color === "black")
      .map((entry) => `${entry.name}`);
    return {
      text: `${colorName(item.color)}可以和 ${color.matches.join("、")} 搭配。优先选择同季节、不同分类的单品，整体会更完整。`,
      items: available.slice(0, 6).length ? available.slice(0, 6) : color.matches
    };
  }

  function editItem(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    switchTab("manage");
    els.editingId.value = item.id;
    els.itemName.value = item.name;
    const itemCategory = categories.find((category) => category.id === item.category);
    els.itemGroup.value = itemCategory ? itemCategory.groupId : "uncategorized-group";
    fillCategoryOptions(els.itemGroup.value, item.category);
    els.itemColor.value = item.color;
    els.itemStyle.value = item.style;
    els.itemOccasion.value = item.occasion;
    els.itemWarmth.value = item.warmth;
    els.itemNotes.value = item.notes || "";
    state.imageDraft = item.image;
    previewImage(item.image);
    els.seasonChecks.querySelectorAll("input").forEach((input) => {
      input.checked = item.seasons.includes(input.value);
    });
    els.itemName.focus();
    showToast("正在编辑这件衣服。");
  }

  async function markWorn(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    const updated = {
      ...item,
      wearCount: (item.wearCount || 0) + 1,
      lastWorn: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await dbPut(updated);
    state.items = upsert(state.items, updated);
    renderAll();
    showToast("已记录今天穿过。");
  }

  async function deleteItem(id) {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    if (!window.confirm(`确定删除「${item.name}」吗？`)) return;
    await dbDelete(id);
    state.items = state.items.filter((entry) => entry.id !== id);
    renderAll();
    showToast("已删除。");
  }

  function resetForm() {
    els.itemForm.reset();
    els.editingId.value = "";
    els.itemGroup.value = categoryGroups[0]?.id || "";
    fillCategoryOptions(els.itemGroup.value);
    setAiStatus("上传照片后会自动识别大类、细分、颜色和季节。");
    state.imageDraft = "";
    els.imageInput.value = "";
    els.imagePreview.removeAttribute("src");
    els.imagePreview.parentElement.classList.remove("has-image");
    els.uploadText.textContent = "点击上传衣服照片";
    const current = getCurrentSeason();
    els.seasonChecks.querySelectorAll("input").forEach((input) => {
      input.checked = input.value === current.id;
    });
  }

  function previewImage(src) {
    els.imagePreview.src = src;
    els.imagePreview.parentElement.classList.add("has-image");
    els.uploadText.textContent = "点击更换照片";
  }

  function exportData() {
    if (!state.items.length) {
      showToast("暂无可导出的衣服。");
      return;
    }
    const payload = {
      app: "wardrobe-companion",
      version: 1,
      exportedAt: new Date().toISOString(),
      items: state.items
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wardrobe-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      await ensurePersistentStorage();
      const text = await file.text();
      const payload = JSON.parse(text);
      const incoming = Array.isArray(payload) ? payload : payload.items;
      if (!Array.isArray(incoming)) throw new Error("Invalid file");
      for (const raw of incoming) {
        const item = normalizeItem(raw);
        await dbPut(item);
        state.items = upsert(state.items, item);
      }
      writeLocalMirror(state.items);
      renderAll();
      showToast(`已导入 ${incoming.length} 件衣服。`);
    } catch (error) {
      console.error(error);
      showToast("导入失败，请确认是本应用导出的 JSON 文件。");
    } finally {
      event.target.value = "";
    }
  }

  function normalizeItem(raw) {
    const now = new Date().toISOString();
    return {
      id: raw.id || createId(),
      name: raw.name || "未命名衣服",
      category: categoryExists(raw.category) ? raw.category : "uncategorized",
      color: colorExists(raw.color) ? raw.color : "other",
      seasons: Array.isArray(raw.seasons) ? raw.seasons.filter(seasonExists) : [],
      style: styles.includes(raw.style) ? raw.style : "休闲",
      occasion: occasions.includes(raw.occasion) ? raw.occasion : "日常",
      warmth: ["薄", "适中", "厚"].includes(raw.warmth) ? raw.warmth : "适中",
      notes: raw.notes || "",
      image: raw.image || sampleSvg(raw.name || "未命名衣服", "未分类", "#d8c2a1", "#f8f5ec"),
      wearCount: Number(raw.wearCount || 0),
      lastWorn: raw.lastWorn || "",
      createdAt: raw.createdAt || now,
      updatedAt: now
    };
  }

  function makeOutfit(list) {
    if (!list.length) return [];
    const buckets = [
      ["tshirt", "longsleeve", "shirt", "hoodie", "sweater", "dress"],
      ["pants", "jeans", "sweatpants", "cargo-pants", "shorts", "sport-shorts", "skirt"],
      ["coat", "down"],
      ["shoes"],
      ["bag", "accessory"]
    ];
    const outfit = [];
    buckets.forEach((bucket, index) => {
      const candidates = list.filter((item) => bucket.includes(item.category));
      if (!candidates.length) return;
      const choice = candidates[(state.outfitSeed + index) % candidates.length];
      if (choice && !outfit.some((item) => item.id === choice.id)) outfit.push(choice);
    });

    if (!outfit.length) {
      return list.slice(state.outfitSeed, state.outfitSeed + 4);
    }
    return outfit.slice(0, 4);
  }

  function pickTodayRecommendation(list) {
    const pool = list.length ? list : state.items;
    if (!pool.length) return null;
    return [...pool].sort((a, b) => {
      const aScore = (a.wearCount || 0) + (a.lastWorn ? 0 : 2);
      const bScore = (b.wearCount || 0) + (b.lastWorn ? 0 : 2);
      return aScore - bScore || new Date(b.createdAt) - new Date(a.createdAt);
    })[0];
  }

  function getSeasonalCategories() {
    const current = getCurrentSeason().id;
    return [...categories].sort((a, b) => {
      const aSeason = a.seasons.includes(current) ? 0 : 1;
      const bSeason = b.seasons.includes(current) ? 0 : 1;
      if (a.id === "uncategorized") return state.items.some((item) => item.category === "uncategorized") ? -1 : 1;
      if (b.id === "uncategorized") return state.items.some((item) => item.category === "uncategorized") ? 1 : -1;
      return aSeason - bSeason || a.name.localeCompare(b.name, "zh-CN");
    });
  }

  function categoriesForGroup(groupId) {
    const group = categoryGroups.find((entry) => entry.id === groupId);
    if (!group) return [];
    return group.categoryIds
      .map((id) => categories.find((category) => category.id === id))
      .filter(Boolean);
  }

  function compareItems(a, b, sort, current) {
    if (sort === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === "worn") return new Date(b.lastWorn || 0) - new Date(a.lastWorn || 0);
    if (sort === "wearCount") return (b.wearCount || 0) - (a.wearCount || 0);
    const aSeason = a.seasons.includes(current) ? 0 : 1;
    const bSeason = b.seasons.includes(current) ? 0 : 1;
    return aSeason - bSeason || new Date(b.createdAt) - new Date(a.createdAt);
  }

  function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    return seasons.find((season) => season.months.includes(month)) || seasons[0];
  }

  function inferSeasons(category) {
    if (category && category.seasons.length) return category.seasons;
    return [getCurrentSeason().id];
  }

  function seasonName(id) {
    return (seasons.find((item) => item.id === id) || {}).name || id;
  }

  function categoryName(id) {
    return (categories.find((item) => item.id === id) || {}).name || "未分类";
  }

  function groupName(id) {
    return (categoryGroups.find((item) => item.id === id) || {}).name || "大类";
  }

  function colorName(id) {
    return (colors.find((item) => item.id === id) || {}).name || "其他";
  }

  function searchableText(item) {
    return [
      item.name,
      categoryName(item.category),
      colorName(item.color),
      item.style,
      item.occasion,
      item.warmth,
      item.notes,
      item.seasons.map(seasonName).join(" ")
    ].join(" ").toLowerCase();
  }

  function emptyState(title, text) {
    return `<div class="empty"><div><h3>${title}</h3><p>${text}</p></div></div>`;
  }

  function option(value, label) {
    return `<option value="${value}">${label}</option>`;
  }

  function upsert(list, item) {
    const rest = list.filter((entry) => entry.id !== item.id);
    return [item, ...rest];
  }

  function createId() {
    return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function cleanFileName(name) {
    return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function prepareImageFile(file) {
    const original = await readFileAsDataUrl(file);
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return original;
    return compressImageDataUrl(original, 1280, 0.78);
  }

  function compressImageDataUrl(dataUrl, maxSide, quality) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const largestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
        if (!largestSide) {
          resolve(dataUrl);
          return;
        }
        const scale = Math.min(1, maxSide / largestSide);
        const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "#fffdf8";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(dataUrl);
            return;
          }
          readFileAsDataUrl(blob).then(resolve).catch(() => resolve(dataUrl));
        }, "image/jpeg", quality);
      };
      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    });
  }

  function sampleSvg(name, category, main, accent) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="720" height="900" viewBox="0 0 720 900">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${accent}"/>
            <stop offset="1" stop-color="#fff8eb"/>
          </linearGradient>
        </defs>
        <rect width="720" height="900" fill="url(#bg)"/>
        <circle cx="578" cy="126" r="120" fill="${main}" opacity=".22"/>
        <circle cx="124" cy="782" r="168" fill="${main}" opacity=".18"/>
        <path d="M240 208h240l78 112-72 58-38-48v308H272V330l-38 48-72-58 78-112z" fill="${main}" stroke="#2e2a24" stroke-opacity=".18" stroke-width="10" stroke-linejoin="round"/>
        <path d="M293 208c18 42 116 42 134 0" fill="none" stroke="#fff8eb" stroke-opacity=".7" stroke-width="18" stroke-linecap="round"/>
        <text x="360" y="708" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="46" font-weight="800" fill="#2e2a24">${escapeSvg(name)}</text>
        <text x="360" y="764" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="28" fill="#776c5e">${escapeSvg(category)}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function escapeSvg(value) {
    return String(value).replace(/[&<>]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;"
    })[char]);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(value));
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 2200);
  }

  function categoryExists(id) {
    return categories.some((item) => item.id === id);
  }

  function colorExists(id) {
    return colors.some((item) => item.id === id);
  }

  function seasonExists(id) {
    return seasons.some((item) => item.id === id);
  }

  function db() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGetAll() {
    const localItems = readLocalMirror();
    try {
      const items = await dbGetAllFromIndexedDb();
      if (items.length || !localItems.length) {
        writeLocalMirror(items);
        return sortItems(items);
      }

      for (const item of localItems) {
        await dbPutToIndexedDb(item);
      }
      return sortItems(localItems);
    } catch (error) {
      console.warn("IndexedDB unavailable, using local mirror.", error);
      return sortItems(localItems);
    }
  }

  async function dbGetAllFromIndexedDb() {
    const database = await db();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, "readonly");
      const store = transaction.objectStore(STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  }

  async function dbPut(item) {
    let idbSaved = false;
    try {
      await dbPutToIndexedDb(item);
      idbSaved = true;
    } catch (error) {
      console.warn("IndexedDB save failed, trying local mirror only.", error);
    }

    const mirrored = writeLocalMirror(upsert(readLocalMirror(), item));
    if (!idbSaved && !mirrored) {
      throw new Error("No storage target available");
    }
  }

  async function dbPutToIndexedDb(item) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(item);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function dbDelete(id) {
    try {
      await dbDeleteFromIndexedDb(id);
    } catch (error) {
      console.warn("IndexedDB delete failed, updating local mirror only.", error);
    }
    writeLocalMirror(readLocalMirror().filter((entry) => entry.id !== id));
  }

  async function dbDeleteFromIndexedDb(id) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(id);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function readLocalMirror() {
    try {
      const raw = localStorage.getItem(LOCAL_MIRROR_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeItem) : [];
    } catch (error) {
      console.warn("Local mirror read failed.", error);
      return [];
    }
  }

  function writeLocalMirror(items) {
    try {
      localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(sortItems(items)));
      localStorage.setItem(LOCAL_MIRROR_TIME_KEY, new Date().toISOString());
      return true;
    } catch (error) {
      console.warn("Local mirror write failed.", error);
      return false;
    }
  }

  function persistAllItems() {
    writeLocalMirror(state.items);
    state.items.forEach((item) => {
      dbPutToIndexedDb(item).catch((error) => console.warn("Item migration save failed.", error));
    });
  }

  function sortItems(items) {
    return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async function ensurePersistentStorage() {
    if (!navigator.storage || !navigator.storage.persist) return false;
    try {
      if (await navigator.storage.persisted()) return true;
      return navigator.storage.persist();
    } catch (error) {
      console.warn("Persistent storage request failed.", error);
      return false;
    }
  }
})();
