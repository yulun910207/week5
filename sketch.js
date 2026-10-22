// ==================== 全域變數宣告 ====================
let csvTable;                // 接收從外部讀取的 Google 試算表 CSV 表格資料
let questions = [];          // 從 CSV 轉換過來的完整題庫陣列
let currentQuiz = [];        // 儲存本次隨機抽出的 5 題
let currentQuestionIndex = 0;// 目前進行到第幾題 (0 到 4)
let score = 0;               // 答對題數計數器

let selectedOption = -1;     // 使用者選擇的選項索引 (-1 表示尚未選擇)
let isAnswered = false;      // 記錄目前題目是否已經作答
let optionAnimTime = 0;      // 動畫計時器 (用於計算選項跳動與左右晃動)

let nextButton;              // 「下一題」或「看結果」按鈕物件
let restartButton;           // 「重新測驗」按鈕物件
let quizState = 'LOADING';   // 測驗狀態：'LOADING'(載入中), 'START'(作答中), 'FINISHED'(結束)

let resultParticles = [];    // 儲存結算畫面的特效粒子陣列

// ==================== 預先載入 Google 試算表外部 CSV 題庫 ====================
function preload() {
  // 💡 請將下方引號內的網址替換為您從 Google 試算表「發布到網路」取得的 CSV 網址
  let googleSheetCSVUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSX8AGqdmldaeMPrERSZE91Zao4ztuyc4lLvu-pGzuJ4KiVe7s6R5UWgErNJqG-plP9o8UFRFo5dJcI/pub?gid=1983429082&single=true&output=csv';
  
  // 讀取線上 CSV 表格，並指定含有標題列 (header)
  csvTable = loadTable(googleSheetCSVUrl, 'csv', 'header', 
    // 成功載入的回呼函式
    () => { console.log("Google 試算表題庫載入成功！共載入 " + csvTable.getRowCount() + " 題"); },
    // 載入失敗的錯誤處理函式
    (err) => { console.error("無法載入 Google 試算表，請檢查網址是否正確或是否已發布", err); }
  );
}

// ==================== 程式初始化設定 ====================
function setup() {
  // 建立全螢幕畫布，自動適應瀏覽器視窗寬高
  createCanvas(windowWidth, windowHeight);
  
  // 設定 p5.js 預設使用 Google 字型 (Noto Serif TC 中文與 Montserrat 英文數字)
  textFont('Noto Serif TC');
  
  // 將 CSV 表格資料解析並轉換為陣列格式
  parseCSVToQuestions();
  
  // 建立「下一題 / 看結果」按鈕
  nextButton = createButton('下一題');
  nextButton.style('font-family', '"Noto Serif TC", "Montserrat", sans-serif');
  nextButton.style('font-size', '16px');
  nextButton.style('padding', '10px 24px');
  nextButton.style('border-radius', '8px');
  nextButton.style('border', 'none');
  nextButton.style('background-color', '#4a90e2');
  nextButton.style('color', '#ffffff');
  nextButton.style('cursor', 'pointer');
  nextButton.mousePressed(nextQuestion);
  nextButton.hide(); // 初始先隱藏

  // 建立「重新測驗」按鈕
  restartButton = createButton('重新測驗');
  restartButton.style('font-family', '"Noto Serif TC", "Montserrat", sans-serif');
  restartButton.style('font-size', '16px');
  restartButton.style('padding', '10px 24px');
  restartButton.style('border-radius', '8px');
  restartButton.style('border', 'none');
  restartButton.style('background-color', '#2ecc71');
  restartButton.style('color', '#ffffff');
  restartButton.style('cursor', 'pointer');
  restartButton.mousePressed(startNewQuiz);
  restartButton.hide(); // 初始先隱藏

  // 開始新的一輪測驗
  startNewQuiz();
}

