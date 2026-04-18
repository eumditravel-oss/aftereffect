/*
  AE Script: Timeline Text Duplicator from Selected Text Layer
  ------------------------------------------------------------
  사용법
  1. 컴포지션에서 "기준이 될 텍스트 레이어 1개"를 선택합니다.
  2. 이 스크립트를 실행합니다.
  3. 메모장 내용을 붙여넣거나 TXT 파일을 불러옵니다.
  4. [생성] 버튼을 누르면,
     - 선택한 텍스트 레이어를 기준으로 복제하고
     - 시간코드 아래의 각 줄 텍스트를 각각의 복제 레이어에 넣고
     - 해당 시간코드 위치에 배치합니다.

  입력 예시
  00:43
  도착했습니다
  낙찰받은 집에 도착했습니다

  01:21
  근데 여기는 왜 다시 오신 거예요?

  01:23
  저희가 낙찰을 작년 5월 달에 받았어요
  그러면 남짓 1년이 안 됐거든요
*/

(function () {
    function isCompActive() {
        return app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem);
    }

    function isTextLayer(layer) {
        if (!layer) return false;
        try {
            return layer.property("Source Text") !== null;
        } catch (e) {
            return false;
        }
    }

    function trim(str) {
        return str.replace(/^\s+|\s+$/g, "");
    }

    function normalizeText(text) {
        if (!text) return "";
        text = text.replace(/\r\n/g, "\n");
        text = text.replace(/\r/g, "\n");
        text = text.replace(/^\uFEFF/, "");
        return text;
    }

    function timecodeToSeconds(tc) {
        tc = trim(tc);

        // HH:MM:SS
        var m1 = tc.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
        if (m1) {
            return parseInt(m1[1], 10) * 3600 + parseInt(m1[2], 10) * 60 + parseInt(m1[3], 10);
        }

        // MM:SS
        var m2 = tc.match(/^(\d{1,2}):(\d{2})$/);
        if (m2) {
            return parseInt(m2[1], 10) * 60 + parseInt(m2[2], 10);
        }

        return null;
    }

    function parseBlocks(rawText) {
        var text = normalizeText(rawText);
        var lines = text.split("\n");
        var result = [];
        var currentBlock = null;

        for (var i = 0; i < lines.length; i++) {
            var originalLine = lines[i];
            var line = trim(originalLine);

            if (line === "") continue;

            var sec = timecodeToSeconds(line);

            if (sec !== null) {
                currentBlock = {
                    timecode: line,
                    seconds: sec,
                    texts: []
                };
                result.push(currentBlock);
            } else {
                if (currentBlock) {
                    currentBlock.texts.push(originalLine);
                }
            }
        }

        return result;
    }

    function getSelectedTextLayer(comp) {
        if (!comp || !comp.selectedLayers || comp.selectedLayers.length !== 1) {
            return null;
        }
        var layer = comp.selectedLayers[0];
        if (!isTextLayer(layer)) return null;
        return layer;
    }

    function duplicateAndSetText(baseLayer, newText, startSec, indexInBlock, options) {
        var newLayer = baseLayer.duplicate();
        var textProp = newLayer.property("Source Text");
        var textDoc = textProp.value;

        textDoc.text = newText;
        textProp.setValue(textDoc);

        var offsetSec = 0;
        if (options.sequentialMode) {
            offsetSec = indexInBlock * options.stepFrames / options.frameRate;
        }

        var finalStart = startSec + offsetSec;

        try {
            newLayer.startTime = finalStart;
        } catch (e1) {
            try {
                newLayer.inPoint = finalStart;
            } catch (e2) {}
        }

        if (options.renameLayers) {
            newLayer.name = options.prefix + " " + newText;
        }

        return newLayer;
    }

    function readTextFile(fileObj) {
        if (!fileObj || !fileObj.exists) return "";
        fileObj.encoding = "UTF-8";
        fileObj.open("r");
        var content = fileObj.read();
        fileObj.close();
        return content;
    }

    function createUI() {
        var win = new Window("palette", "시간대별 텍스트 키노트 생성기", undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 8;
        win.margins = 12;

        var helpText = win.add("statictext", undefined,
            "1) AE에서 기준 텍스트 레이어 1개 선택\n2) 아래에 텍스트 붙여넣기 또는 TXT 불러오기\n3) 생성"
        );
        helpText.alignment = ["fill", "top"];

        var inputPanel = win.add("panel", undefined, "입력 텍스트");
        inputPanel.orientation = "column";
        inputPanel.alignChildren = ["fill", "fill"];
        inputPanel.margins = 10;

        var inputBox = inputPanel.add("edittext", undefined, "", {
            multiline: true,
            scrolling: true,
            wantReturn: true
        });
        inputBox.preferredSize = [700, 360];

        var fileRow = win.add("group");
        fileRow.orientation = "row";
        fileRow.alignChildren = ["left", "center"];

        var loadBtn = fileRow.add("button", undefined, "TXT 불러오기");
        var clearBtn = fileRow.add("button", undefined, "입력 지우기");

        var optionPanel = win.add("panel", undefined, "옵션");
        optionPanel.orientation = "column";
        optionPanel.alignChildren = ["left", "top"];
        optionPanel.margins = 10;

        var sameTimeRadio = optionPanel.add("radiobutton", undefined, "같은 시간대의 모든 줄을 정확히 같은 시점에 배치");
        var sequentialRadio = optionPanel.add("radiobutton", undefined, "같은 시간대의 줄들을 프레임 단위로 순차 배치");
        sameTimeRadio.value = true;

        var seqGroup = optionPanel.add("group");
        seqGroup.orientation = "row";
        seqGroup.add("statictext", undefined, "순차 배치 프레임 간격:");
        var stepInput = seqGroup.add("edittext", undefined, "2");
        stepInput.characters = 6;
        seqGroup.add("statictext", undefined, "frame");

        var renameCheck = optionPanel.add("checkbox", undefined, "생성 레이어 이름을 텍스트 내용 기준으로 변경");
        renameCheck.value = true;

        var prefixGroup = optionPanel.add("group");
        prefixGroup.orientation = "row";
        prefixGroup.add("statictext", undefined, "레이어 이름 접두어:");
        var prefixInput = prefixGroup.add("edittext", undefined, "TXT");
        prefixInput.characters = 12;

        var bottomRow = win.add("group");
        bottomRow.orientation = "row";
        bottomRow.alignChildren = ["fill", "center"];

        var previewBtn = bottomRow.add("button", undefined, "블록 미리확인");
        var createBtn = bottomRow.add("button", undefined, "생성");

        var infoBox = win.add("edittext", undefined, "", {
            multiline: true,
            scrolling: true,
            readonly: true
        });
        infoBox.preferredSize = [700, 160];

        function refreshSeqEnabled() {
            stepInput.enabled = sequentialRadio.value;
        }
        refreshSeqEnabled();

        sameTimeRadio.onClick = refreshSeqEnabled;
        sequentialRadio.onClick = refreshSeqEnabled;

        clearBtn.onClick = function () {
            inputBox.text = "";
            infoBox.text = "";
        };

        loadBtn.onClick = function () {
            var file = File.openDialog("시간대별 텍스트 파일 선택", "*.txt");
            if (!file) return;

            var txt = readTextFile(file);
            inputBox.text = txt;
            infoBox.text = "파일 불러오기 완료:\n" + file.fsName;
        };

        previewBtn.onClick = function () {
            var raw = inputBox.text;
            if (!trim(raw)) {
                alert("입력 텍스트가 비어 있습니다.");
                return;
            }

            var blocks = parseBlocks(raw);
            if (!blocks.length) {
                alert("시간코드를 찾지 못했습니다.\n예: 00:43 또는 01:02:15");
                return;
            }

            var summary = [];
            var totalLines = 0;

            for (var i = 0; i < blocks.length; i++) {
                totalLines += blocks[i].texts.length;
                summary.push(
                    "[" + blocks[i].timecode + "] 줄 수: " + blocks[i].texts.length
                );
            }

            summary.push("");
            summary.push("총 시간 블록 수: " + blocks.length);
            summary.push("총 생성 예정 텍스트 레이어 수: " + totalLines);

            infoBox.text = summary.join("\n");
        };

        createBtn.onClick = function () {
            if (!isCompActive()) {
                alert("활성 컴포지션이 없습니다.");
                return;
            }

            var comp = app.project.activeItem;
            var baseLayer = getSelectedTextLayer(comp);

            if (!baseLayer) {
                alert("컴포지션에서 기준 텍스트 레이어 1개를 먼저 선택하세요.");
                return;
            }

            var raw = inputBox.text;
            if (!trim(raw)) {
                alert("입력 텍스트가 비어 있습니다.");
                return;
            }

            var blocks = parseBlocks(raw);
            if (!blocks.length) {
                alert("시간코드를 찾지 못했습니다.\n예: 00:43 또는 01:02:15");
                return;
            }

            var stepFrames = parseInt(stepInput.text, 10);
            if (isNaN(stepFrames) || stepFrames < 0) stepFrames = 0;

            var options = {
                sequentialMode: sequentialRadio.value,
                stepFrames: stepFrames,
                frameRate: comp.frameRate,
                renameLayers: renameCheck.value,
                prefix: trim(prefixInput.text || "TXT")
            };

            app.beginUndoGroup("시간대별 텍스트 키노트 생성");

            var createdCount = 0;
            var skippedCount = 0;
            var createdLayers = [];

            try {
                for (var i = 0; i < blocks.length; i++) {
                    var block = blocks[i];

                    for (var j = 0; j < block.texts.length; j++) {
                        var lineText = trim(block.texts[j]);

                        if (lineText === "") {
                            skippedCount++;
                            continue;
                        }

                        var newLayer = duplicateAndSetText(
                            baseLayer,
                            lineText,
                            block.seconds,
                            j,
                            options
                        );

                        createdLayers.push(newLayer);
                        createdCount++;
                    }
                }

                for (var k = 0; k < createdLayers.length; k++) {
                    try {
                        createdLayers[k].selected = true;
                    } catch (eSel) {}
                }

                infoBox.text =
                    "생성 완료\n" +
                    "- 생성된 레이어 수: " + createdCount + "\n" +
                    "- 빈 줄 스킵 수: " + skippedCount + "\n" +
                    "- 기준 레이어: " + baseLayer.name + "\n" +
                    "- 배치 방식: " + (options.sequentialMode ? "순차 배치" : "동일 시점 배치");
            } catch (err) {
                alert("오류가 발생했습니다:\n" + err.toString());
            } finally {
                app.endUndoGroup();
            }
        };

        win.onResizing = win.onResize = function () {
            this.layout.resize();
        };

        return win;
    }

    var ui = createUI();
    ui.center();
    ui.show();
})();
