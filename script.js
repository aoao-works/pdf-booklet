// PDFBooklet - PDFを左綴じ・右綴じの形式に変換するツール

// --- ▼ 多言語対応の処理 ▼ ---
const translations = {
    ja: {
        app_title: "PDF冊子作成ツール",
        app_desc: "作りたい冊子の綴じ方をクリックし、PDFファイルを選択してください<br>PDFファイルが冊子形式のデータに変換され、ダウンロードが始まります",
        btn_left: "左綴じで作成<br><small>(横書き・英語など)</small>",
        btn_right: "右綴じで作成<br><small>(縦書き・マンガなど)</small>",
        status_init: "ボタンをクリックしてファイルを選択してください",
        inst_title: "PDF冊子の印刷方法",
        inst_desc: "ダウンロードしたPDF冊子を印刷する手順です",
        step1_title: "印刷設定",
        step1_desc: "プリンターの設定で「<strong>両面印刷</strong>」を選び、綴じ方を「<strong>短辺を綴じる</strong>」に設定します。",
        step2_title: "印刷する",
        step2_desc: "設定を確認して印刷します。用紙はお好みのものを選択してください。",
        step3_title: "二つ折り",
        step3_desc: "印刷された紙を全て重ねたまま、真ん中で半分に折ります。",
        step4_title: "完成！",
        step4_desc: "これで冊子の形になります。必要に応じて、折り目をホッチキスで留めてください。",
        msg_processing: "「{filename}」を{bind}で変換中...",
        msg_bind_left: "左綴じ",
        msg_bind_right: "右綴じ",
        msg_complete: "完了しました！ダウンロードが始まります。",
        msg_error: "エラーが発生しました。PDFファイルを確認してください。"
    },
    en: {
        app_title: "PDF Booklet Maker",
        app_desc: "Select a binding direction and choose your PDF file.<br>Your PDF will be converted into a printable booklet format and downloaded automatically.",
        btn_left: "Left Binding<br><small>(English, Math, etc.)</small>",
        btn_right: "Right Binding<br><small>(Manga, Japanese, etc.)</small>",
        status_init: "Click a button to select a file",
        inst_title: "How to Print Your Booklet",
        inst_desc: "Follow these steps to print your downloaded PDF booklet.",
        step1_title: "Print Settings",
        step1_desc: "Select '<strong>Double-sided printing</strong>' and choose '<strong>Flip on short edge</strong>' in your printer settings.",
        step2_title: "Print",
        step2_desc: "Check your settings and print on your preferred paper.",
        step3_title: "Fold in Half",
        step3_desc: "Keep all printed pages stacked together and fold them exactly in half.",
        step4_title: "Complete!",
        step4_desc: "Your booklet is ready. Staple the fold line if necessary.",
        msg_processing: "Converting '{filename}' with {bind}...",
        msg_bind_left: "left binding",
        msg_bind_right: "right binding",
        msg_complete: "Complete! Download will start shortly.",
        msg_error: "An error occurred. Please check your PDF file."
    }
};

let currentLang = 'ja';

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });
}

// セレクトボックスの切り替えイベント
document.getElementById('langSelect').addEventListener('change', (e) => {
    setLanguage(e.target.value);
});

// ブラウザの言語設定を読み取って、英語環境なら初期表示を英語にする
const browserLang = (window.navigator.languages && window.navigator.languages[0]) || window.navigator.language;
if (browserLang && browserLang.startsWith('en')) {
    document.getElementById('langSelect').value = 'en';
    setLanguage('en');
}
// --- ▲ 多言語対応の処理 ▲ ---

//pdf-libをCDNから読み込む
const { PDFDocument } = PDFLib;

const fileInput = document.getElementById('pdfInput');
const btnLeftBind = document.getElementById('btnLeftBind');
const btnRightBind = document.getElementById('btnRightBind');
const statusDiv = document.getElementById('status');

let isLeftBindMode = true;

// 左綴じモードのボタンイベント
btnLeftBind.addEventListener('click', () => {
    isLeftBindMode = true;
    fileInput.value = '';
    fileInput.click();
});

// 右綴じモードのボタンイベント
btnRightBind.addEventListener('click', () => {
    isLeftBindMode = false;
    fileInput.value = '';
    fileInput.click();
});

// ファイル選択イベント
fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        const selectedFile = e.target.files[0];
        await processPdf(isLeftBindMode, selectedFile);
    }
});

// PDF処理関数
async function processPdf(isLeftBind, file) {
    try {
        // ボタンを無効化して処理中の状態を表示
        btnLeftBind.disabled = true;
        btnRightBind.disabled = true;
        
        // メッセージを言語設定に合わせて表示
        const bindText = isLeftBind ? translations[currentLang].msg_bind_left : translations[currentLang].msg_bind_right;
        let processingMsg = translations[currentLang].msg_processing;
        processingMsg = processingMsg.replace('{filename}', file.name).replace('{bind}', bindText);
        statusDiv.textContent = processingMsg;

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const originalPageCount = pdfDoc.getPageCount();
        
        // ページ数を4の倍数に調整
        let totalPages = originalPageCount;
        while (totalPages % 4 !== 0) { totalPages++; }

        // 新しいPDFドキュメントを作成
        const newPdf = await PDFDocument.create();
        const firstPage = pdfDoc.getPage(0);
        const { width, height } = firstPage.getSize();
        const newWidth = width * 2;
        const newHeight = height;

        const pageIndices = Array.from({ length: originalPageCount }, (_, i) => i);
        const embeddedPages = await newPdf.embedPdf(pdfDoc, pageIndices);

        // ページを左綴じ・右綴じの順序で配置
        for (let i = 0; i < totalPages / 2; i++) {
            const newPage = newPdf.addPage([newWidth, newHeight]);
            let leftIndex, rightIndex;

            if (isLeftBind) {
                if (i % 2 === 0) {
                    leftIndex = totalPages - 1 - i;
                    rightIndex = i;
                } else {
                    leftIndex = i;
                    rightIndex = totalPages - 1 - i;
                }
            } else {
                if (i % 2 === 0) {
                    leftIndex = i;
                    rightIndex = totalPages - 1 - i;
                } else {
                    leftIndex = totalPages - 1 - i;
                    rightIndex = i;
                }
            }

            if (embeddedPages[leftIndex]) {
                newPage.drawPage(embeddedPages[leftIndex], { x: 0, y: 0, width: width, height: height });
            }
            if (embeddedPages[rightIndex]) {
                newPage.drawPage(embeddedPages[rightIndex], { x: width, y: 0, width: width, height: height });
            }
        }

        // PDFを保存してダウンロード
        const pdfBytes = await newPdf.save();
        const bindName = isLeftBind ? 'left' : 'right';
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const newFileName = `${baseName}_booklet_${bindName}.pdf`;
        download(pdfBytes, newFileName, "application/pdf");

        // 完了メッセージを言語設定に合わせて表示
        statusDiv.textContent = translations[currentLang].msg_complete;
        
    } catch (error) {
        console.error(error);
        // エラーメッセージを言語設定に合わせて表示
        statusDiv.textContent = translations[currentLang].msg_error;
    } finally {
        btnLeftBind.disabled = false;
        btnRightBind.disabled = false;
    }
}

// ダウンロード関数
function download(data, filename, type) {
    const blob = new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}