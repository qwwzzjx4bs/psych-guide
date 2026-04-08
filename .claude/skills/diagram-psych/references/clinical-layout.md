# 臨床レイアウトガイド

外来診察中に即座に参照できる図解のレイアウトパターン集。

---

## 1. 診断基準ボックス（DSM-5-TR / ICD-10）

```html
<div class="criteria-box">
  <div class="flex items-center gap-2 mb-3">
    <i data-lucide="clipboard-list" class="w-5 h-5 text-blue-700"></i>
    <span class="font-bold text-blue-800 text-lg">DSM-5-TR 診断基準 — 大うつ病性障害</span>
  </div>

  <!-- A基準 -->
  <div class="mb-4">
    <div class="font-bold text-gray-700 mb-2">A基準（以下のうち≥5項目、2週間ほぼ毎日）</div>
    <div class="text-sm font-bold text-red-700 mb-1">※①か②の少なくとも1つを含む</div>
    <ul class="space-y-1 text-sm text-gray-700">
      <li class="flex items-start gap-2">
        <span class="text-red-600 font-bold">①</span>
        <span>抑うつ気分（ほぼ1日中、ほぼ毎日）</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-red-600 font-bold">②</span>
        <span>興味・喜びの著しい減退（アンヘドニア）</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-gray-500">③</span>
        <span>体重・食欲の変化（±5%/月）</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-gray-500">④</span>
        <span>不眠または過眠</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-gray-500">⑤</span>
        <span>精神運動興奮または制止（他者観察可能）</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-gray-500">⑥</span>
        <span>疲労感または気力減退</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-gray-500">⑦</span>
        <span>無価値感・過剰な罪責感</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-gray-500">⑧</span>
        <span>思考力・集中力低下・決断困難</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-gray-500">⑨</span>
        <span>死の反復した考え・希死念慮・自殺企図</span>
      </li>
    </ul>
  </div>

  <!-- B〜E基準 -->
  <div class="grid md:grid-cols-2 gap-3 text-sm">
    <div class="bg-white rounded-lg p-3 border">
      <span class="font-bold text-gray-700">B基準</span>
      <p class="text-gray-600 mt-1">社会的・職業的機能の障害</p>
    </div>
    <div class="bg-white rounded-lg p-3 border">
      <span class="font-bold text-gray-700">C基準</span>
      <p class="text-gray-600 mt-1">物質・他の身体疾患によるものではない</p>
    </div>
    <div class="bg-white rounded-lg p-3 border">
      <span class="font-bold text-gray-700">D基準</span>
      <p class="text-gray-600 mt-1">統合失調症スペクトラム障害で説明できない</p>
    </div>
    <div class="bg-white rounded-lg p-3 border">
      <span class="font-bold text-gray-700">E基準</span>
      <p class="text-gray-600 mt-1">躁・軽躁エピソードの既往なし</p>
    </div>
  </div>
</div>
```

---

## 2. サブタイプ分類カード（Specifier一覧）

