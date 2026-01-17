// https://qiita.com/mogamoga1337/items/63dfd3c3a5f0d7304e42

document.addEventListener('DOMContentLoaded', async function() {
    const { jsPDF } = window.jspdf;
    
    const rectWidthInput = document.getElementById('rectWidth');
    const rectHeightInput = document.getElementById('rectHeight');
    const elementListDiv = document.getElementById('elementList');
    const newElementInput = document.getElementById('newElementInput');
    const addElementBtn = document.getElementById('addElementBtn');
    const arrowCharInput = document.getElementById('arrowChar');
    const arrowSizeRatioInput = document.getElementById('arrowSizeRatio');
    const arrowSizeRatioValue = document.getElementById('arrowSizeRatioValue');
    const gapWidthInput = document.getElementById('gapWidth');
    const paddingTopInput = document.getElementById('paddingTop');
    const paddingBottomInput = document.getElementById('paddingBottom');
    const paddingLeftInput = document.getElementById('paddingLeft');
    const paddingRightInput = document.getElementById('paddingRight');
    const gapWidthWarning = document.getElementById('gapWidthWarning');
    const paddingWarning = document.getElementById('paddingWarning');
    const generatePdfBtn = document.getElementById('generatePdf');
    const previewDiv = document.getElementById('preview');
    
    // 要素リスト（テキストと個別フォントサイズを保持）
    let elements = [
        { text: 'あああ', fontSize: null },
        { text: 'いいい', fontSize: null },
        { text: 'ううううう', fontSize: null }
    ];
    
    // 余白は固定値
    const MARGIN_TOP = 20;
    const MARGIN_LEFT = 20;
    
    // A4横向きのサイズ（mm）
    const A4_WIDTH_MM = 297;
    const A4_HEIGHT_MM = 210;
    
    // Canvasの解像度（DPI）
    const DPI = 300;
    const MM_TO_PX = DPI / 25.4;
    
    // 非表示のCanvasを作成
    const canvas = document.createElement('canvas');
    canvas.width = A4_WIDTH_MM * MM_TO_PX;
    canvas.height = A4_HEIGHT_MM * MM_TO_PX;
    const ctx = canvas.getContext('2d');
    
    // フォントを読み込む（Noto Sans JP）
    const fontFamily = 'Noto Sans JP, sans-serif';
    
    // 要素リストを描画
    function renderElementList() {
        elementListDiv.innerHTML = '';
        
        elements.forEach((element, index) => {
            const item = document.createElement('div');
            item.className = 'element-item';
            
            // テキスト入力（編集可能）
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'element-text';
            textInput.value = element.text;
            textInput.addEventListener('input', function() {
                elements[index].text = this.value;
                updatePreview();
            });
            
            const fontSizeInput = document.createElement('input');
            fontSizeInput.type = 'number';
            fontSizeInput.placeholder = '自動';
            fontSizeInput.min = '1';
            fontSizeInput.step = '0.1';
            fontSizeInput.title = '文字サイズ (mm)';
            fontSizeInput.value = element.fontSize || '';
            fontSizeInput.addEventListener('input', function() {
                elements[index].fontSize = this.value ? parseFloat(this.value) : null;
                updatePreview();
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '削除';
            deleteBtn.addEventListener('click', function() {
                elements.splice(index, 1);
                renderElementList();
                updatePreview();
            });
            
            item.appendChild(textInput);
            item.appendChild(fontSizeInput);
            item.appendChild(deleteBtn);
            elementListDiv.appendChild(item);
        });
    }
    
    // 要素を追加
    function addElement() {
        const text = newElementInput.value.trim();
        if (text) {
            elements.push({ text: text, fontSize: null });
            newElementInput.value = '';
            renderElementList();
            updatePreview();
        }
    }
    
    addElementBtn.addEventListener('click', addElement);
    newElementInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addElement();
        }
    });
    
    function drawToCanvas() {
        const rectWidth = parseFloat(rectWidthInput.value) || 50;
        const rectHeight = parseFloat(rectHeightInput.value) || 50;
        
        // Canvasをクリア（白背景）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 座標変換（mmからpxへ）
        const marginTopPx = MARGIN_TOP * MM_TO_PX;
        const marginLeftPx = MARGIN_LEFT * MM_TO_PX;
        const rectWidthPx = rectWidth * MM_TO_PX;
        const rectHeightPx = rectHeight * MM_TO_PX;
        
        // 四角形を描画
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(marginLeftPx, marginTopPx, rectWidthPx, rectHeightPx);
        
        // 要素と矢印を交互に配置
        if (elements.length > 0) {
            // パディング取得
            const paddingTopPx = (parseFloat(paddingTopInput.value) || 0) * MM_TO_PX;
            const paddingBottomPx = (parseFloat(paddingBottomInput.value) || 0) * MM_TO_PX;
            const paddingLeftPx = (parseFloat(paddingLeftInput.value) || 0) * MM_TO_PX;
            const paddingRightPx = (parseFloat(paddingRightInput.value) || 0) * MM_TO_PX;
            
            // パディングを考慮した内側の領域
            const innerLeftPx = marginLeftPx + paddingLeftPx;
            const innerTopPx = marginTopPx + paddingTopPx;
            const innerWidthPx = rectWidthPx - paddingLeftPx - paddingRightPx;
            const innerHeightPx = rectHeightPx - paddingTopPx - paddingBottomPx;
            
            // パラメータ取得
            const n = elements.length; // 要素数
            const w = innerWidthPx; // 横幅（px）パディングを除く
            const b = (parseFloat(gapWidthInput.value) || 2) * MM_TO_PX; // 余白の幅（px）
            const pRaw = parseFloat(arrowSizeRatioInput.value) || 0.5; // 矢印サイズ比率（0~3）
            const p = Math.min(pRaw, 1); // 計算用は1以下に制限
            
            // 計算式に従って幅を計算
            const wr = w - b * (n - 1); // 余白を除いた幅
            const ra = (wr / (2 * n - 1)) * p; // 計算上の矢印の幅
            const elementWidthPx = (wr - ra * (n - 1)) / n; // 実際の要素の幅
            
            // 実際の矢印描画サイズ（1以上の場合も適用）
            const raActual = (wr / (2 * n - 1)) * pRaw;
            
            // フォント設定の基本
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 各アイテムのX座標を計算（要素と矢印と余白を交互に配置）
            let currentX = innerLeftPx; // 現在のX座標（内側左端から開始）
            
            // Y座標は内側領域の中央（縦書きなので中央に配置）
            const centerYPx = innerTopPx + innerHeightPx / 2;
            
            // 小さい文字のリスト（右寄せする）
            const smallCharList = "、。.,っゃゅょぁぃぅぇぉッャュョァィゥェォ";
            // 時計回りに90度回転させる文字
            const rotateCharList = "「」『』()（）【】ー ～…-";
            // 反転させる文字（回転後に反転）
            const reverseCharList = "ー～";
            // 中央寄せする文字
            const centerJustifiedCharList = "()（）【】…";
            // 左寄せする文字
            const leftJustifiedCharList = "」』";
            // 上寄せする文字
            const topJustifiedCharList = "、。」』";
            // 下寄せする文字
            const bottomJustifiedCharList = "「『";
            
            // 各アイテムを横方向に配置
            for (let i = 0; i < elements.length; i++) {
                // 要素のX座標を計算（要素の中心）
                const elementXPx = currentX + elementWidthPx / 2;
                currentX += elementWidthPx; // 要素の幅を進める
                
                // 要素を描画（縦書き：1文字ずつ縦に並べる）
                const element = elements[i];
                const chars = element.text.split(''); // 文字列を1文字ずつに分割
                const charCount = chars.length;
                
                // この要素の横方向のフォントサイズ（要素の幅に合わせる）
                const elementWidthFontSizePx = elementWidthPx;
                
                // この要素の縦方向のフォントサイズ（文字を正方形とみなして、縦幅に収まるように）
                const availableHeightPx = innerHeightPx; // パディングを考慮した高さ
                const elementHeightFontSizePx = charCount > 0 ? availableHeightPx / charCount : availableHeightPx;
                
                // 横方向のフォントサイズと縦方向のフォントサイズの小さい方を採用
                let actualFontSizePx = Math.min(elementWidthFontSizePx, elementHeightFontSizePx);
                
                // 個別のフォントサイズが設定されている場合はそれを使用
                if (element.fontSize !== null) {
                    actualFontSizePx = element.fontSize * MM_TO_PX;
                }
                
                ctx.font = `${actualFontSizePx}px ${fontFamily}`;
                
                // 文字間の間隔を計算（文字を正方形とみなす）
                const charSpacing = actualFontSizePx;
                
                // 縦方向も中央揃え
                const totalTextHeight = charCount * charSpacing;
                const startYPx = centerYPx - totalTextHeight / 2 + charSpacing / 2;
                
                // 基準文字の幅を測定（小さい文字の右寄せに使用）
                const measure = ctx.measureText('あ');
                const standardCharWidth = measure.width;
                
                // 各文字を縦に配置
                for (let j = 0; j < charCount; j++) {
                    const char = chars[j];
                    const charYPx = startYPx + j * charSpacing;
                    
                    const isSmallChar = smallCharList.includes(char);
                    const isRotateChar = rotateCharList.includes(char);
                    const isReverseChar = reverseCharList.includes(char);
                    const isCenterJustified = centerJustifiedCharList.includes(char);
                    const isLeftJustified = leftJustifiedCharList.includes(char);
                    const isTopJustified = topJustifiedCharList.includes(char);
                    const isBottomJustified = bottomJustifiedCharList.includes(char);
                    
                    // X座標のオフセットを計算
                    let charXOffset = 0;
                    if (isSmallChar && !isCenterJustified) {
                        // 小さい文字は右寄せ
                        const charMeasure = ctx.measureText(char);
                        charXOffset = (standardCharWidth - charMeasure.width) / 2;
                    } else if (isLeftJustified) {
                        // 左寄せ
                        const charMeasure = ctx.measureText(char);
                        charXOffset = -(standardCharWidth - charMeasure.width) / 2;
                    }
                    
                    // Y座標のオフセットを計算
                    let charYOffset = 0;
                    if (isTopJustified) {
                        // 上寄せ（少し上に）
                        charYOffset = -actualFontSizePx * 0.1;
                    } else if (isBottomJustified) {
                        // 下寄せ（少し下に）
                        charYOffset = actualFontSizePx * 0.1;
                    }
                    
                    // 文字を描画
                    ctx.save();
                    ctx.translate(elementXPx + charXOffset, charYPx + charYOffset);
                    
                    // 回転が必要な文字は90度回転
                    if (isRotateChar) {
                        ctx.rotate(Math.PI / 2);
                    }
                    
                    // 反転が必要な文字はY軸で反転
                    if (isReverseChar) {
                        ctx.scale(1, -1);
                    }
                    
                    ctx.fillText(char, 0, 0);
                    ctx.restore();
                }
                
                // 最後の要素でなければ余白と矢印と余白を描画
                if (i < elements.length - 1) {
                    // 余白をスキップ
                    currentX += b / 2;
                    
                    // 矢印のX座標を計算（矢印の中心）
                    const arrowXPx = currentX + ra / 2;
                    
                    // 矢印は実際のサイズで描画（中央揃え）
                    const arrowChar = arrowCharInput.value || '→';
                    ctx.font = `${raActual}px ${fontFamily}`;
                    ctx.fillText(arrowChar, arrowXPx, centerYPx);
                    
                    // 矢印の幅と残りの余白を進める（計算上の幅を使用）
                    currentX += ra + b / 2;
                }
            }
        }
        
        return canvas;
    }
    
    function generatePdf() {
        const canvas = drawToCanvas();
        
        // Canvasを画像として取得
        const imgData = canvas.toDataURL('image/png');
        
        // A4サイズのPDFを作成（mm単位、横向き）
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // 画像をPDFに追加（A4サイズ全体に）
        pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
        
        return pdf;
    }
    
    function checkGapWidth() {
        const rectWidth = parseFloat(rectWidthInput.value) || 0;
        const paddingLeft = parseFloat(paddingLeftInput.value) || 0;
        const paddingRight = parseFloat(paddingRightInput.value) || 0;
        const gapWidth = parseFloat(gapWidthInput.value) || 0;
        
        const n = elements.length;
        
        // 余白の合計を計算
        const totalGap = paddingLeft + paddingRight + gapWidth * (n - 1);
        
        // 余白の合計が横幅より大きい場合、警告を表示
        const hasWarning = totalGap >= rectWidth;
        
        // 警告状態を適用
        gapWidthInput.classList.toggle('warning', hasWarning);
        paddingLeftInput.classList.toggle('warning', hasWarning);
        paddingRightInput.classList.toggle('warning', hasWarning);
        
        // 警告メッセージを表示
        if (hasWarning) {
            gapWidthWarning.textContent = '四角形の幅を超えています！！！';
            paddingWarning.textContent = '四角形の幅を超えています！！！';
        } else {
            gapWidthWarning.textContent = '';
            paddingWarning.textContent = '';
        }
        
        return hasWarning;
    }
    
    // プレビューの状態を保持する変数（関数外で宣言）
    let previewScale = null;
    let previewTranslateX = 0;
    let previewTranslateY = 0;
    let previewWrapper = null;
    let previewImg = null;
    let canvasWidthPx = 0;
    let canvasHeightPx = 0;
    
    function initPreviewWrapper() {
        if (previewWrapper) return;
        
        previewWrapper = document.createElement('div');
        previewWrapper.className = 'preview-wrapper';
        
        previewImg = document.createElement('img');
        previewImg.alt = 'プレビュー';
        
        let lastTouchDistance = 0;
        let lastTouchCenter = { x: 0, y: 0 };
        let isPinching = false;
        let isPanning = false;
        
        // タッチイベント処理
        previewWrapper.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                isPinching = true;
                isPanning = true;
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                lastTouchCenter = {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2
                };
            }
        });
        
        previewWrapper.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2 && (isPinching || isPanning)) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                const currentCenter = {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2
                };
                
                // ピンチズーム
                if (lastTouchDistance > 0) {
                    const scaleChange = currentDistance / lastTouchDistance;
                    const newScale = previewScale * scaleChange;
                    previewScale = Math.max(0.1, Math.min(newScale, 10)); // 0.1倍～10倍に制限
                }
                
                // パン（移動）
                if (lastTouchCenter.x !== 0 || lastTouchCenter.y !== 0) {
                    const deltaX = currentCenter.x - lastTouchCenter.x;
                    const deltaY = currentCenter.y - lastTouchCenter.y;
                    previewTranslateX += deltaX;
                    previewTranslateY += deltaY;
                }
                
                lastTouchDistance = currentDistance;
                lastTouchCenter = currentCenter;
                
                updatePreviewTransform();
            }
        });
        
        previewWrapper.addEventListener('touchend', function(e) {
            if (e.touches.length < 2) {
                isPinching = false;
                isPanning = false;
                lastTouchDistance = 0;
                lastTouchCenter = { x: 0, y: 0 };
            }
        });
        
        previewWrapper.appendChild(previewImg);
        previewDiv.innerHTML = '';
        previewDiv.appendChild(previewWrapper);
    }
    
    function updatePreviewTransform() {
        if (!previewImg) return;
        previewImg.style.transform = `translate(calc(-50% + ${previewTranslateX}px), calc(-50% + ${previewTranslateY}px))`;
        previewImg.style.width = `${canvasWidthPx * previewScale}px`;
        previewImg.style.height = `${canvasHeightPx * previewScale}px`;
    }
    
    function updatePreview() {
        checkGapWidth();
        const canvas = drawToCanvas();
        const imgData = canvas.toDataURL('image/png');
        
        // 初回のみラッパーを作成
        initPreviewWrapper();
        
        // キャンバスサイズを更新
        canvasWidthPx = canvas.width;
        canvasHeightPx = canvas.height;
        
        // 初回のみ初期スケールを設定
        if (previewScale === null) {
            const screenWidth = window.innerWidth;
            previewScale = (screenWidth * 0.9) / canvasWidthPx;
        }
        
        // 画像のsrcを更新
        previewImg.src = imgData;
        
        // 変換を適用
        updatePreviewTransform();
    }
    
    // スライダーの値を表示
    arrowSizeRatioInput.addEventListener('input', function() {
        arrowSizeRatioValue.textContent = parseFloat(this.value).toFixed(2);
        updatePreview();
    });
    
    // 入力値変更時に自動更新
    rectWidthInput.addEventListener('input', updatePreview);
    rectHeightInput.addEventListener('input', updatePreview);
    arrowCharInput.addEventListener('input', updatePreview);
    gapWidthInput.addEventListener('input', updatePreview);
    paddingTopInput.addEventListener('input', updatePreview);
    paddingBottomInput.addEventListener('input', updatePreview);
    paddingLeftInput.addEventListener('input', updatePreview);
    paddingRightInput.addEventListener('input', updatePreview);
    
    // 余白チェック用のイベントリスナー（即座にチェック）
    rectWidthInput.addEventListener('input', checkGapWidth);
    gapWidthInput.addEventListener('input', checkGapWidth);
    paddingLeftInput.addEventListener('input', checkGapWidth);
    paddingRightInput.addEventListener('input', checkGapWidth);
    
    generatePdfBtn.addEventListener('click', function() {
        const pdf = generatePdf();
        pdf.save('a4_with_rectangle.pdf');
    });
    
    // ウィンドウリサイズ時にプレビューサイズを更新
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            updatePreview();
        }, 100);
    });
    
    // キーボード表示時に入力欄が見えるようにする
    const controlPanel = document.querySelector('.control-panel');
    
    document.addEventListener('focusin', function(e) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
            // 少し遅延させてキーボードが表示されてからスクロール
            setTimeout(function() {
                // control-panel内でのみスクロール
                if (controlPanel.contains(target)) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    });
    
    // visualViewportでキーボード対応（対応ブラウザのみ）
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function() {
            // ビューポートの高さが変わった時（キーボード表示/非表示）
            const vh = window.visualViewport.height;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        });
        // 初期値を設定
        const vh = window.visualViewport.height;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    // 初期表示
    renderElementList();
    updatePreview();
});
