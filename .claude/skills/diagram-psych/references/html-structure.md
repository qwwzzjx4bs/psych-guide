# HTML構造ガイド（精神科臨床図解）

## 基本テンプレート

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【疾患名】臨床ガイド - 精神科</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* 臨床カラースキーム */
    :root {
      --psych-primary: #1e3a5f;      /* 深い医療ブルー */
      --psych-secondary: #0f766e;    /* 医療ティール */
      --psych-danger: #dc2626;       /* 緊急・禁忌 */
      --psych-warning: #d97706;      /* 注意・副作用 */
      --psych-success: #15803d;      /* 有効・推奨 */
      --psych-gradient: linear-gradient(135deg, #1e3a5f, #0f766e);
      --level-a: #15803d;
      --level-b: #1d4ed8;
      --level-c: #6b7280;
    }

    body {
      font-family: 'Noto Sans JP', 'Inter', sans-serif;
    }

    /* ヘッダー */
    .header-gradient {
      background: var(--psych-gradient);
    }

    /* セクションカード */
    .section-card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
      padding: 2rem;
      margin-bottom: 1.5rem;
    }

    /* 診断基準ボックス */
    .criteria-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left: 4px solid #1d4ed8;
      padding: 1.25rem 1.5rem;
      border-radius: 0.75rem;
      margin: 1rem 0;
    }

    /* 緊急・禁忌ボックス */
    .danger-box {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border-left: 4px solid #dc2626;
      padding: 1.25rem 1.5rem;
      border-radius: 0.75rem;
      margin: 1rem 0;
    }

    /* 注意事項ボックス */
    .warning-box {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border-left: 4px solid #d97706;
      padding: 1.25rem 1.5rem;
      border-radius: 0.75rem;
      margin: 1rem 0;
    }

    /* 推奨治療ボックス */
    .recommend-box {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-left: 4px solid #15803d;
      padding: 1.25rem 1.5rem;
      border-radius: 0.75rem;
      margin: 1rem 0;
    }

    /* エビデンスレベルバッジ */
    .badge-level-a {
      background: linear-gradient(135deg, #15803d, #16a34a);
      color: white;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge-level-b {
      background: linear-gradient(135deg, #1d4ed8, #2563eb);
      color: white;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge-level-c {
      background: linear-gradient(135deg, #4b5563, #6b7280);
      color: white;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* 重症度バッジ */
    .badge-first {
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: white;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge-second {
      background: linear-gradient(135deg, #d97706, #f59e0b);
      color: white;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge-augment {
      background: linear-gradient(135deg, #7c3aed, #8b5cf6);
      color: white;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* 診断ツリーのノード */
    .dx-node {
      padding: 0.75rem 1.25rem;
      border-radius: 0.75rem;
      text-align: center;
      font-weight: 600;
    }
    .dx-node-start {
      background: #1e3a5f;
      color: white;
    }
    .dx-node-check {
      background: #fef3c7;
      border: 2px solid #d97706;
      color: #92400e;
    }
    .dx-node-yes {
      background: #dcfce7;
      border: 2px solid #15803d;
      color: #14532d;
    }
    .dx-node-no {
      background: #fee2e2;
      border: 2px solid #dc2626;
      color: #7f1d1d;
    }
    .dx-node-diagnosis {
      background: linear-gradient(135deg, #1e3a5f, #0f766e);
      color: white;
    }

    /* 目次 */
    .toc {
      position: fixed;
      right: 1.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: white;
      padding: 1rem;
      border-radius: 0.75rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      max-height: 80vh;
      overflow-y: auto;
      z-index: 50;
      min-width: 160px;
    }
    @media (max-width: 1280px) {
      .toc { display: none; }
    }
  </style>
</head>
<body class="bg-gray-50">

  <!-- ヘッダー -->
  <header class="header-gradient text-white py-8">
    <div class="max-w-4xl mx-auto px-4">
      <div class="flex items-center gap-3 mb-2">
        <i data-lucide="brain" class="w-8 h-8 opacity-80"></i>
        <span class="text-sm font-medium opacity-70 uppercase tracking-wider">精神科臨床ガイド</span>
      </div>
      <h1 class="text-3xl md:text-4xl font-bold">【疾患名】</h1>
      <p class="mt-2 text-lg opacity-85">ICD-10: F**.* ／ DSM-5-TR: ○○障害</p>
      <div class="flex gap-2 mt-3 flex-wrap">
        <span class="bg-white/20 text-white text-sm px-3 py-1 rounded-full">診断基準</span>
        <span class="bg-white/20 text-white text-sm px-3 py-1 rounded-full">薬物治療</span>
        <span class="bg-white/20 text-white text-sm px-3 py-1 rounded-full">非薬物治療</span>
      </div>
    </div>
  </header>

  <!-- フローティング目次 -->
  <nav class="toc">
    <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">目次</div>
    <ul class="space-y-1">
      <li><a href="#diagnosis" class="text-sm text-gray-600 hover:text-blue-700 block">診断基準</a></li>
      <li><a href="#subtypes" class="text-sm text-gray-600 hover:text-blue-700 block">サブタイプ</a></li>
      <li><a href="#differential" class="text-sm text-gray-600 hover:text-blue-700 block">鑑別診断</a></li>
      <li><a href="#treatment-pharma" class="text-sm text-gray-600 hover:text-blue-700 block">薬物治療</a></li>
      <li><a href="#treatment-non-pharma" class="text-sm text-gray-600 hover:text-blue-700 block">非薬物治療</a></li>
      <li><a href="#monitoring" class="text-sm text-gray-600 hover:text-blue-700 block">モニタリング</a></li>
    </ul>
  </nav>

  <!-- メインコンテンツ -->
  <main class="max-w-4xl mx-auto px-4 py-8">
    <!-- セクションをここに配置 -->
  </main>

  <script>lucide.createIcons();</script>
</body>
</html>
```

---

## Lucide Icon よく使うアイコン（臨床向け）

| 用途 | アイコン名 | コード |
|------|----------|--------|
| 脳・精神 | `brain` | `<i data-lucide="brain" class="w-6 h-6 text-indigo-600"></i>` |
| 診断 | `stethoscope` | `<i data-lucide="stethoscope" class="w-6 h-6 text-blue-600"></i>` |
| 薬剤 | `pill` | `<i data-lucide="pill" class="w-6 h-6 text-teal-600"></i>` |
| 警告・禁忌 | `triangle-alert` | `<i data-lucide="triangle-alert" class="w-6 h-6 text-red-500"></i>` |
| 注意 | `alert-circle` | `<i data-lucide="alert-circle" class="w-6 h-6 text-orange-500"></i>` |
| チェック・推奨 | `check-circle` | `<i data-lucide="check-circle" class="w-6 h-6 text-green-600"></i>` |
| ステップ進行 | `arrow-right` | `<i data-lucide="arrow-right" class="w-6 h-6 text-gray-500"></i>` |
| 治療選択 | `git-branch` | `<i data-lucide="git-branch" class="w-6 h-6 text-purple-600"></i>` |
| 評価スケール | `clipboard-list` | `<i data-lucide="clipboard-list" class="w-6 h-6 text-blue-500"></i>` |
| 患者情報 | `user` | `<i data-lucide="user" class="w-6 h-6 text-gray-600"></i>` |
| 時間経過 | `clock` | `<i data-lucide="clock" class="w-6 h-6 text-gray-500"></i>` |
| 禁止 | `x-circle` | `<i data-lucide="x-circle" class="w-6 h-6 text-red-600"></i>` |
| フォローアップ | `calendar` | `<i data-lucide="calendar" class="w-6 h-6 text-blue-500"></i>` |
| ガイドライン | `book-open` | `<i data-lucide="book-open" class="w-6 h-6 text-indigo-500"></i>` |
| 心理療法 | `heart-handshake` | `<i data-lucide="heart-handshake" class="w-6 h-6 text-rose-500"></i>` |
| 血液検査 | `activity` | `<i data-lucide="activity" class="w-6 h-6 text-red-500"></i>` |

---

## セクションヘッダーの書き方

```html
<div class="section-card" id="diagnosis">
  <div class="flex items-center gap-3 mb-6">
    <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
      <i data-lucide="stethoscope" class="w-6 h-6 text-blue-700"></i>
    </div>
    <div>
      <h2 class="text-2xl font-bold text-gray-800">診断基準</h2>
      <p class="text-gray-500 text-sm">DSM-5-TR / ICD-10</p>
    </div>
  </div>
  <!-- コンテンツ -->
</div>
```

---

## フローチャートの表現（診断ツリー）

```html
<div class="flex flex-col items-center gap-2 my-6">
  <!-- 開始ノード -->
  <div class="dx-node dx-node-start w-64">主訴・入口症状</div>
  <i data-lucide="arrow-down" class="w-6 h-6 text-gray-400"></i>

  <!-- 判定ノード -->
  <div class="dx-node dx-node-check w-72">2週間以上持続？<br>日常機能障害あり？</div>

  <!-- 分岐 -->
  <div class="flex gap-8 items-start mt-2">
    <div class="flex flex-col items-center gap-2">
      <div class="text-green-700 font-bold text-sm">YES</div>
      <i data-lucide="arrow-down" class="w-5 h-5 text-green-600"></i>
      <div class="dx-node dx-node-diagnosis w-40">MDD疑い</div>
    </div>
    <div class="flex flex-col items-center gap-2">
      <div class="text-red-700 font-bold text-sm">NO</div>
      <i data-lucide="arrow-down" class="w-5 h-5 text-red-500"></i>
      <div class="dx-node dx-node-no w-40">適応障害<br>または正常反応</div>
    </div>
  </div>
</div>
```

---

## 治療ステップフロー（横並び）

```html
<div class="flex flex-col md:flex-row items-stretch gap-4 my-6">
  <!-- Step 1 -->
  <div class="flex-1 bg-red-50 border border-red-200 rounded-xl p-4">
    <div class="flex items-center gap-2 mb-2">
      <div class="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
      <span class="font-bold text-red-800">ファーストライン</span>
    </div>
    <ul class="text-sm space-y-1 text-gray-700">
      <li>・SSRI（エスシタロプラム等）</li>
      <li>・心理教育</li>
      <li>・CBT（可能なら）</li>
    </ul>
    <div class="mt-2"><span class="badge-level-a">Level A</span></div>
  </div>

  <i data-lucide="arrow-right" class="w-6 h-6 text-gray-400 self-center hidden md:block flex-shrink-0"></i>
  <i data-lucide="arrow-down" class="w-6 h-6 text-gray-400 self-center md:hidden"></i>

  <!-- Step 2 -->
  <div class="flex-1 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
    <div class="flex items-center gap-2 mb-2">
      <div class="w-7 h-7 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
      <span class="font-bold text-yellow-800">セカンドライン</span>
    </div>
    <ul class="text-sm space-y-1 text-gray-700">
      <li>・別クラスへ変更</li>
      <li>・増強療法を追加</li>
    </ul>
    <div class="mt-2"><span class="badge-level-b">Level B</span></div>
  </div>

  <i data-lucide="arrow-right" class="w-6 h-6 text-gray-400 self-center hidden md:block flex-shrink-0"></i>

  <!-- Step 3 -->
  <div class="flex-1 bg-purple-50 border border-purple-200 rounded-xl p-4">
    <div class="flex items-center gap-2 mb-2">
      <div class="w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
      <span class="font-bold text-purple-800">治療抵抗性</span>
    </div>
    <ul class="text-sm space-y-1 text-gray-700">
      <li>・rTMS / ECT</li>
      <li>・専門家紹介</li>
    </ul>
    <div class="mt-2"><span class="badge-level-a">Level A</span></div>
  </div>
</div>
```