// ==================== 將載入的 CSV 表格轉為 JavaScript 陣列 ====================
function parseCSVToQuestions() {
  questions = [];
  // 逐列讀取 csvTable 的資料
  for (let i = 0; i < csvTable.getRowCount(); i++) {
    let row = csvTable.getRow(i);
    let qText = row.get('question');
    let opt1 = row.get('opt1');
    let opt2 = row.get('opt2');
    let opt3 = row.get('opt3');
    let opt4 = row.get('opt4');
    let ans = int(row.get('answer')); // 轉為整數索引 (0 ~ 3)

    if (qText && qText.trim() !== "") {
      questions.push({
        q: qText,
        options: [opt1, opt2, opt3, opt4],
        answer: ans
      });
    }
  }
}

// ==================== 每幀繪製迴圈 ====================
function draw() {
  // 設定畫布背景顏色為 #edf2fb
  background('#edf2fb');
  
  // 動畫時間持續累加 (提供給選項跳動或特效使用)
  optionAnimTime += 0.1;

  // 根據目前的測驗狀態來決定繪製哪一個畫面
  if (quizState === 'START') {
    drawQuizScreen(); // 繪製測驗題目與選項畫面
  } else if (quizState === 'FINISHED') {
    drawResultScreen(); // 繪製結算成績與特效畫面
  }
}

// ==================== 視窗大小改變時自動調整 ====================
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateButtonPositions();
}

// ==================== 開始新的一輪測驗 (自動隨機抽 5 題) ====================
function startNewQuiz() {
  // 從題庫中隨機洗牌
  let shuffled = shuffle(questions);
  // 自動從中取出前 5 題作為本次測驗題目
  currentQuiz = shuffled.slice(0, 5);
  
  // 重設目前題號、分數與測驗狀態
  currentQuestionIndex = 0;
  score = 0;
  quizState = 'START';
  
  // 重設單題作答相關狀態
  resetQuestionState();
  
  // 隱藏重新測驗按鈕
  restartButton.hide();
}

// ==================== 重設每題作答狀態 ====================
function resetQuestionState() {
  selectedOption = -1; // 取消選項選擇記錄
  isAnswered = false;  // 設定為尚未作答
  nextButton.hide();   // 隱藏下一題按鈕
}

// ==================== 繪製測驗進行畫面 ====================
function drawQuizScreen() {
  let qData = currentQuiz[currentQuestionIndex];

  // 計算響應式字體與排版尺寸
  let titleSize = constrain(width * 0.032, 20, 26);
  let subtitleSize = constrain(width * 0.018, 14, 16);
  let questionSize = constrain(width * 0.022, 16, 20);
  let optionTextSize = constrain(width * 0.02, 14, 18);

  // 繪製上方主標題
  textAlign(CENTER, TOP);
  textSize(titleSize);
  fill('#2b2d42');
  text("程式設計 p5.js 簡易指令練習測驗", width / 2, height * 0.03);

  // 繪製目前進度文字
  textSize(subtitleSize);
  fill('#8d99ae');
  text(`第 ${currentQuestionIndex + 1} / 5 題 (線上題庫共 ${questions.length} 題隨機抽題)`, width / 2, height * 0.09);

  // 計算題目方塊大小與位置 (背景顏色 #f0ead2)
  let qBoxWidth = constrain(width * 0.85, 280, 650);
  let qBoxHeight = constrain(height * 0.12, 65, 100);
  let qBoxX = width / 2 - qBoxWidth / 2;
  let qBoxY = height * 0.13;

  // 繪製題目方塊外框與背景顏色 #f0ead2
  stroke('#d8e2dc');
  strokeWeight(1);
  fill('#f0ead2');
  rect(qBoxX, qBoxY, qBoxWidth, qBoxHeight, 12);

  // 繪製題目文字內容
  noStroke();
  fill('#1d3557');
  textSize(questionSize);
  textAlign(CENTER, CENTER);
  text(qData.q, qBoxX + qBoxWidth / 2, qBoxY + qBoxHeight / 2);

  // 計算選項卡片的尺寸與間距
  let boxWidth = qBoxWidth;
  let boxHeight = constrain(height * 0.08, 45, 60);
  let gap = constrain(height * 0.02, 10, 16);
  let startY = qBoxY + qBoxHeight + height * 0.03;

  // 迴圈繪製 4 個選項
  for (let i = 0; i < 4; i++) {
    let boxX = width / 2 - boxWidth / 2;
    let boxY = startY + i * (boxHeight + gap);
    
    let bgColor = color(255); // 預設選項背景為白色
    let offsetX = 0;          // X 軸偏移量 (用於左右晃動特效)
    let offsetY = 0;          // Y 軸偏移量 (用於上下跳動特效)

    // 判斷作答後的選項顏色與動畫變化
    if (isAnswered) {
      if (selectedOption === qData.answer) {
        // ---- 使用者答對的情況 ----
        if (i === selectedOption) {
          bgColor = color('#90e0ef');            // 答對選項背景色 (#90e0ef)
          offsetY = sin(optionAnimTime * 4) * 6; // 上下跳動動畫
        }
      } else {
        // ---- 使用者答錯的情況 ----
        if (i === selectedOption) {
          bgColor = color('#f26a8d');            // 選擇錯誤的選項背景色 (#f26a8d)
          offsetX = sin(optionAnimTime * 8) * 6; // 左右搖晃特效
        } else if (i === qData.answer) {
          bgColor = color('#90dbf4');            // 顯示正確答案選項背景色 (#90dbf4)
          offsetY = sin(optionAnimTime * 4) * 6; // 上下跳動提示特效
        }
      }
    } else {
      // 未作答時，滑鼠懸停變色效果
      if (mouseX > boxX && mouseX < boxX + boxWidth && mouseY > boxY && mouseY < boxY + boxHeight) {
        bgColor = color('#e2eafc');
      }
    }

    // 繪製選項卡片
    push();
    translate(boxX + offsetX, boxY + offsetY);
    
    stroke('#d8e2dc');
    strokeWeight(1);
    fill(bgColor);
    rect(0, 0, boxWidth, boxHeight, 10);

    // 繪製選項文字
    noStroke();
    fill('#2b2d42');
    textSize(optionTextSize);
    textAlign(LEFT, CENTER);
    let optLabel = String.fromCharCode(65 + i) + ". " + qData.options[i];
    text(optLabel, boxWidth * 0.05, boxHeight / 2);
    pop();
  }

  // 更新按鈕位置
  updateButtonPositions();
}