```html
<div class="section-card" id="subtypes">
  <div class="flex items-center gap-3 mb-5">
    <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
      <i data-lucide="git-branch" class="w-6 h-6 text-purple-700"></i>
    </div>
    <div>
      <h2 class="text-2xl font-bold text-gray-800">サブタイプ・Specifier</h2>
      <p class="text-gray-500 text-sm">治療選択に影響するもの優先</p>
    </div>
  </div>

  <div class="grid md:grid-cols-2 gap-4">
    <!-- 緊急度高のSpecifier -->
    <div class="bg-red-50 border border-red-200 rounded-xl p-4">
      <div class="flex items-center gap-2 mb-2">
        <i data-lucide="triangle-alert" class="w-4 h-4 text-red-600"></i>
        <span class="font-bold text-red-800 text-sm">治療方針を大きく変える</span>
      </div>
      <div class="space-y-2 text-sm text-gray-700">
        <div>
          <span class="font-bold">精神病性の特徴を伴う</span>
          <p class="text-gray-500">→ 抗精神病薬の併用を検討</p>
        </div>
        <div>
          <span class="font-bold">緊張病を伴う</span>
          <p class="text-gray-500">→ BZD or ECT、抗精神病薬は慎重</p>
        </div>
        <div>
          <span class="font-bold">混合性の特徴を伴う</span>
          <p class="text-gray-500">→ 双極性鑑別・SSRI単剤は再考</p>
        </div>
      </div>
    </div>

    <!-- 治療選択に影響するSpecifier -->
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div class="flex items-center gap-2 mb-2">
        <i data-lucide="info" class="w-4 h-4 text-blue-600"></i>
        <span class="font-bold text-blue-800 text-sm">薬剤選択の参考</span>
      </div>
      <div class="space-y-2 text-sm text-gray-700">
        <div>
          <span class="font-bold">非定型の特徴を伴う</span>
          <p class="text-gray-500">→ MAOI（海外）/ SSRI優先</p>
        </div>
        <div>
          <span class="font-bold">憂うつ性の特徴を伴う</span>
          <p class="text-gray-500">→ 重症度高、積極的治療</p>
        </div>
        <div>
          <span class="font-bold">季節性の様式</span>
          <p class="text-gray-500">→ 光療法の適応あり</p>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 3. 鑑別診断リスト

```html
<div class="section-card" id="differential">
  <div class="flex items-center gap-3 mb-5">
    <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
      <i data-lucide="alert-circle" class="w-6 h-6 text-orange-600"></i>
    </div>
    <div>
      <h2 class="text-2xl font-bold text-gray-800">鑑別診断</h2>
      <p class="text-gray-500 text-sm">除外すべき疾患・状態</p>
    </div>
  </div>

  <div class="space-y-3">
    <!-- 必須除外 -->
    <div class="danger-box">
      <div class="font-bold text-red-800 mb-2 flex items-center gap-2">
        <i data-lucide="x-circle" class="w-4 h-4"></i>
        必須除外（見逃し危険）
      </div>
      <ul class="text-sm space-y-1 text-gray-700">
        <li>・双極性障害（過去の躁・軽躁エピソードの確認）</li>
        <li>・甲状腺機能低下症（TSH確認）</li>
        <li>・薬剤誘発性（ステロイド、βブロッカー、INF等）</li>
        <li>・器質性疾患（脳腫瘍、パーキンソン病等）</li>
      </ul>
    </div>

    <!-- 鑑別すべき精神疾患 -->
    <div class="warning-box">
      <div class="font-bold text-yellow-800 mb-2 flex items-center gap-2">
        <i data-lucide="triangle-alert" class="w-4 h-4"></i>
        鑑別すべき精神疾患
      </div>
      <ul class="text-sm space-y-1 text-gray-700">
        <li>・適応障害（明確なストレス因、2週間未満または症状軽微）</li>
        <li>・持続性抑うつ障害（2年以上の慢性経過、症状軽度）</li>
        <li>・悲嘆反応（死別後、機能障害が軽微）</li>
        <li>・統合失調症・統合失調感情障害</li>
      </ul>
    </div>
  </div>
</div>
```

---

## 4. 薬物治療テーブル

```html
<div class="section-card" id="treatment-pharma">
  <div class="flex items-center gap-3 mb-5">
    <div class="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
      <i data-lucide="pill" class="w-6 h-6 text-teal-700"></i>
    </div>
    <div>
      <h2 class="text-2xl font-bold text-gray-800">薬物治療</h2>
      <p class="text-gray-500 text-sm">エビデンスに基づく選択</p>
    </div>
  </div>

  <!-- ファーストライン -->
  <h3 class="font-bold text-gray-700 mb-3 flex items-center gap-2">
    <span class="badge-first">ファーストライン</span>
  </h3>
  <div class="overflow-x-auto mb-6">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="bg-gray-100">
          <th class="text-left p-3 rounded-tl-lg font-bold text-gray-700">薬剤名</th>
          <th class="text-left p-3 font-bold text-gray-700">開始用量</th>
          <th class="text-left p-3 font-bold text-gray-700">目標用量</th>
          <th class="text-left p-3 font-bold text-gray-700">特徴・適応</th>
          <th class="text-left p-3 rounded-tr-lg font-bold text-gray-700">エビデンス</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr class="hover:bg-gray-50">
          <td class="p-3 font-medium">エスシタロプラム</td>
          <td class="p-3">5-10mg/日</td>
          <td class="p-3">10-20mg/日</td>
          <td class="p-3 text-gray-600">忍容性高、相互作用少</td>
          <td class="p-3"><span class="badge-level-a">Level A</span></td>
        </tr>
        <tr class="hover:bg-gray-50">
          <td class="p-3 font-medium">セルトラリン</td>
          <td class="p-3">25-50mg/日</td>
          <td class="p-3">100-200mg/日</td>
          <td class="p-3 text-gray-600">妊産婦・高齢者に比較的安全</td>
          <td class="p-3"><span class="badge-level-a">Level A</span></td>
        </tr>
        <tr class="hover:bg-gray-50">
          <td class="p-3 font-medium">デュロキセチン</td>
          <td class="p-3">20-30mg/日</td>
          <td class="p-3">60mg/日</td>
          <td class="p-3 text-gray-600">慢性疼痛合併、SNRI</td>
          <td class="p-3"><span class="badge-level-a">Level A</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- セカンドライン・増強 -->
  <h3 class="font-bold text-gray-700 mb-3 flex items-center gap-2">
    <span class="badge-second">セカンドライン</span>
    <span class="text-gray-500 text-sm font-normal">4〜8週効果不十分時</span>
  </h3>
  <div class="grid md:grid-cols-2 gap-3">
    <div class="bg-gray-50 rounded-lg p-3 border">
      <div class="font-bold text-sm text-gray-700 mb-1">クラス変更</div>
      <ul class="text-sm text-gray-600 space-y-1">
        <li>・SSRI → SNRI（ベンラファキシン 75-225mg）</li>
        <li>・SSRI → NaSSA（ミルタザピン 15-45mg）</li>
        <li>・SSRI → SMS（ボルチオキセチン 10-20mg）</li>
      </ul>
    </div>
    <div class="bg-gray-50 rounded-lg p-3 border">
      <div class="font-bold text-sm text-gray-700 mb-1">増強療法</div>
      <ul class="text-sm text-gray-600 space-y-1">
        <li>・非定型抗精神病薬（アリピプラゾール、クエチアピン）</li>
        <li>・リチウム（抗うつ薬への増強）</li>
        <li>・甲状腺ホルモン（T3）</li>
      </ul>
    </div>
  </div>
