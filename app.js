const fileInput = document.getElementById("fileInput");
const charCountInput = document.getElementById("charCount");
const downloadNameInput = document.getElementById("downloadName");
const includeSpacesInput = document.getElementById("includeSpaces");
const keepBlankLinesInput = document.getElementById("keepBlankLines");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const convertBtn = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");
const sampleBtn = document.getElementById("sampleBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");

const TIME_PATTERN = /^(\d{2}:\d{2})(\s*)$/;

fileInput.addEventListener("change", handleFileLoad);
convertBtn.addEventListener("click", handleConvert);
downloadBtn.addEventListener("click", handleDownload);
sampleBtn.addEventListener("click", insertSample);
resetBtn.addEventListener("click", resetAll);

function handleFileLoad(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    inputText.value = e.target.result;
    statusEl.textContent = `파일 불러오기 완료: ${file.name}`;

    if (!downloadNameInput.value.trim() || downloadNameInput.value.trim() === "converted.txt") {
      const baseName = file.name.replace(/\.txt$/i, "");
      downloadNameInput.value = `${baseName}_converted.txt`;
    }
  };
  reader.readAsText(file, "utf-8");
}

function handleConvert() {
  const raw = inputText.value;
  const charLimit = parseInt(charCountInput.value, 10);
  const includeSpaces = includeSpacesInput.checked;
  const keepBlankLines = keepBlankLinesInput.checked;

  if (!raw.trim()) {
    alert("먼저 txt 내용을 불러오거나 입력해주세요.");
    return;
  }

  if (!charLimit || charLimit < 1) {
    alert("글자 수는 1 이상으로 입력해주세요.");
    return;
  }

  const converted = convertByTimestampBlocks(raw, charLimit, includeSpaces, keepBlankLines);
  outputText.value = converted;
  downloadBtn.disabled = false;
  statusEl.textContent = `변환 완료: ${charLimit}글자 기준으로 줄바꿈 처리되었습니다.`;
}

function handleDownload() {
  const content = outputText.value;
  const fileName = (downloadNameInput.value.trim() || "converted.txt").replace(/[\\/:*?"<>|]/g, "_");

  if (!content.trim()) {
    alert("다운로드할 변환 결과가 없습니다.");
    return;
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".txt") ? fileName : `${fileName}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function insertSample() {
  inputText.value = `00:00
아파트 낙찰받고 나서 명도할 때 소유자가 살고 있다고 위험한 물건 같으시죠? 여러분 안녕하세요 반갑습니다. 부자 사관학교 수진 쌤입니다.

00:43
도착했습니다. 낙찰받은 집에 도착했습니다. 미사 부영 아파트에서요 보시면 레스티아로 변경이 됐어요.

01:21
근데 여기는 왜 다시 오신 거예요?`;
  statusEl.textContent = "예시 데이터를 넣었습니다.";
}

function resetAll() {
  fileInput.value = "";
  inputText.value = "";
  outputText.value = "";
  charCountInput.value = 25;
  downloadNameInput.value = "converted.txt";
  includeSpacesInput.checked = true;
  keepBlankLinesInput.checked = true;
  downloadBtn.disabled = true;
  statusEl.textContent = "초기화되었습니다.";
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

    const formattedBody = wrapTextByCharCount(joinedBody, charLimit, includeSpaces);

    if (formattedBody) {
      resultParts.push(`${block.time}\n${formattedBody}`);
    } else {
      resultParts.push(`${block.time}`);
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