// ==================== 滑鼠點擊選項作答處理 ====================
function mousePressed() {
  if (quizState !== 'START' || isAnswered) return;

  let qBoxHeight = constrain(height * 0.12, 65, 100);
  let qBoxY = height * 0.13;
  let boxWidth = constrain(width * 0.85, 280, 650);
  let boxHeight = constrain(height * 0.08, 45, 60);
  let gap = constrain(height * 0.02, 10, 16);
  let startY = qBoxY + qBoxHeight + height * 0.03;

  // 檢查點擊是否落在 4 個選項範圍內
  for (let i = 0; i < 4; i++) {
    let boxX = width / 2 - boxWidth / 2;
    let boxY = startY + i * (boxHeight + gap);

    if (mouseX > boxX && mouseX < boxX + boxWidth && mouseY > boxY && mouseY < boxY + boxHeight) {
      selectedOption = i;
      isAnswered = true;

      // 若選擇正確，分數加 1
      if (selectedOption === currentQuiz[currentQuestionIndex].answer) {
        score++;
      }

      // 檢查是否為最後一題，顯示對應按鈕文字
      if (currentQuestionIndex < 4) {
        nextButton.html('下一題');
        nextButton.show();
      } else {
        nextButton.html('查看測驗結果');
        nextButton.show();
      }
      break;
    }
  }
}

// ==================== 切換至下一題或結束測驗 ====================
function nextQuestion() {
  if (currentQuestionIndex < 4) {
    currentQuestionIndex++; // 題號加 1
    resetQuestionState();   // 重設單題作答狀態
  } else {
    quizState = 'FINISHED'; // 進入結算畫面狀態
    nextButton.hide();      // 隱藏下一題按鈕
    restartButton.show();   // 顯示重新測驗按鈕
    initResultParticles();  // 初始化結算畫面的特效粒子
  }
}