</div>
```

---

## 5. 非薬物治療ボックス

```html
<div class="section-card" id="treatment-non-pharma">
  <div class="flex items-center gap-3 mb-5">
    <div class="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
      <i data-lucide="heart-handshake" class="w-6 h-6 text-rose-600"></i>
    </div>
    <div>
      <h2 class="text-2xl font-bold text-gray-800">非薬物治療</h2>
      <p class="text-gray-500 text-sm">心理社会的介入 / 物理的療法</p>
    </div>
  </div>

  <div class="space-y-3">
    <!-- 心理療法 -->
    <div class="recommend-box">
      <div class="font-bold text-green-800 mb-3 flex items-center gap-2">
        <i data-lucide="check-circle" class="w-4 h-4"></i>
        心理療法
      </div>
      <div class="grid md:grid-cols-2 gap-3">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <span class="badge-level-a">Level A</span>
          </div>
          <div class="text-sm">
            <div class="font-bold text-gray-700">認知行動療法（CBT）</div>
            <div class="text-gray-600">自動思考・認知の歪みへのアプローチ。中等度〜重度うつに薬物療法と同等の効果</div>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <span class="badge-level-a">Level A</span>
          </div>
          <div class="text-sm">
            <div class="font-bold text-gray-700">対人関係療法（IPT）</div>
            <div class="text-gray-600">悲嘆・役割転換・対人関係上の葛藤にフォーカス。うつ病急性期・予防に有効</div>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <span class="badge-level-a">Level A</span>
          </div>
          <div class="text-sm">
            <div class="font-bold text-gray-700">マインドフルネス認知療法（MBCT）</div>
            <div class="text-gray-600">再発予防（3回以上のエピソード既往）で特に有効</div>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <span class="badge-level-b">Level B</span>
          </div>
          <div class="text-sm">
            <div class="font-bold text-gray-700">支持的精神療法（SPT）</div>
            <div class="text-gray-600">外来で毎回実施可能。傾聴・共感・心理教育・問題解決を含む</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 物理的療法 -->
    <div class="bg-purple-50 border-l-4 border-purple-500 rounded-r-xl p-4">
      <div class="font-bold text-purple-800 mb-3 flex items-center gap-2">
        <i data-lucide="zap" class="w-4 h-4"></i>
        物理的療法（治療抵抗性 or 重症）
      </div>
      <div class="grid md:grid-cols-2 gap-3 text-sm">
        <div class="flex items-start gap-2">
          <span class="badge-level-a flex-shrink-0">Level A</span>
          <div>
            <div class="font-bold text-gray-700">mECT（修正型電気けいれん療法）</div>
            <div class="text-gray-600">緊急性高い重症うつ、緊張病、治療抵抗性に第一選択</div>
          </div>
        </div>
        <div class="flex items-start gap-2">
          <span class="badge-level-a flex-shrink-0">Level A</span>
          <div>
            <div class="font-bold text-gray-700">rTMS（反復経頭蓋磁気刺激）</div>
            <div class="text-gray-600">治療抵抗性うつ病。左DLPFC刺激が標準</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 生活指導 -->
    <div class="bg-blue-50 border-l-4 border-blue-400 rounded-r-xl p-4">
      <div class="font-bold text-blue-800 mb-2 flex items-center gap-2">
        <i data-lucide="sun" class="w-4 h-4"></i>
        生活指導・セルフケア
      </div>
      <div class="grid md:grid-cols-3 gap-2 text-sm text-gray-700">
        <div class="flex items-start gap-2">
          <i data-lucide="check" class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"></i>
          <span>有酸素運動（週3回×30分） <span class="text-xs text-gray-500">Level B</span></span>
        </div>
        <div class="flex items-start gap-2">
          <i data-lucide="check" class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"></i>
          <span>睡眠衛生指導 <span class="text-xs text-gray-500">Level B</span></span>
        </div>
        <div class="flex items-start gap-2">
          <i data-lucide="check" class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"></i>
          <span>光療法（季節性） <span class="text-xs text-gray-500">Level A</span></span>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 6. 禁忌・注意事項・モニタリングボックス

