/* =========================
   공통 유틸
========================= */
const STORAGE_KEY = "GITHUB_SCRIPT_APP_SETTINGS_V1";
const GH_API_BASE = "https://api.github.com";
const GH_API_VERSION = "2022-11-28";

function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeTrim(value) {
  return String(value || "").trim();
}

function normalizePath(path) {
  return safeTrim(path).replace(/^\/+|\/+$/g, "");
}

function joinPath(...parts) {
  return parts
    .map(part => normalizePath(part))
    .filter(Boolean)
    .join("/");
}

function setStatus(el, message, type = "default") {
  el.textContent = message;
  el.style.background =
    type === "error" ? "#fff1f2" :
    type === "success" ? "#f0fdf4" :
    type === "warn" ? "#fff7ed" : "#f8fafc";
  el.style.borderColor =
    type === "error" ? "#fecdd3" :
    type === "success" ? "#bbf7d0" :
    type === "warn" ? "#fed7aa" : "#dde4ee";
  el.style.color =
    type === "error" ? "#9f1239" :
    type === "success" ? "#166534" :
    type === "warn" ? "#9a3412" : "#334155";
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function getFileExtension(filename) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index + 1).toLowerCase() : "";
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/* =========================
   1. 텍스트 줄바꿈 기능
========================= */
const textFileInput = qs("textFileInput");
const charCountInput = qs("charCount");
const downloadNameInput = qs("downloadName");
const includeSpacesInput = qs("includeSpaces");
const keepBlankLinesInput = qs("keepBlankLines");
const inputText = qs("inputText");
const outputText = qs("outputText");
const convertBtn = qs("convertBtn");
const downloadTextBtn = qs("downloadTextBtn");
const sampleBtn = qs("sampleBtn");
const resetTextBtn = qs("resetTextBtn");
const textStatus = qs("textStatus");

const TIME_PATTERN = /^(\d{2}:\d{2})(\s*)$/;

textFileInput.addEventListener("change", handleTextFileLoad);
convertBtn.addEventListener("click", handleConvertText);
downloadTextBtn.addEventListener("click", handleDownloadConvertedText);
sampleBtn.addEventListener("click", insertSampleText);
resetTextBtn.addEventListener("click", resetTextSection);

function handleTextFileLoad(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    inputText.value = e.target.result;
    setStatus(textStatus, `파일 불러오기 완료: ${file.name}`, "success");

    const currentDownloadName = safeTrim(downloadNameInput.value);
    if (!currentDownloadName || currentDownloadName === "converted.txt") {
      const baseName = file.name.replace(/\.txt$/i, "");
      downloadNameInput.value = `${baseName}_converted.txt`;
    }
  };
  reader.readAsText(file, "utf-8");
}

function handleConvertText() {
  const raw = inputText.value;
  const charLimit = parseInt(charCountInput.value, 10);
  const includeSpaces = includeSpacesInput.checked;
  const keepBlankLines = keepBlankLinesInput.checked;

  if (!raw.trim()) {
    alert("먼저 txt 내용을 불러오거나 입력해주세요.");
    return;
  }

  if (!Number.isFinite(charLimit) || charLimit < 1) {
    alert("줄바꿈 글자 수는 1 이상이어야 합니다.");
    return;
  }

  const converted = convertByTimestampBlocks(raw, charLimit, includeSpaces, keepBlankLines);
  outputText.value = converted;
  downloadTextBtn.disabled = !converted.trim();

  setStatus(
    textStatus,
    `변환 완료: ${charLimit}글자 기준으로 시간대별 본문 줄바꿈 처리가 완료되었습니다.`,
    "success"
  );
}