// ==================== 初始化結算特效粒子 ====================
function initResultParticles() {
  resultParticles = [];
  let finalScore = score * 20;
  let particleCount = 60; // 特效粒子數量

  for (let i = 0; i < particleCount; i++) {
    resultParticles.push({
      x: random(width),
      y: random(-height, 0),
      size: random(8, 16),
      speedY: random(2, 6),
      speedX: random(-1, 1),
      color: finalScore >= 60 ? color(random(255), random(255), random(255), 200) : color(255, 100, 150, 180),
      shape: finalScore >= 60 ? floor(random(3)) : 'heart' // 60分以上彩球/紙花，未達60分愛心鼓勵
    });
  }
}

// ==================== 繪製結算結果與特效畫面 ====================
function drawResultScreen() {
  let finalScore = score * 20; // 計算總成績 (每題 20 分，滿分 100)

  // 更新與繪製背景特效粒子
  for (let p of resultParticles) {
    p.y += p.speedY;
    p.x += p.speedX + sin(optionAnimTime + p.y * 0.05) * 0.5;

    // 如果粒子掉落出畫面下方，則重置到上方重新落下
    if (p.y > height) {
      p.y = random(-50, 0);
      p.x = random(width);
    }

    noStroke();
    fill(p.color);
    
    if (finalScore >= 60) {
      // ---- 60 分以上（答對3題以上）：彩球與紙花慶祝特效 ----
      if (p.shape === 0) {
        ellipse(p.x, p.y, p.size, p.size); // 圓形彩球
      } else if (p.shape === 1) {
        rect(p.x, p.y, p.size, p.size * 0.6, 2); // 長方紙花
      } else {
        triangle(p.x, p.y, p.x + p.size, p.size, p.x + p.size / 2, p.y - p.size); // 三角彩片
      }
    } else {
      // ---- 低於 60 分：溫馨愛心與加油特效 ----
      push();
      translate(p.x, p.y);
      scale(p.size / 15);
      beginShape();
      vertex(0, -5);
      bezierVertex(-10, -15, -20, 5, 0, 15);
      bezierVertex(20, 5, 10, -15, 0, -5);
      endShape(CLOSE);
      pop();
    }
  }

  // 繪製結算文字資訊
  textAlign(CENTER, CENTER);
  
  let titleSize = constrain(width * 0.05, 28, 38);
  let textSz = constrain(width * 0.03, 18, 24);
  let scoreSz = constrain(width * 0.04, 22, 30);

  // 繪製結果標題
  textSize(titleSize);
  fill('#1d3557');
  text("測驗完成！", width / 2, height * 0.30);

  // 繪製答對題數與總分
  textSize(textSz);
  fill('#2b2d42');
  text(`答對題數：${score} / 5 題`, width / 2, height * 0.42);

  textSize(scoreSz);
  fill(finalScore >= 60 ? '#2a9d8f' : '#e63946');
  text(`總成績：${finalScore} 分`, width / 2, height * 0.50);

  // 根據成績顯示對應的評語與鼓勵特效文字 (60分及格)
  textSize(textSz * 1.1);
  fill('#457b9d');
  if (finalScore >= 60) {
    text("🎉 太棒了！測驗順利通過（≧60分）！", width / 2, height * 0.58);
  } else {
    text("💪 別氣餒！再練習一次一定能超過60分，加油！", width / 2, height * 0.58);
  }

  // 更新重新測驗按鈕位置
  updateButtonPositions();
}

// ==================== 動態更新按鈕位置 ====================
function updateButtonPositions() {
  if (quizState === 'START') {
    let qBoxHeight = constrain(height * 0.12, 65, 100);
    let qBoxY = height * 0.13;
    let boxHeight = constrain(height * 0.08, 45, 60);
    let gap = constrain(height * 0.02, 10, 16);
    let startY = qBoxY + qBoxHeight + height * 0.03;
    
    let btnY = startY + 4 * (boxHeight + gap) + height * 0.015;
    btnY = min(btnY, height - 70);
    
    nextButton.position(width / 2 - nextButton.width / 2, btnY);
  } else if (quizState === 'FINISHED') {
    restartButton.position(width / 2 - restartButton.width / 2, height * 0.68);
  }
}