```html
<div class="section-card" id="monitoring">
  <div class="flex items-center gap-3 mb-5">
    <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
      <i data-lucide="shield-alert" class="w-6 h-6 text-red-600"></i>
    </div>
    <div>
      <h2 class="text-2xl font-bold text-gray-800">禁忌・注意・モニタリング</h2>
    </div>
  </div>

  <div class="grid md:grid-cols-2 gap-4">
    <!-- 禁忌 -->
    <div class="danger-box">
      <div class="font-bold text-red-800 mb-2 flex items-center gap-2">
        <i data-lucide="x-circle" class="w-4 h-4"></i>
        禁忌
      </div>
      <ul class="text-sm space-y-1 text-gray-700">
        <li>・MAOI併用（セロトニン症候群）</li>
        <li>・QTc延長（エスシタロプラム高用量）</li>
        <li>・パロキセチン：妊娠初期（心奇形リスク）</li>
      </ul>
    </div>

    <!-- モニタリング -->
    <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div class="font-bold text-gray-700 mb-2 flex items-center gap-2">
        <i data-lucide="activity" class="w-4 h-4 text-gray-600"></i>
        定期モニタリング
      </div>
      <ul class="text-sm space-y-1 text-gray-600">
        <li>・自殺リスク評価（特に開始初期2週間）</li>
        <li>・効果判定：4〜6週後にPHQ-9等で評価</li>
        <li>・賦活症候群：開始後1〜2週、特に若年者</li>
        <li>・維持期間：初発6〜12ヶ月、再発2年以上</li>
      </ul>
    </div>
  </div>
</div>
```

---

## 7. 外来クイックリファレンス（最重要ポイント3点）

```html
<div class="section-card">
  <div class="flex items-center gap-3 mb-6">
    <div class="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center">
      <i data-lucide="zap" class="w-6 h-6 text-white"></i>
    </div>
    <div>
      <h2 class="text-2xl font-bold text-gray-800">外来で押さえる3ポイント</h2>
      <p class="text-gray-500 text-sm">診察中に即座に確認すべき要点</p>
    </div>
  </div>

  <div class="grid gap-4">
    <div class="flex items-start gap-4 p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border-l-4 border-red-600">
      <div class="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">1</div>
      <div>
        <div class="font-bold text-lg text-gray-800 mb-1">双極性鑑別を必ず確認</div>
        <p class="text-gray-600 text-sm">過去の躁・軽躁エピソード、薬剤無効歴、家族歴を問診。SSRIを安易に開始しない</p>
      </div>
    </div>
    <div class="flex items-start gap-4 p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-xl border-l-4 border-teal-600">
      <div class="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">2</div>
      <div>
        <div class="font-bold text-lg text-gray-800 mb-1">非薬物治療を初診から提示</div>
        <p class="text-gray-600 text-sm">心理教育・CBTの案内を薬物治療と同時に。支持的傾聴は毎回実施</p>
      </div>
    </div>
    <div class="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border-l-4 border-purple-600">
      <div class="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">3</div>
      <div>
        <div class="font-bold text-lg text-gray-800 mb-1">Specifierでサブタイプを分類</div>
        <p class="text-gray-600 text-sm">「精神病性」「緊張病」「混合性」の特定が治療方針を変える</p>
      </div>
    </div>
  </div>
</div>
```