function handleDownloadConvertedText() {
  const content = outputText.value;
  if (!content.trim()) {
    alert("다운로드할 변환 결과가 없습니다.");
    return;
  }

  const fileName = (safeTrim(downloadNameInput.value) || "converted.txt")
    .replace(/[\\/:*?"<>|]/g, "_");
  const finalName = fileName.toLowerCase().endsWith(".txt") ? fileName : `${fileName}.txt`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function insertSampleText() {
  inputText.value = `00:00
아파트 낙찰받고 나서 명도할 때 소유자가 살고 있다고 위험한 물건 같으시죠? 여러분 안녕하세요 반갑습니다. 부자 사관학교 수진 쌤입니다. 오늘은 저희 낙찰 받은 아파트 그 이후의 현황에 대해서 한번 살펴보려고 하는데요.

00:43
도착했습니다. 낙찰받은 집에 도착했습니다. 미사 부영 아파트에서요 보시면 레스티아로 변경이 됐어요. 이 아파트가 부영 아파트에서 레스티아로 바뀌면서 아무래도 가치 상승에 영향을 줬을까 안 줬을까요?

01:21
근데 여기는 왜 다시 오신 거예요?

01:23
저희가 낙찰을 작년 5월 달에 받았어요. 그러면 남짓 1년이 안 됐거든요. 그때 낙찰 가격이 9억이었었어요. 그런데 지금은 얼마일까요?`;
  setStatus(textStatus, "예시 텍스트를 넣었습니다.", "success");
}

function resetTextSection() {
  textFileInput.value = "";
  inputText.value = "";
  outputText.value = "";
  charCountInput.value = 25;
  downloadNameInput.value = "converted.txt";
  includeSpacesInput.checked = true;
  keepBlankLinesInput.checked = true;
  downloadTextBtn.disabled = true;
  setStatus(textStatus, "텍스트 줄바꿈 영역이 초기화되었습니다.");
}

function convertByTimestampBlocks(text, charLimit, includeSpaces, keepBlankLines) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  const blocks = [];
  let currentBlock = null;
  const prefaceLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (TIME_PATTERN.test(trimmed)) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        time: trimmed,
        bodyLines: []
      };
    } else {
      if (currentBlock) {
        currentBlock.bodyLines.push(line);
      } else {
        prefaceLines.push(line);
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  const resultParts = [];

  if (prefaceLines.length > 0) {
    const prefaceText = keepBlankLines
      ? prefaceLines.join("\n").trim()
      : prefaceLines.join(" ").replace(/\s+/g, " ").trim();

    if (prefaceText) {
      resultParts.push(prefaceText);
    }
  }

  for (const block of blocks) {
    const joinedBody = keepBlankLines
      ? block.bodyLines.join("\n").trim()
      : block.bodyLines.join(" ").replace(/\s+/g, " ").trim();

    const wrappedBody = wrapTextByCharCount(joinedBody, charLimit, includeSpaces);

    if (wrappedBody) {
      resultParts.push(`${block.time}\n${wrappedBody}`);
    } else {
      resultParts.push(block.time);
    }
  }

  return resultParts.join("\n\n").trim();
}

function wrapTextByCharCount(text, charLimit, includeSpaces) {
  if (!text) return "";

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join(" ");

  if (!normalized) return "";

  let result = "";
  let buffer = "";
  let count = 0;

  for (const ch of normalized) {
    buffer += ch;

    const isCountable = includeSpaces ? true : ch !== " ";
    if (isCountable) count++;

    if (count >= charLimit) {
      result += buffer.trimEnd() + "\n";
      buffer = "";
      count = 0;
    }
  }

  if (buffer.trim()) {
    result += buffer.trimEnd();
  }

  return result.trim();
}

/* =========================
   2. GitHub 업로드/다운로드 기능
========================= */
const ghOwner = qs("ghOwner");
const ghRepo = qs("ghRepo");
const ghBranch = qs("ghBranch");
const ghFolder = qs("ghFolder");
const ghToken = qs("ghToken");
const ghCommitMessage = qs("ghCommitMessage");
const scriptFileInput = qs("scriptFileInput");
const customFileName = qs("customFileName");
const uploadScriptBtn = qs("uploadScriptBtn");
const listFilesBtn = qs("listFilesBtn");
const saveSettingsBtn = qs("saveSettingsBtn");
const clearSettingsBtn = qs("clearSettingsBtn");
const githubStatus = qs("githubStatus");
const fileList = qs("fileList");

uploadScriptBtn.addEventListener("click", handleUploadScriptToGitHub);
listFilesBtn.addEventListener("click", handleListGitHubFiles);
saveSettingsBtn.addEventListener("click", saveGitHubSettings);
clearSettingsBtn.addEventListener("click", clearGitHubSettings);

loadGitHubSettings();

function getGitHubConfig() {
  return {
    owner: safeTrim(ghOwner.value),
    repo: safeTrim(ghRepo.value),
    branch: safeTrim(ghBranch.value) || "main",
    folder: normalizePath(ghFolder.value),
    token: safeTrim(ghToken.value),
    commitMessage: safeTrim(ghCommitMessage.value) || "Upload script file from web app"
  };
}

function validateGitHubBaseConfig(requireToken = true) {
  const cfg = getGitHubConfig();

  if (!cfg.owner) {
    alert("GitHub 사용자명(Owner)을 입력해주세요.");
    return null;
  }

  if (!cfg.repo) {
    alert("저장소명(Repo)을 입력해주세요.");
    return null;
  }

  if (!cfg.branch) {
    alert("브랜치를 입력해주세요.");
    return null;
  }

  if (requireToken && !cfg.token) {
    alert("GitHub Token을 입력해주세요.");
    return null;
  }

  return cfg;
}

function saveGitHubSettings() {
  const cfg = {
    owner: safeTrim(ghOwner.value),
    repo: safeTrim(ghRepo.value),
    branch: safeTrim(ghBranch.value),
    folder: safeTrim(ghFolder.value),
    commitMessage: safeTrim(ghCommitMessage.value)
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  setStatus(githubStatus, "GitHub 연결 설정을 브라우저에 저장했습니다.", "success");
}

function loadGitHubSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    ghOwner.value = saved.owner || "";
    ghRepo.value = saved.repo || "";
    ghBranch.value = saved.branch || "main";
    ghFolder.value = saved.folder || "scripts";
    ghCommitMessage.value = saved.commitMessage || "Upload script file from web app";
  } catch (err) {
    console.error(err);
  }
}

function clearGitHubSettings() {
  localStorage.removeItem(STORAGE_KEY);
  ghOwner.value = "";
  ghRepo.value = "";
  ghBranch.value = "main";
  ghFolder.value = "scripts";
  ghCommitMessage.value = "Upload script file from web app";
  ghToken.value = "";
  customFileName.value = "";
  scriptFileInput.value = "";
  renderFileList([]);
  setStatus(githubStatus, "GitHub 연결 설정을 초기화했습니다.");
}

async function githubRequest(url, options = {}, token = "") {
  const headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": GH_API_VERSION,
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      (data && data.message) ||
      `GitHub 요청 실패 (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function getExistingFileSha(cfg, filePath) {
  const url = `${GH_API_BASE}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${filePath}?ref=${encodeURIComponent(cfg.branch)}`;

  try {
    const data = await githubRequest(url, { method: "GET" }, cfg.token);
    if (data && data.sha) {
      return data.sha;
    }
    return null;
  } catch (err) {
    if (String(err.message).includes("Not Found")) {
      return null;
    }
    throw err;
  }
}

async function handleUploadScriptToGitHub() {
  const cfg = validateGitHubBaseConfig(true);
  if (!cfg) return;

  const file = scriptFileInput.files[0];
  if (!file) {
    alert("업로드할 파일을 선택해주세요.");
    return;
  }

  const overrideName = safeTrim(customFileName.value);
  const finalFileName = overrideName || file.name;
  const fullPath = joinPath(cfg.folder, finalFileName);

  uploadScriptBtn.disabled = true;
  setStatus(githubStatus, `업로드 준비 중: ${finalFileName}`, "warn");

  try {
    const buffer = await file.arrayBuffer();
    const contentBase64 = arrayBufferToBase64(buffer);
    const existingSha = await getExistingFileSha(cfg, fullPath);

    const url = `${GH_API_BASE}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${fullPath}`;

    const payload = {
      message: cfg.commitMessage,
      content: contentBase64,
      branch: cfg.branch
    };

    if (existingSha) {
      payload.sha = existingSha;
    }

    await githubRequest(
      url,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      },
      cfg.token
    );

    setStatus(
      githubStatus,
      existingSha
        ? `업로드 완료: 기존 파일을 덮어썼습니다. (${fullPath})`
        : `업로드 완료: 새 파일을 저장했습니다. (${fullPath})`,
      "success"
    );

    await handleListGitHubFiles();
  } catch (err) {
    console.error(err);
    setStatus(githubStatus, `업로드 실패: ${err.message}`, "error");
  } finally {
    uploadScriptBtn.disabled = false;
  }
}

async function handleListGitHubFiles() {
  const cfg = validateGitHubBaseConfig(false);
  if (!cfg) return;

  listFilesBtn.disabled = true;
  setStatus(githubStatus, "저장소 파일 목록을 불러오는 중입니다.", "warn");

  try {
    const path = cfg.folder ? `/${cfg.folder}` : "";
    const url = `${GH_API_BASE}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents${path}?ref=${encodeURIComponent(cfg.branch)}`;

    const data = await githubRequest(
      url,
      { method: "GET" },
      cfg.token || ""
    );

    const items = Array.isArray(data) ? data : [data];
    const filesOnly = items.filter(item => item.type === "file");

    renderFileList(filesOnly, cfg);

    setStatus(
      githubStatus,
      `파일 목록 불러오기 완료: ${filesOnly.length}개 파일`,
      "success"
    );
  } catch (err) {
    console.error(err);
    renderFileList([]);
    setStatus(githubStatus, `파일 목록 불러오기 실패: ${err.message}`, "error");
  } finally {
    listFilesBtn.disabled = false;
  }
}

function renderFileList(files = [], cfg = null) {
  if (!files.length) {
    fileList.className = "file-list empty";
    fileList.innerHTML = "표시할 파일이 없습니다.";
    return;
  }

  fileList.className = "file-list";
  fileList.innerHTML = files.map(file => {
    const path = escapeHtml(file.path || "");
    const name = escapeHtml(file.name || "");
    const size = formatBytes(file.size);
    const ext = getFileExtension(file.name || "");
    const downloadUrl = file.download_url || file.html_url || "#";

    return `
      <div class="file-item">
        <div class="file-meta">
          <div class="file-name">${name}</div>
          <div class="file-path">${path}</div>
          <div class="file-path">유형: ${escapeHtml(ext || "파일")} · 크기: ${escapeHtml(size)}</div>
        </div>
        <div class="file-actions">
          <a href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener noreferrer">다운로드</a>
          <button type="button" class="ghost-btn" data-copy-url="${escapeHtml(downloadUrl)}">링크 복사</button>
        </div>
      </div>
    `;
  }).join("");

  fileList.querySelectorAll("[data-copy-url]").forEach(btn => {
    btn.addEventListener("click", async (event) => {
      const url = event.currentTarget.getAttribute("data-copy-url");
      try {
        await navigator.clipboard.writeText(url);
        setStatus(githubStatus, "다운로드 링크를 클립보드에 복사했습니다.", "success");
      } catch (err) {
        setStatus(githubStatus, "링크 복사에 실패했습니다.", "error");
      }
    });
  });
}
