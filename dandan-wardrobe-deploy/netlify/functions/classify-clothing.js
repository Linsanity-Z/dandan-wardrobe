const ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const DEFAULT_MODEL = "qwen-vl-plus";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return json(500, { error: "Missing DASHSCOPE_API_KEY" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const image = payload.image;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return json(400, { error: "Missing image data URL" });
  }

  const catalog = normalizeCatalog(payload);
  const model = process.env.DASHSCOPE_MODEL || DEFAULT_MODEL;
  const requestBody = buildDashScopeRequest(model, image, catalog, true);

  try {
    let response = await callDashScope(apiKey, requestBody);
    if (!response.ok && response.status >= 400) {
      // Some compatible endpoints/models may not support response_format.
      response = await callDashScope(apiKey, buildDashScopeRequest(model, image, catalog, false));
    }

    const data = await response.json();
    if (!response.ok) {
      return json(response.status, { error: "AI request failed", detail: data });
    }

    const content = data.choices?.[0]?.message?.content || "";
    const parsed = parseModelJson(content);
    return json(200, normalizeResult(parsed, catalog));
  } catch (error) {
    return json(500, { error: "AI classify failed", detail: error.message });
  }
};

function buildDashScopeRequest(model, image, catalog, withJsonMode) {
  const categoryList = catalog.categories.map((category) => `${category.name}(${category.id})`).join("、");
  const groupList = catalog.groups.map((group) => `${group.name}(${group.id})`).join("、");
  const colorList = catalog.colors.map((color) => `${color.name}(${color.id})`).join("、");
  const schemaText = [
    "只返回一个 JSON，不要使用 Markdown。",
    "字段：groupId, groupName, categoryId, categoryName, colorId, colorName, seasons, suggestedName, confidence, reason。",
    "groupId/categoryId/colorId 必须优先从给定列表中选择；如果无法判断，categoryId 用 uncategorized，colorId 用 other。",
    "seasons 使用 spring/summer/autumn/winter 数组。",
    "confidence 是 0 到 1 的数字。"
  ].join("\n");

  const body = {
    model,
    messages: [
      {
        role: "system",
        content: "你是衣橱图片识别助手，擅长识别衣服品类、颜色和适合季节。"
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${schemaText}\n\n可选大类：${groupList}\n可选细分种类：${categoryList}\n可选颜色：${colorList}\n\n请识别这张衣服照片。`
          },
          {
            type: "image_url",
            image_url: { url: image }
          }
        ]
      }
    ],
    temperature: 0.1
  };

  if (withJsonMode) body.response_format = { type: "json_object" };
  return body;
}

async function callDashScope(apiKey, body) {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function normalizeCatalog(payload) {
  const groups = Array.isArray(payload.groups) ? payload.groups : [];
  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  const colors = Array.isArray(payload.colors) ? payload.colors : [];

  return {
    groups: groups.map((group) => ({
      id: String(group.id || ""),
      name: String(group.name || "")
    })).filter((group) => group.id && group.name),
    categories: categories.map((category) => ({
      id: String(category.id || ""),
      name: String(category.name || ""),
      groupId: String(category.groupId || "")
    })).filter((category) => category.id && category.name),
    colors: colors.map((color) => ({
      id: String(color.id || ""),
      name: String(color.name || "")
    })).filter((color) => color.id && color.name)
  };
}

function parseModelJson(content) {
  if (typeof content !== "string") return {};
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function normalizeResult(result, catalog) {
  const category = matchByIdOrName(catalog.categories, result.categoryId, result.categoryName) ||
    aliasCategory(catalog.categories, `${result.categoryName || ""} ${result.suggestedName || ""} ${result.reason || ""}`) ||
    catalog.categories.find((item) => item.id === "uncategorized") ||
    catalog.categories[0];

  const group = matchByIdOrName(catalog.groups, result.groupId, result.groupName) ||
    catalog.groups.find((item) => item.id === category?.groupId) ||
    catalog.groups[0];

  const color = matchByIdOrName(catalog.colors, result.colorId, result.colorName) ||
    aliasColor(catalog.colors, `${result.colorName || ""} ${result.suggestedName || ""} ${result.reason || ""}`) ||
    catalog.colors.find((item) => item.id === "other") ||
    catalog.colors[0];

  const seasons = normalizeSeasons(result.seasons);
  const confidence = Number(result.confidence);

  return {
    groupId: group?.id || "",
    groupName: group?.name || "",
    categoryId: category?.id || "uncategorized",
    categoryName: category?.name || "未分类",
    colorId: color?.id || "other",
    colorName: color?.name || "其他",
    seasons,
    suggestedName: String(result.suggestedName || buildSuggestedName(color?.name, category?.name)).slice(0, 28),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
    reason: String(result.reason || "").slice(0, 80)
  };
}

function matchByIdOrName(list, id, name) {
  const cleanId = String(id || "").toLowerCase();
  const cleanName = normalizeText(name);
  return list.find((item) => item.id.toLowerCase() === cleanId) ||
    list.find((item) => normalizeText(item.name) === cleanName);
}

function aliasCategory(categories, text) {
  const value = normalizeText(text);
  const aliases = [
    ["tshirt", ["短袖", "t恤", "tee", "半袖"]],
    ["longsleeve", ["长袖", "打底衫"]],
    ["shirt", ["衬衫"]],
    ["hoodie", ["卫衣"]],
    ["sweater", ["毛衣", "针织"]],
    ["coat", ["外套", "夹克", "风衣"]],
    ["down", ["羽绒服"]],
    ["pants", ["长裤", "裤子"]],
    ["jeans", ["牛仔裤", "牛仔"]],
    ["sweatpants", ["卫裤", "运动裤"]],
    ["cargo-pants", ["工装裤"]],
    ["shorts", ["短裤"]],
    ["sport-shorts", ["运动短裤"]],
    ["skirt", ["裙子", "半身裙"]],
    ["dress", ["连衣裙", "裙装"]],
    ["shoes", ["鞋", "鞋子", "靴", "拖鞋", "运动鞋"]],
    ["bag", ["包", "包包", "手袋"]],
    ["accessory", ["配饰", "帽子", "围巾", "首饰", "腰带"]]
  ];

  for (const [id, words] of aliases) {
    if (words.some((word) => value.includes(normalizeText(word)))) {
      const exact = categories.find((item) => item.id === id);
      if (exact) return exact;
      return categories.find((item) => words.some((word) => normalizeText(item.name).includes(normalizeText(word))));
    }
  }
  return null;
}

function aliasColor(colors, text) {
  const value = normalizeText(text);
  const aliases = [
    ["white", ["白", "米白", "奶油"]],
    ["black", ["黑"]],
    ["gray", ["灰", "银"]],
    ["beige", ["米", "卡其", "杏"]],
    ["brown", ["棕", "咖", "褐"]],
    ["blue", ["蓝"]],
    ["denim", ["牛仔"]],
    ["green", ["绿"]],
    ["pink", ["粉"]],
    ["red", ["红", "酒红"]],
    ["yellow", ["黄"]]
  ];

  for (const [id, words] of aliases) {
    if (words.some((word) => value.includes(normalizeText(word)))) {
      return colors.find((item) => item.id === id);
    }
  }
  return null;
}

function normalizeSeasons(value) {
  const raw = Array.isArray(value) ? value.join(" ") : String(value || "");
  const text = normalizeText(raw);
  const seasons = [];
  if (text.includes("spring") || text.includes("春")) seasons.push("spring");
  if (text.includes("summer") || text.includes("夏")) seasons.push("summer");
  if (text.includes("autumn") || text.includes("fall") || text.includes("秋")) seasons.push("autumn");
  if (text.includes("winter") || text.includes("冬")) seasons.push("winter");
  return seasons.length ? [...new Set(seasons)] : ["spring", "autumn"];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function buildSuggestedName(colorName, categoryName) {
  return [colorName, categoryName].filter(Boolean).join("");
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}
