# e:camo チャットボット 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** e:camo 心理診断チャットボットを Next.js + Clerk 認証で実装し、localhost で動作する状態にする

**Architecture:** Next.js App Router でチャット UI を構築。親タイプ（P1-P6）× 子タイプ（C1-C8）= 48通りの結果を純粋なスコアリング関数で決定。質問・結果データは静的 TypeScript ファイルで管理し DB 不使用。チャット履歴は React useReducer で管理し、すべてのメッセージが画面上に累積表示される。

**Tech Stack:** Next.js 15, TypeScript, Clerk 6 (jaJP), Tailwind v4, pnpm, vitest

---

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `package.json` | Prisma 削除・vitest 追加した修正版 |
| `tsconfig.json` | git から復元（変更なし） |
| `next.config.mjs` | git から復元（変更なし） |
| `postcss.config.mjs` | git から復元（変更なし） |
| `next-env.d.ts` | git から復元（変更なし） |
| `vitest.config.ts` | vitest 設定（新規） |
| `middleware.ts` | Clerk ミドルウェア（/chat を保護、/sign-in /sign-up を公開） |
| `app/globals.css` | e:camo カラー変数を含むグローバルスタイル |
| `app/layout.tsx` | ClerkProvider + jaJP ルートレイアウト |
| `app/page.tsx` | / → /chat リダイレクト |
| `app/sign-in/[[...sign-in]]/page.tsx` | Clerk サインイン画面 |
| `app/sign-up/[[...sign-up]]/page.tsx` | Clerk サインアップ画面 |
| `app/chat/page.tsx` | チャットフロー画面（認証保護） |
| `lib/types.ts` | 全 TypeScript 型定義 |
| `lib/scoring.ts` | スコアリング純粋関数 |
| `lib/scoring.test.ts` | vitest テスト |
| `data/parent-questions.ts` | Q1-Q12（タイプ分類付き） |
| `data/child-questions.ts` | C1-C8（各5択） |
| `data/results.ts` | R01-R48 ダミーコンテンツ |
| `components/chat/ChatBubble.tsx` | いいかもさん・ユーザーの吹き出し |
| `components/chat/ChoiceButtons.tsx` | 単一選択・複数選択ボタン |
| `components/chat/ChatFlow.tsx` | クイズ全体のステートマシン（useReducer） |

---

## Task 1: プロジェクト設定ファイルの復元

**Files:**
- Restore: `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `next-env.d.ts`
- Create/Modify: `package.json`, `vitest.config.ts`

- [ ] **Step 1: config ファイルを git から復元する**

```bash
cd /Users/yoshidayasutaka/e_camo
git checkout HEAD -- tsconfig.json next.config.mjs postcss.config.mjs next-env.d.ts
```

Expected: 4 ファイルが作業ディレクトリに復元される

- [ ] **Step 2: package.json を作成する（Prisma 削除・vitest 追加）**

```bash
cat > package.json << 'EOF'
{
  "name": "e-camo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@clerk/localizations": "^3.26.3",
    "@clerk/nextjs": "^6.34.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "geist": "latest",
    "lucide-react": "^0.454.0",
    "next": "^15.5.9",
    "react": "^19",
    "react-dom": "^19",
    "tailwind-merge": "^2.5.5",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.9",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4.3.4",
    "postcss": "^8.5",
    "tailwindcss": "^4.1.9",
    "tw-animate-css": "1.3.3",
    "typescript": "^5",
    "vitest": "^2.1.8"
  }
}
EOF
```

- [ ] **Step 3: vitest.config.ts を作成する**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 4: pnpm install を実行する**

```bash
pnpm install
```

Expected: node_modules が作成され、エラーなく完了する

- [ ] **Step 5: コミットする**

```bash
git add package.json tsconfig.json next.config.mjs postcss.config.mjs next-env.d.ts vitest.config.ts
git commit -m "chore: restore project config and add vitest for e:camo"
```

---

## Task 2: TypeScript 型定義

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: lib/types.ts を作成する**

```typescript
// lib/types.ts
export type ParentType = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'
export type ChildType = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8'
export type ParentAnswer = 'まったくない' | 'あまりない' | 'ときどきある' | 'よくある'

export interface ParentQuestion {
  id: string
  text: string
  type: ParentType
}

export interface ChildChoice {
  id: string
  label: string
}

export interface ChildQuestion {
  id: ChildType
  title: string
  questionText: string
  choices: ChildChoice[]
}

export interface DiagnosisResult {
  resultId: string
  parentType: ParentType
  childType: ChildType
  title: string
  body: string
  adviceA: string
  adviceB: string
  adviceC: string
}

export interface ChatMessage {
  id: string
  sender: 'bot' | 'user'
  text: string
}

export type QuizPhase =
  | 'welcome'
  | 'q0_opening'
  | 'parent_questions'
  | 'child_questions'
  | 'result'

export interface QuizState {
  phase: QuizPhase
  messages: ChatMessage[]
  parentQuestionIndex: number
  childQuestionIndex: number
  parentAnswers: Record<string, ParentAnswer>
  childChecks: Record<ChildType, string[]>
  currentChildSelections: string[]
  resultId: string | null
}
```

- [ ] **Step 2: コミットする**

```bash
git add lib/types.ts
git commit -m "feat: add TypeScript types for e:camo quiz"
```

---

## Task 3: 親に関する質問データ

**Files:**
- Create: `data/parent-questions.ts`

- [ ] **Step 1: data/parent-questions.ts を作成する**

```typescript
// data/parent-questions.ts
import type { ParentQuestion } from '@/lib/types'

export const parentQuestions: ParentQuestion[] = [
  {
    id: 'Q1',
    text: '子どもに何かを伝えたあと、「あの対応でよかったのかな」と自分を責めてしまうことがある？',
    type: 'P1',
  },
  {
    id: 'Q2',
    text: '育児の状況（学校・仕事・日常の時間）が壁になり、自分の発言に自信が持てなくなることがある？',
    type: 'P1',
  },
  {
    id: 'Q3',
    text: '頑張っていることを思えても、環境や状況がなかなか変わらないと感じることがある？',
    type: 'P2',
  },
  {
    id: 'Q4',
    text: '本当の助けがほしいのに、「自分でなんとかしなきゃ」と追い込んでしまうことがある？',
    type: 'P2',
  },
  {
    id: 'Q5',
    text: '人とのやりとりで、理解されたり傷ついたりすることが多いと感じる？',
    type: 'P3',
  },
  {
    id: 'Q6',
    text: '別れの形があり、気持ちを入れ替えるのが大変だと感じることがある？',
    type: 'P3',
  },
  {
    id: 'Q7',
    text: '子どもの調子がいいと、自分の気持ちも大きく変わることがある？',
    type: 'P4',
  },
  {
    id: 'Q8',
    text: '「この子のために、何が犠牲でもなきゃ」と呼び続けることが多い？',
    type: 'P4',
  },
  {
    id: 'Q9',
    text: '自分に自信が持てず、一人になりやすいと感じることがある？',
    type: 'P5',
  },
  {
    id: 'Q10',
    text: '人に頼ることに、少し罪悪感を感じることがある？',
    type: 'P5',
  },
  {
    id: 'Q11',
    text: '褒めを受け取りにくく、頼りにくいと感じることはある？',
    type: 'P6',
  },
  {
    id: 'Q12',
    text: '「休みたい」と思っても休んだ感覚がないことがある？',
    type: 'P6',
  },
]
```

- [ ] **Step 2: コミットする**

```bash
git add data/parent-questions.ts
git commit -m "feat: add parent questions data (Q1-Q12)"
```

---

## Task 4: 子どもに関する質問データ

**Files:**
- Create: `data/child-questions.ts`

- [ ] **Step 1: data/child-questions.ts を作成する**

```typescript
// data/child-questions.ts
import type { ChildQuestion } from '@/lib/types'

export const childQuestions: ChildQuestion[] = [
  {
    id: 'C1',
    title: '発達傾向',
    questionText: '次の中で、お子さんの様子に近いものを選んでね。（複数可）',
    choices: [
      { id: 'C1-1', label: '集団での指示が分かりにくそう' },
      { id: 'C1-2', label: '切り替えに時間がかかる' },
      { id: 'C1-3', label: 'こだわりが強い' },
      { id: 'C1-4', label: '言葉で気持ちを伝えるのが難しそう' },
      { id: 'C1-5', label: '周囲と同じペースがしんどそう' },
    ],
  },
  {
    id: 'C2',
    title: '感覚過敏',
    questionText: '次の中で、お子さんの様子に近いものを選んでね。（複数可）',
    choices: [
      { id: 'C2-1', label: '音や光、人の多さで疲れやすい' },
      { id: 'C2-2', label: '学校後にぐったりしている' },
      { id: 'C2-3', label: '刺激が重なると体調が崩れやすい' },
      { id: 'C2-4', label: '静かな環境を好む' },
      { id: 'C2-5', label: '服や環境の変化に敏感' },
    ],
  },
  {
    id: 'C3',
    title: '心理的出来事',
    questionText: '次の中で、お子さんの様子に近いものを選んでね。（複数可）',
    choices: [
      { id: 'C3-1', label: 'ある出来事をきっかけに変化した' },
      { id: 'C3-2', label: '思い出すと不安が強まる' },
      { id: 'C3-3', label: '登校前後に不調が出やすい' },
      { id: 'C3-4', label: '「怖い」「無理」が増えた' },
      { id: 'C3-5', label: '安全な場所を強く求める' },
    ],
  },
  {
    id: 'C4',
    title: '特定分野への集中',
    questionText: '次の中で、お子さんの様子に近いものを選んでね。（複数可）',
    choices: [
      { id: 'C4-1', label: '興味のあることへの集中が非常に高い' },
      { id: 'C4-2', label: '興味のないことは強く拒否する' },
      { id: 'C4-3', label: '一人で過ごす時間を好む' },
      { id: 'C4-4', label: '周囲と関心が合いにくい' },
      { id: 'C4-5', label: '得意さが活かされにくい環境にいる' },
    ],
  },
  {
    id: 'C5',
    title: '我慢・タイミング待ち',
    questionText: '次の中で、お子さんの様子に近いものを選んでね。（複数可）',
    choices: [
      { id: 'C5-1', label: '自分の気持ちをあまり言わない' },
      { id: 'C5-2', label: '「大丈夫」が口癖' },
      { id: 'C5-3', label: '以前より元気がない' },
      { id: 'C5-4', label: '動き出すまで時間がかかる' },
      { id: 'C5-5', label: '無理を重ねてきたように感じる' },
    ],
  },
  {
    id: 'C6',
    title: '人間関係ストレス',
    questionText: '次の中で、お子さんの様子に近いものを選んでね。（複数可）',
    choices: [
      { id: 'C6-1', label: '対人関係で悩んでいる' },
      { id: 'C6-2', label: '人と関わると強く疲れる' },
      { id: 'C6-3', label: '傷つく経験が多い' },
      { id: 'C6-4', label: '対人場面を避けたがる' },
      { id: 'C6-5', label: '気を遣いすぎている' },
    ],
  },
  {
    id: 'C7',
    title: '家庭内ストレス',
    questionText: '次の中で、お子さんの様子に近いものを選んでね。（複数可）',
    choices: [
      { id: 'C7-1', label: '家庭の空気に敏感' },
      { id: 'C7-2', label: '家で元気が出にくい' },
      { id: 'C7-3', label: '家族のことで気を遣いすぎる' },
      { id: 'C7-4', label: '安心できる大人を求める' },
      { id: 'C7-5', label: '家庭が落ち着くと調子が上がる' },
    ],
  },
  {
    id: 'C8',
    title: '合理的選択',
    questionText: '次の中で、お子さんの様子に近いものを選んでね。（複数可）',
    choices: [
      { id: 'C8-1', label: '学校以外では落ち着いている' },
      { id: 'C8-2', label: '本人なりに考えて選んでいる' },
      { id: 'C8-3', label: '無理に戻そうとすると抵抗が強い' },
      { id: 'C8-4', label: '自分のペースを大事にしている' },
      { id: 'C8-5', label: 'エネルギーを溜めている途中に見える' },
    ],
  },
]
```

- [ ] **Step 2: コミットする**

```bash
git add data/child-questions.ts
git commit -m "feat: add child questions data (C1-C8)"
```

---

## Task 5: 診断結果データ（R01-R48）

**Files:**
- Create: `data/results.ts`

- [ ] **Step 1: data/results.ts を作成する**

```typescript
// data/results.ts
import type { DiagnosisResult } from '@/lib/types'

export const results: DiagnosisResult[] = [
  // ── P1（燃え尽き・自責系）──────────────────────────────
  {
    resultId: 'R01', parentType: 'P1', childType: 'C1',
    title: 'ふたりで、ゆっくり歩いていこう',
    body: '子どもの特性に向き合いながら、あなたはずっと自分を問い続けてきたのね。「あの対応でよかったのか」と振り返る優しさが、あなたの誠実さの証よ。完璧な親なんてどこにもいないから、今日も一緒にいられたことを誇ってほしいのよ。あなたの誠実さが、お子さんの安心につながっているのよ。',
    adviceA: '今日の自分の対応を「よくできた点」として1つだけ思い出してみてね',
    adviceB: '発達特性の子を持つ保護者のオンライングループを検索してみてね',
    adviceC: '就寝前に「今日できたこと」を1行だけメモしてみてね',
  },
  {
    resultId: 'R02', parentType: 'P1', childType: 'C2',
    title: 'あなたの気づきが、お子さんを守っているのよ',
    body: '音や光に疲れやすいお子さんの様子を、あなたはいつも敏感に感じ取ってきたのね。「もっとうまく守れたはず」と責める気持ちもわかるけど、あなたがそこにいるだけで安心感になっているのよ。自分を責めるエネルギーを、少しだけ自分を労うことに使ってほしいのよ。今日も一緒にいてくれてありがとう。',
    adviceA: 'お子さんが落ち着く「静かな時間」を、今週1回一緒に作ってみてね',
    adviceB: '「今日守れたこと」を夜に一つ確認する習慣をつけてみてね',
    adviceC: '感覚過敏について書かれたページを一つ読んでみてね',
  },
  {
    resultId: 'R03', parentType: 'P1', childType: 'C3',
    title: 'あなたがそばにいることが、いちばんの安全なのよ',
    body: 'ある出来事をきっかけに変化したお子さんを前に、あなたも戸惑い、自分を責めてきたのね。でも、そばにいて、気づいて、動こうとしているあなたの姿が、何より大切なのよ。完璧な対応なんてなくていい。ただそこにいることが、お子さんには一番の安心なのよ。今日のあなたは十分すぎるほどよ。',
    adviceA: '専門家（スクールカウンセラーや児童相談所）への相談を検討してみてね',
    adviceB: 'お子さんが安心できる「決まったルーティン」を一つ作ってみてね',
    adviceC: 'あなた自身も誰かに話を聞いてもらう機会を作ってみてね',
  },
  {
    resultId: 'R04', parentType: 'P1', childType: 'C4',
    title: 'その才能を、一緒に育てていこう',
    body: '好きなことに深く集中するお子さんと向き合いながら、あなたは「これでいいのか」と自問してきたのね。でも、その集中力はとても貴重なものよ。あなたが認めてあげることで、お子さんの才能はさらに育つのよ。自分を責めるより、お子さんの得意を一緒に楽しむ視点に少しだけ変えてみてほしいのよ。',
    adviceA: 'お子さんの「好き」について、今日5分だけ一緒に話してみてね',
    adviceB: '得意な分野を伸ばせる環境（習い事・オンラインコミュニティ）を調べてみてね',
    adviceC: '今日の自分に「よくやった」と声をかけてみてね',
  },
  {
    resultId: 'R05', parentType: 'P1', childType: 'C5',
    title: 'あなたの「待てる力」は本物よ',
    body: '「大丈夫」と言いながら我慢しているお子さんを見て、あなたも何度も自分を責めてきたのね。でも、焦らず待ってあげられるあなたの姿が、お子さんに「ここは安全だよ」と伝えているのよ。今は動き出すタイミングを待っている大事な時期よ。あなたの忍耐が、お子さんの回復を支えているのよ。',
    adviceA: '「待っていること」をお子さんに言葉で伝えてみてね：「急がなくていいよ」',
    adviceB: '今週、自分のために「好きなこと」を15分だけする時間を作ってみてね',
    adviceC: '信頼できる人に「最近どう？」と近況を話してみてね',
  },
  {
    resultId: 'R06', parentType: 'P1', childType: 'C6',
    title: '傷つきやすいのは、やさしさの証よ',
    body: '友人関係で悩んでいるお子さんを見て、あなたも自分の関わり方を何度も振り返ってきたのね。でも、傷ついても諦めない心は、あなたから受け取ったものかもしれないのよ。対人関係は難しいけれど、あなたがそばで支えているだけで十分なのよ。今日もそばにいてくれたことを認めてほしいのよ。',
    adviceA: 'お子さんの話を聞く時間を、今日10分作ってみてね（解決しようとしなくていいのよ）',
    adviceB: 'スクールカウンセラーへの相談を、一度検討してみてね',
    adviceC: 'あなた自身の人間関係で「ほっとできる人」に連絡してみてね',
  },
  {
    resultId: 'R07', parentType: 'P1', childType: 'C7',
    title: '家の空気を守ってきたのはあなたよ',
    body: '家庭の空気に敏感なお子さんのために、あなたはずっと気を張ってきたのね。「もっとうまくできたはず」と思う日もあったかもしれないけれど、今日もその場を守ってきたあなたは十分すぎるほどよ。家庭が安定することで、お子さんはゆっくりと回復できるのよ。あなたの頑張りは、静かに届いているのよ。',
    adviceA: '家の中で「ほっとできる場所」を、お子さんと一緒に決めてみてね',
    adviceB: '家族以外の誰かに、今の状況を話せる機会を作ってみてね',
    adviceC: '今夜だけは、家事を一つサボってみてね',
  },
  {
    resultId: 'R08', parentType: 'P1', childType: 'C8',
    title: 'お子さんの判断を、信じていいのよ',
    body: '自分なりに考えて選択しているお子さんを見ながら、「これでいいのか」と不安になってきたのね。でも、自分のペースで選べるお子さんの力は、あなたが信じてきた証よ。今は充電期間よ。焦らず、お子さんの選択を尊重してみてね。あなたが信じることが、お子さんの自信につながるのよ。',
    adviceA: '今週一度、「あなたを信じているよ」とお子さんに伝えてみてね',
    adviceB: '学校以外の選択肢（フリースクール等）の情報を、気持ちが落ち着いたら調べてみてね',
    adviceC: 'あなたの「心配」をノートに書き出して、整理してみてね',
  },

  // ── P2（孤独で辛い系）──────────────────────────────────
  {
    resultId: 'R09', parentType: 'P2', childType: 'C1',
    title: '孤独の中で、あなたは道を作ってきたのよ',
    body: '環境にミスマッチを感じながら、特性のあるお子さんと向き合ってきたのね。誰もわかってくれないと感じる日も多かったかもしれないけれど、それでも諦めなかったあなたの姿が、お子さんの支えになっているのよ。一人で抱えすぎているのが伝わるわ。少しだけ、荷物を誰かと分けてほしいのよ。',
    adviceA: '発達支援センターや相談機関に、一度連絡してみてね',
    adviceB: '同じ状況の親が集まるオンラインコミュニティを一つ探してみてね',
    adviceC: '今日の孤独な気持ちを、日記に書いてみてね',
  },
  {
    resultId: 'R10', parentType: 'P2', childType: 'C2',
    title: '静かに理解してきた、あなたへ',
    body: '音や刺激に敏感なお子さんのことを、あなたはひとりで理解しようとしてきたのね。環境が変わらない中でも、静かにそばにいてきたあなたの存在が、お子さんにとっての安全地帯になっているのよ。孤独に感じていることは本物だけど、あなたの理解は確かにお子さんに届いているのよ。',
    adviceA: '感覚過敏のある子の保護者向けの情報サイトを調べてみてね',
    adviceB: '支援機関や相談窓口に、「話を聞いてほしい」と連絡してみてね',
    adviceC: '今日、自分のために好きな飲み物を一杯飲む時間を作ってみてね',
  },
  {
    resultId: 'R11', parentType: 'P2', childType: 'C3',
    title: 'あなたも揺れていい、それでも大丈夫よ',
    body: 'ある出来事をきっかけに変化したお子さんを、孤独に支えてきたのね。あなた自身も傷つき、揺れてきたはずよ。強くなければならないと思い込まなくていいのよ。あなたが揺れながらも寄り添ってきた事実が、何よりも大切なのよ。今こそ、あなた自身もサポートを受ける時よ。',
    adviceA: 'あなた自身のための相談窓口（よりそいホットライン等）に連絡してみてね',
    adviceB: 'お子さんの支援機関に、状況を正直に話してみてね',
    adviceC: '今日だけは、「よく頑張ってきた」と自分に言ってあげてね',
  },
  {
    resultId: 'R12', parentType: 'P2', childType: 'C4',
    title: '独自の世界を、二人で守っていけるよ',
    body: '好きなことに没頭するお子さんを、孤独に理解しようとしてきたのね。周囲に理解されにくく、自信を失う日もあったかもしれないけれど、あなたの理解がお子さんの世界を守っているのよ。その得意さは、いつかきっと力になる。二人の関係を信じてほしいのよ。',
    adviceA: 'お子さんの得意なことについて、今日一緒に5分語ってみてね',
    adviceB: '得意分野を活かせるコミュニティ（オンライン可）を調べてみてね',
    adviceC: 'あなたの理解者を一人増やすことを、今月の目標にしてみてね',
  },
  {
    resultId: 'R13', parentType: 'P2', childType: 'C5',
    title: '待てるのは、信じているからよ',
    body: '我慢を重ねてきたお子さんを、孤独な環境の中で待ち続けてきたのね。あなたも疲れているはずよ。でも、待つことができているのは、お子さんへの深い信頼があるからよ。その信頼は本物よ。あなた自身も誰かに「待っていてもいいよ」と言ってもらう必要があるのよ。',
    adviceA: '今日、信頼できる誰かに電話かメッセージを送ってみてね',
    adviceB: '「待っている間」の自分を労う時間を10分作ってみてね',
    adviceC: '支援者や相談機関に、現在の状況を話してみてね',
  },
  {
    resultId: 'R14', parentType: 'P2', childType: 'C6',
    title: 'あなたも傷ついていることを、忘れないでね',
    body: '対人関係でストレスを抱えるお子さんを支えながら、あなた自身も孤独の中で傷ついてきたのね。お子さんの痛みに寄り添う前に、あなた自身の痛みも大切にしていいのよ。自分を後回しにしすぎると、いつか限界が来てしまうわ。今日は、あなた自身を一番に考える日にしてほしいのよ。',
    adviceA: 'あなたが話せる相談窓口（電話・チャット）を一つ検索してみてね',
    adviceB: '今週、一人でゆっくりできる時間を30分確保してみてね',
    adviceC: '「つながれる場所」を一つ探してみてね（保護者の会・SNSグループ等）',
  },
  {
    resultId: 'R15', parentType: 'P2', childType: 'C7',
    title: '家庭を守ってきたのはあなたよ',
    body: '家庭の空気に敏感なお子さんのために、孤独な環境の中で家を守ってきたのね。誰にも見えていないかもしれないけれど、その努力はちゃんと積み上がっているのよ。一人で家庭を支えようとしなくていい。助けを求めることは、弱さじゃないのよ。あなたは十分すぎるほど頑張ってきたわ。',
    adviceA: '家庭支援を行う機関（家庭相談員・民生委員等）に相談してみてね',
    adviceB: '今日一つだけ、誰かに助けを求めてみてね（小さなことでいいのよ）',
    adviceC: 'あなた自身が「ほっとできること」を今日一つしてみてね',
  },
  {
    resultId: 'R16', parentType: 'P2', childType: 'C8',
    title: '選べる子の親は、選んできた人よ',
    body: '自分なりに考えて選択できるお子さんを、孤独な中で育ててきたのね。その判断力は、あなたが信じ続けてきた結果よ。孤独に感じてきたかもしれないけれど、お子さんが自分で選べているなら、それはあなたの子育ての確かな成果よ。今度はあなたが、自分のために選ぶ番よ。',
    adviceA: '今月、自分のために一つ「やってみたいこと」を選んでみてね',
    adviceB: 'お子さんの選択を信頼していることを、言葉で伝えてみてね',
    adviceC: '孤独感を感じたとき、話せる場所（相談窓口・SNS）を一つ確認しておいてね',
  },

  // ── P3（独りで強がる系）────────────────────────────────
  {
    resultId: 'R17', parentType: 'P3', childType: 'C1',
    title: '強さを、少しだけ手放してみてね',
    body: '発達の特性があるお子さんを、一人で強く支えようとしてきたのね。傷ついても「大丈夫」と言い続けてきたあなたへ、今日だけは弱くいていいのよ。強がりは時に、本当に必要なサポートを遠ざけてしまうことがあるのよ。あなたが助けを求めることで、お子さんのためにもっとできることが増えるのよ。',
    adviceA: '支援機関に「助けてほしい」と一言伝えてみてね',
    adviceB: '信頼できる一人に、今の本音を話してみてね',
    adviceC: '今日の自分に「よく頑張った」と鏡の前で言ってみてね',
  },
  {
    resultId: 'R18', parentType: 'P3', childType: 'C2',
    title: '感じ取る力があるから、つながれるのよ',
    body: '感覚過敏のあるお子さんの微妙な変化を、あなたは敏感に感じ取ってきたのね。その繊細さは強みよ。でも、一人で抱えすぎると疲れてしまうわ。誰かとつながることを「弱さ」と思わないでほしいのよ。あなたが感じ取ってきたものを、誰かに話すことで楽になれるのよ。',
    adviceA: '感覚過敏についての保護者向け相談窓口を調べてみてね',
    adviceB: '信頼できる一人に、今日の気持ちを少しだけ話してみてね',
    adviceC: '今週、自分がほっとできる場所で30分過ごしてみてね',
  },
  {
    resultId: 'R19', parentType: 'P3', childType: 'C3',
    title: 'あなた自身も、十分傷ついてきたのよ',
    body: 'ある出来事で変化したお子さんを、あなたは一人で強く支えようとしてきたのね。でも、あなた自身も相当傷ついているはずよ。強がることで、あなた自身の傷を見えなくしてきたのかもしれないのよ。今日こそ、あなたが誰かにサポートしてもらう番よ。弱くていいのよ。',
    adviceA: 'あなた自身のために心理相談（カウンセリング等）を一度検討してみてね',
    adviceB: '「今、辛い」と一言だけ、誰かに伝えてみてね',
    adviceC: 'お子さんの支援機関に、あなたの状況も正直に話してみてね',
  },
  {
    resultId: 'R20', parentType: 'P3', childType: 'C4',
    title: 'その集中力を、一緒に楽しんでね',
    body: '好きなことに集中するお子さんを、一人で支えてきたのね。周囲と理解し合えない孤独を感じながら、それでも強く見せてきたのよ。でも、お子さんの得意さを一緒に楽しむことで、あなた自身も少し軽くなれるのよ。強がりは一休みして、一緒にその世界に入ってみてね。',
    adviceA: '今日、お子さんの「好き」について、楽しむ気持ちで5分聞いてみてね',
    adviceB: '得意さを活かすコミュニティを、お子さんと一緒に探してみてね',
    adviceC: '今週、誰かと「楽しかったこと」を共有してみてね',
  },
  {
    resultId: 'R21', parentType: 'P3', childType: 'C5',
    title: '我慢しているのはお子さんだけじゃないわ',
    body: '「大丈夫」と言いながら我慢するお子さんを見て、あなたも強がってきたのね。でも、あなたも相当我慢してきたはずよ。二人で同じように我慢していると、どちらも限界が見えにくくなってしまうのよ。あなたから先に「しんどい」と言えると、お子さんも楽になれるかもしれないのよ。',
    adviceA: '「今、少し疲れてる」とお子さんに正直に言ってみてね',
    adviceB: 'あなたの我慢を、信頼できる人に話してみてね',
    adviceC: '今日、我慢をひとつやめてみてね（小さなことでいいのよ）',
  },
  {
    resultId: 'R22', parentType: 'P3', childType: 'C6',
    title: '人間関係の疲れを、ふたりで分かち合おう',
    body: '対人関係でストレスを抱えるお子さんを前に、あなたも人間関係で傷ついてきたのね。強がって誰にも頼らずに来たけれど、そろそろ荷物を降ろしていいのよ。傷ついた経験があるからこそ、お子さんの痛みがわかるのよ。その共感を力に変えてみてね。',
    adviceA: 'あなた自身の人間関係で「ほっとできる人」に連絡してみてね',
    adviceB: 'スクールカウンセラーや支援機関に、お子さんの状況を話してみてね',
    adviceC: '今日の「しんどかったこと」を誰かに話してみてね',
  },
  {
    resultId: 'R23', parentType: 'P3', childType: 'C7',
    title: '家庭の中で、あなたが一番疲れているかもしれないのよ',
    body: '家庭の空気に敏感なお子さんのために、あなたは一人で強く家庭を維持しようとしてきたのね。でも実は、あなたが一番疲れているかもしれないのよ。強がることで誰にも言えずにいる疲れを、今日だけは誰かに話してほしいのよ。あなたが休むことが、家庭全体のためにもなるのよ。',
    adviceA: '家族以外の誰か一人に、今の疲れを正直に話してみてね',
    adviceB: '家庭支援を行う機関に、状況を相談してみてね',
    adviceC: '今夜、「何もしない時間」を30分作ってみてね',
  },
  {
    resultId: 'R24', parentType: 'P3', childType: 'C8',
    title: 'お子さんの判断力は、あなたから学んだものよ',
    body: '自分のペースで合理的に選択できるお子さんを、あなたは一人で強くなることで支えてきたのね。その判断力は、あなたが見せてきた姿から育まれたものよ。今度はあなた自身も、「弱くていい」と選択してみてほしいのよ。強さと弱さを両方持てることが、本当の強さよ。',
    adviceA: '「助けを求める」を今日の目標にしてみてね',
    adviceB: 'お子さんの自立を認めながら、自分も自由になる練習をしてみてね',
    adviceC: '信頼できる一人に、今の状況を打ち明けてみてね',
  },

  // ── P4（子ども最優先になりすぎる系）──────────────────
  {
    resultId: 'R25', parentType: 'P4', childType: 'C1',
    title: 'お子さんのペースと、あなたのペースは別でいいのよ',
    body: '発達の特性があるお子さんに感情を連動させながら、あなたはずっと一緒に揺れてきたのね。その深い共感は愛情の証だけど、あなたの感情は少し独立していてもいいのよ。あなたが安定していることで、お子さんも安心できるのよ。今日は「あなた自身のペース」を大切にしてほしいのよ。',
    adviceA: '今日、お子さんと「別々の時間」を意識的に作ってみてね',
    adviceB: 'あなた自身が楽しめることを一つ、今週やってみてね',
    adviceC: '発達特性の支援機関に、あなた自身のサポートも求めてみてね',
  },
  {
    resultId: 'R26', parentType: 'P4', childType: 'C2',
    title: 'お子さんが休むとき、あなたも休んでいいのよ',
    body: '刺激に敏感なお子さんの疲れを、あなたはまるで自分のことのように受け取ってきたのね。お子さんがぐったりしていると、あなたも消耗してしまうのよ。でも、お子さんが休むときにあなたも休んでいいのよ。二人で一緒に充電することが、一番の回復法かもしれないのよ。',
    adviceA: 'お子さんが休む時間に、あなたも一緒に横になってみてね',
    adviceB: '「休むこと」を今日の目標にしてみてね',
    adviceC: '感覚過敏と親のメンタルヘルスについて調べてみてね',
  },
  {
    resultId: 'R27', parentType: 'P4', childType: 'C3',
    title: 'お子さんの痛みと、あなたの痛みは別々に大切にしてね',
    body: 'ある出来事で傷ついたお子さんの痛みを、あなたはまるで自分の痛みのように受け取ってきたのね。その深い共感はすばらしいけれど、二人の痛みを混ぜてしまうと、どちらも回復しにくくなってしまうのよ。お子さんの痛みはお子さんのもの。あなたの痛みはあなたのもの。両方を別々に大切にしていいのよ。',
    adviceA: 'あなた自身のための心理相談（カウンセリング等）を検討してみてね',
    adviceB: 'お子さんの支援機関に、あなたの感情的な疲れも話してみてね',
    adviceC: '今日、「これは私の感情だ」と意識してみてね',
  },
  {
    resultId: 'R28', parentType: 'P4', childType: 'C4',
    title: '得意なことを、一緒に喜んでいいのよ',
    body: '特定のことに深く集中するお子さんに、感情を合わせてきたのね。お子さんが輝く瞬間を一緒に喜べているのは素晴らしいことよ。でも、あなた自身の喜びも同じくらい大切にしてほしいのよ。お子さんの好きをサポートしながら、あなた自身の「好き」も大切にしてみてね。',
    adviceA: 'お子さんの好きなことに、今日一緒に楽しんでみてね',
    adviceB: 'あなた自身の「好き」に使う時間を今週30分確保してみてね',
    adviceC: 'お子さんと「それぞれの好きなこと」を話し合ってみてね',
  },
  {
    resultId: 'R29', parentType: 'P4', childType: 'C5',
    title: '待つあなた自身も、エネルギーを使っているのよ',
    body: '我慢しながら待っているお子さんに感情を連動させ、あなたも一緒に待ち続けてきたのね。でも、「待つ」ことはエネルギーを消耗するのよ。お子さんが動き出すのを待ちながら、あなた自身もエネルギーを補充する必要があるのよ。待つことと、自分を回復させることを同時にやってみてね。',
    adviceA: '待っている間に、あなた自身が楽しめることを一つ見つけてみてね',
    adviceB: '「待っていること」をお子さんに言葉で伝えてみてね',
    adviceC: '今日、あなた自身のために一つ「好きなこと」をしてみてね',
  },
  {
    resultId: 'R30', parentType: 'P4', childType: 'C6',
    title: 'お子さんが傷つくとき、あなたも傷ついているのよ',
    body: '対人関係で傷つくお子さんに、あなたも同じくらい傷ついているのね。その深い共感は愛情の証だけど、あなた自身も回復が必要よ。お子さんの傷に寄り添いながら、あなた自身の傷も大切にしていいのよ。二人が別々に、でも一緒に回復していけるといいのよ。',
    adviceA: 'お子さんの話を聞いた後、自分のために5分だけ深呼吸してみてね',
    adviceB: 'あなたの気持ちを話せる相談窓口を一つ確認してみてね',
    adviceC: 'スクールカウンセラーにお子さんの状況を伝えてみてね',
  },
  {
    resultId: 'R31', parentType: 'P4', childType: 'C7',
    title: '家の空気は、あなたの安心からも作られるのよ',
    body: '家庭の空気に敏感なお子さんに感情を合わせながら、あなたは家全体を支えてきたのね。でも、家の空気はあなたの状態にも大きく影響されるのよ。あなたが安心していると、お子さんも安心できる。まず、あなた自身が安心できる環境を作ることが最優先よ。',
    adviceA: '今日、あなたが「ほっとできること」を一つしてみてね',
    adviceB: '家族間の話し合いができそうなら、感情を共有してみてね',
    adviceC: '家庭支援を行う機関に、あなたの状況を話してみてね',
  },
  {
    resultId: 'R32', parentType: 'P4', childType: 'C8',
    title: 'お子さんの選択を、あなたの価値で測らなくていいのよ',
    body: '自分のペースで合理的に選べるお子さんに、あなたの感情が強く連動してきたのね。お子さんが選んだことに「よかった」「心配」と揺れてきたかもしれないけれど、お子さんは自分で選べているのよ。その選択を信頼することが、あなたにとっても楽になることよ。二人それぞれの感情を尊重してみてね。',
    adviceA: 'お子さんの選択に対して「信じているよ」と伝えてみてね',
    adviceB: 'あなた自身の感情に気づく練習を、今日から始めてみてね',
    adviceC: '「これはお子さんの選択」と意識してみてね',
  },

  // ── P5（荷物を抱え込みすぎる系）──────────────────────
  {
    resultId: 'R33', parentType: 'P5', childType: 'C1',
    title: '一人で抱えなくていいのよ',
    body: '発達特性のあるお子さんのことを、あなたは誰にも頼らず抱えてきたのね。でも、それは本当に重かったはずよ。人に頼ることは弱さじゃないのよ。専門家や支援機関は、あなたの荷物を一緒に持ってくれるために存在しているのよ。今日こそ、荷物を少し降ろしてみてね。',
    adviceA: '発達支援センターや相談機関に、一度連絡してみてね',
    adviceB: '「助けを求める」を今日の目標にしてみてね',
    adviceC: '信頼できる一人に「実は大変なの」と話してみてね',
  },
  {
    resultId: 'R34', parentType: 'P5', childType: 'C2',
    title: '感じ取っているあなたが、疲れるのは当然よ',
    body: '感覚過敏のあるお子さんの微妙な変化を読み取りながら、誰にも頼らず抱えてきたのね。あなたが感じ取ることができるからこそ、疲れるのは当然のことよ。その疲れは本物よ。誰かに「疲れた」と言えると、少し楽になれるのよ。今日、一人だけに話してみてね。',
    adviceA: '今日、誰かに「少し疲れてる」と伝えてみてね',
    adviceB: '感覚過敏のある子を持つ保護者向けの相談窓口を調べてみてね',
    adviceC: 'あなたが「疲れていない顔」をする必要がない場所を一つ作ってみてね',
  },
  {
    resultId: 'R35', parentType: 'P5', childType: 'C3',
    title: 'あなたの心も、ケアが必要なのよ',
    body: 'ある出来事で変化したお子さんを、あなたは誰にも頼らず抱えてきたのね。でも、そのプロセスであなた自身も深く傷ついているはずよ。お子さんのケアと同時に、あなた自身のケアも必要なのよ。あなたが回復することで、お子さんへのサポートも続けられるのよ。今日こそ、自分のことを優先していいのよ。',
    adviceA: 'あなた自身のために心理相談（カウンセリング）を一度受けてみてね',
    adviceB: 'お子さんの支援機関に、あなたの状況も伝えてみてね',
    adviceC: '「助けを求めること」は、お子さんのためにもなることを覚えていてね',
  },
  {
    resultId: 'R36', parentType: 'P5', childType: 'C4',
    title: 'お子さんの世界を一人で支えなくていいのよ',
    body: '特定のことに深く集中するお子さんを、あなたは一人で理解しようとしてきたのね。でも、その独特の世界は一人で支えなくていいのよ。同じ経験を持つ保護者や専門家と繋がることで、あなたの荷物は確実に軽くなるのよ。今日、その一歩を踏み出してみてね。',
    adviceA: '同じ状況の保護者グループ（オンライン可）を一つ探してみてね',
    adviceB: 'お子さんの得意分野の専門コミュニティを調べてみてね',
    adviceC: '「一人でやらなくていい」と今日だけ意識してみてね',
  },
  {
    resultId: 'R37', parentType: 'P5', childType: 'C5',
    title: '待てるのはいいことだけど、あなたも限界があるのよ',
    body: '我慢しながらタイミングを待つお子さんを、あなたも誰にも頼らず待ち続けてきたのね。でも、あなたの忍耐にも限界はあるのよ。一人で待ち続けることで、あなたが先に限界を迎えてしまうかもしれないのよ。今日、誰かに「一緒に待ってほしい」と頼んでみてね。',
    adviceA: '今日、信頼できる誰かに状況を話してみてね',
    adviceB: '支援機関に「経過を見守ってほしい」と相談してみてね',
    adviceC: '一人で抱えることに疲れを感じたら、それがSOSのサインよ',
  },
  {
    resultId: 'R38', parentType: 'P5', childType: 'C6',
    title: '人間関係の荷物を、全部一人で持たなくていいのよ',
    body: '対人関係でストレスを抱えるお子さんのことを、あなたは全部一人で引き受けてきたのね。でも、その荷物は重すぎるのよ。人に頼ることに罪悪感を感じているのかもしれないけれど、あなたが頼ることでお子さんのためにできることが増えるのよ。今日、荷物を一つ誰かに渡してみてね。',
    adviceA: 'スクールカウンセラーや支援機関に、状況を共有してみてね',
    adviceB: '「この件はお任せしてもいいですか」と誰かに言ってみてね',
    adviceC: '自分が「全部やらなくていい」と認識する練習を始めてみてね',
  },
  {
    resultId: 'R39', parentType: 'P5', childType: 'C7',
    title: '家庭の問題を一人で解決しようとしなくていいのよ',
    body: '家庭の空気に敏感なお子さんのために、あなたは家庭のすべてを一人で解決しようとしてきたのね。でも、家庭の問題は一人で抱えるものじゃないのよ。外部の支援を求めることは、家族の弱さじゃないのよ。むしろ、勇気ある一歩なのよ。今日こそ、その一歩を踏み出してほしいのよ。',
    adviceA: '家庭支援を行う機関（家庭相談員等）に連絡してみてね',
    adviceB: '「一人で抱えすぎている」と誰かに打ち明けてみてね',
    adviceC: '家庭内で誰かに役割を一つ分担してみてね',
  },
  {
    resultId: 'R40', parentType: 'P5', childType: 'C8',
    title: 'お子さんが自分で選べるなら、あなたも人に頼っていいのよ',
    body: '自分のペースで合理的に選択できるお子さんを、あなたは人に頼らずサポートしてきたのね。お子さんが自立した選択ができているということは、あなたのサポートが実を結んでいる証よ。今度はあなたが、人に頼る練習をする番よ。お子さんが選べるように、あなたも頼れるようになっていいのよ。',
    adviceA: '今月、一つだけ「誰かに頼むこと」を決めてみてね',
    adviceB: 'あなたを支えてくれる人・機関を一つリストアップしてみてね',
    adviceC: 'お子さんの自立を喜びながら、あなた自身も自由になる練習を始めてみてね',
  },

  // ── P6（ちゃんと疲れモード系・最優先ケア）────────────
  {
    resultId: 'R41', parentType: 'P6', childType: 'C1',
    title: 'まず、あなたが休むことが一番大切よ',
    body: '発達特性のあるお子さんのことを、疲れを感じながらも感じないふりをして支えてきたのね。でも今、あなたは本当に休息が必要な状態よ。あなたが休むことは、お子さんのためにもなるのよ。休むことへの罪悪感を、今日だけ手放してほしいのよ。あなたの疲れは本物で、休む資格は十分すぎるほどあるのよ。',
    adviceA: '今日、最低でも30分は横になる時間を作ってね（義務は全部後回しでいいのよ）',
    adviceB: 'お子さんの支援機関に「今、自分も限界に近い」と正直に話してみてね',
    adviceC: 'かかりつけ医や保健センターに、あなた自身の状態を相談してみてね',
  },
  {
    resultId: 'R42', parentType: 'P6', childType: 'C2',
    title: '疲れを感じにくくなっているのは、頑張りすぎたサインよ',
    body: '感覚過敏のあるお子さんのそばで、あなた自身も感覚が麻痺するくらい頑張ってきたのね。「休みたい」と思っても休んだ気がしない状態は、心と体の限界のサインよ。今すぐ、あなた自身のケアを最優先にしてほしいのよ。お子さんも、あなたが元気でいることを望んでいるはずよ。',
    adviceA: '今日、医療機関や保健センターに連絡してみてね',
    adviceB: '感覚過敏の子を持つ保護者向けの支援グループに参加してみてね',
    adviceC: '今夜は、できることだけをして早く寝てね',
  },
  {
    resultId: 'R43', parentType: 'P6', childType: 'C3',
    title: 'あなた自身が、今一番のサポートが必要な状態よ',
    body: 'ある出来事で変化したお子さんを支えながら、あなた自身も限界まで頑張ってきたのね。休んでも休息感がない状態は、深刻なサインよ。今すぐ、専門家の力を借りてほしいのよ。あなたが倒れてしまったら、お子さんのためにもならないの。今日こそ、助けを求める一歩を踏み出してね。',
    adviceA: '今日、かかりつけ医か精神科・心療内科に連絡してみてね',
    adviceB: 'よりそいホットライン（0120-279-338）に電話してみてね',
    adviceC: 'お子さんの支援を誰かに一時的に代わってもらえるよう相談してみてね',
  },
  {
    resultId: 'R44', parentType: 'P6', childType: 'C4',
    title: 'お子さんの世界を、今は遠くから見守るだけでいいのよ',
    body: '特定のことに集中するお子さんを支えながら、あなた自身の疲れは限界に近いのね。今のあなたに必要なのは、全力でサポートすることじゃなくて、まず休むことよ。お子さんの得意な世界は、あなたが少し距離を置いても消えないのよ。今日はただ、そこにいるだけでいいのよ。',
    adviceA: '今日は「支援をしない日」にしてみてね',
    adviceB: 'あなたの休養を最優先にする理由を、誰かに話してみてね',
    adviceC: 'かかりつけ医や相談機関に、あなた自身の状態を相談してみてね',
  },
  {
    resultId: 'R45', parentType: 'P6', childType: 'C5',
    title: '動けない今は、充電期間だと思ってほしいのよ',
    body: '我慢しながら待つお子さんを支えながら、あなた自身も限界まで頑張ってきたのね。今のあなたの「動けない感覚」は、体と心が充電を求めているサインよ。焦らなくていいのよ。動けない今は、エネルギーを蓄える時間よ。まず休んで、それからまた一緒に歩み出せばいいのよ。',
    adviceA: '今日、何もしない時間を1時間作ってみてね',
    adviceB: '「今は充電中」と自分に言い聞かせてみてね',
    adviceC: '医療機関や保健センターに、あなたの状態を相談してみてね',
  },
  {
    resultId: 'R46', parentType: 'P6', childType: 'C6',
    title: '対人関係のストレスから、まずあなたが離れていいのよ',
    body: '対人関係でストレスを抱えるお子さんを支えながら、あなた自身も対人ストレスと疲弊を限界まで抱えてきたのね。今のあなたに必要なのは、人間関係のストレスから距離を置くことよ。お子さんのためと言い続けてきたけれど、今は「あなたのため」に休む時よ。あなたが回復することが、お子さんへの最大のサポートになるのよ。',
    adviceA: '今日は不必要な連絡や対人関係から離れていいのよ',
    adviceB: 'かかりつけ医や心療内科に、今の状態を話してみてね',
    adviceC: 'よりそいホットライン（0120-279-338）に電話してみてね',
  },
  {
    resultId: 'R47', parentType: 'P6', childType: 'C7',
    title: '家庭の空気を変えるのは、あなたが休んでからでいいのよ',
    body: '家庭の空気に敏感なお子さんのために、あなたは疲れ果てながらも家を守ってきたのね。でも今のあなたは、休まないと倒れてしまう状態よ。家庭を良くしようとすることより、まずあなた自身が回復することが最優先なのよ。家のことは後回しでいい。今日は休んでね。',
    adviceA: '今日、家事を最低限にして早く休んでね',
    adviceB: '家族の誰か、または支援機関に「助けてほしい」と連絡してみてね',
    adviceC: 'かかりつけ医や保健センターに、あなたの疲弊を相談してみてね',
  },
  {
    resultId: 'R48', parentType: 'P6', childType: 'C8',
    title: 'お子さんが自分を守れているなら、今はあなたが自分を守る番よ',
    body: '自分のペースで合理的に選択できるお子さんを、疲れ果てながらも支えてきたのね。お子さんがしっかり自分を守れているということは、あなたのサポートが十分に届いた証よ。今度はあなたが自分を守る番よ。お子さんが自立できているなら、あなたは今すぐ休んでいいのよ。',
    adviceA: '今日、あなた自身の回復を最優先にしてね',
    adviceB: 'お子さんに「今日は休む」と正直に伝えてみてね',
    adviceC: '医療機関や保健センターに、あなた自身の状態を相談してみてね',
  },
]
```

- [ ] **Step 2: コミットする**

```bash
git add data/results.ts
git commit -m "feat: add diagnosis results data (R01-R48 dummy content)"
```

---

## Task 6: TDD — スコアリングロジック

**Files:**
- Create: `lib/scoring.test.ts`
- Create: `lib/scoring.ts`

- [ ] **Step 1: lib/scoring.test.ts を作成する**

```typescript
// lib/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { determineParentType, determineChildType, getResultId } from './scoring'
import type { ParentAnswer, ChildType } from './types'

const allNever: Record<string, ParentAnswer> = {
  Q1: 'まったくない', Q2: 'まったくない',
  Q3: 'まったくない', Q4: 'まったくない',
  Q5: 'まったくない', Q6: 'まったくない',
  Q7: 'まったくない', Q8: 'まったくない',
  Q9: 'まったくない', Q10: 'まったくない',
  Q11: 'まったくない', Q12: 'まったくない',
}

const emptyChecks: Record<ChildType, string[]> = {
  C1: [], C2: [], C3: [], C4: [], C5: [], C6: [], C7: [], C8: [],
}

describe('determineParentType', () => {
  it('P1 が最高スコアのとき P1 を返す', () => {
    const answers: Record<string, ParentAnswer> = {
      ...allNever,
      Q1: 'よくある',
      Q2: 'よくある',
    }
    expect(determineParentType(answers)).toBe('P1')
  })

  it('P6 が最高スコアのとき P6 を返す', () => {
    const answers: Record<string, ParentAnswer> = {
      ...allNever,
      Q11: 'よくある',
      Q12: 'よくある',
    }
    expect(determineParentType(answers)).toBe('P6')
  })

  it('全員同点のとき優先度最上位の P6 を返す', () => {
    const answers: Record<string, ParentAnswer> = {
      Q1: 'ときどきある', Q2: 'ときどきある',
      Q3: 'ときどきある', Q4: 'ときどきある',
      Q5: 'ときどきある', Q6: 'ときどきある',
      Q7: 'ときどきある', Q8: 'ときどきある',
      Q9: 'ときどきある', Q10: 'ときどきある',
      Q11: 'ときどきある', Q12: 'ときどきある',
    }
    expect(determineParentType(answers)).toBe('P6')
  })

  it('スコアなしのとき優先度最上位の P6 を返す', () => {
    expect(determineParentType(allNever)).toBe('P6')
  })
})

describe('determineChildType', () => {
  it('C1 が 3 つ以上チェックされていれば C1 候補になる', () => {
    const checks: Record<ChildType, string[]> = {
      ...emptyChecks,
      C1: ['C1-1', 'C1-2', 'C1-3'],
    }
    expect(determineChildType(checks)).toBe('C1')
  })

  it('C3 と C1 が同チェック数のとき C3 優先', () => {
    const checks: Record<ChildType, string[]> = {
      ...emptyChecks,
      C1: ['C1-1', 'C1-2', 'C1-3'],
      C3: ['C3-1', 'C3-2', 'C3-3'],
    }
    expect(determineChildType(checks)).toBe('C3')
  })

  it('全タイプ 2 チェック以下のとき最多チェックのタイプを優先度順で返す', () => {
    const checks: Record<ChildType, string[]> = {
      ...emptyChecks,
      C8: ['C8-1', 'C8-2'],
      C4: ['C4-1', 'C4-2'],
    }
    // C4 と C8 が同数 2、優先度は C4 > C8
    expect(determineChildType(checks)).toBe('C4')
  })
})

describe('getResultId', () => {
  it('P1+C1 → R01', () => {
    expect(getResultId('P1', 'C1')).toBe('R01')
  })
  it('P1+C8 → R08', () => {
    expect(getResultId('P1', 'C8')).toBe('R08')
  })
  it('P6+C8 → R48', () => {
    expect(getResultId('P6', 'C8')).toBe('R48')
  })
  it('P3+C5 → R21', () => {
    expect(getResultId('P3', 'C5')).toBe('R21')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
pnpm test
```

Expected: `Cannot find module './scoring'` というエラーで FAIL

- [ ] **Step 3: lib/scoring.ts を作成する**

```typescript
// lib/scoring.ts
import type { ParentType, ChildType, ParentAnswer } from './types'
import { parentQuestions } from '@/data/parent-questions'

const PARENT_ANSWER_SCORES: Record<ParentAnswer, number> = {
  'まったくない': 0,
  'あまりない': 1,
  'ときどきある': 2,
  'よくある': 3,
}

const PARENT_PRIORITY: ParentType[] = ['P6', 'P5', 'P3', 'P1', 'P2', 'P4']
const CHILD_PRIORITY: ChildType[] = ['C3', 'C1', 'C7', 'C2', 'C5', 'C6', 'C4', 'C8']

export function determineParentType(answers: Record<string, ParentAnswer>): ParentType {
  const scores: Record<ParentType, number> = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0 }

  for (const [questionId, answer] of Object.entries(answers)) {
    const question = parentQuestions.find((q) => q.id === questionId)
    if (question) {
      scores[question.type] += PARENT_ANSWER_SCORES[answer]
    }
  }

  const maxScore = Math.max(...Object.values(scores))
  return PARENT_PRIORITY.find((p) => scores[p] === maxScore) ?? 'P6'
}

export function determineChildType(checks: Record<ChildType, string[]>): ChildType {
  const counts = {} as Record<ChildType, number>
  for (const [type, selected] of Object.entries(checks) as [ChildType, string[]][]) {
    counts[type] = selected.length
  }

  const candidates = (Object.entries(counts) as [ChildType, number][]).filter(
    ([, count]) => count >= 3,
  )

  const pool =
    candidates.length > 0 ? candidates : (Object.entries(counts) as [ChildType, number][])
  const maxCount = Math.max(...pool.map(([, count]) => count))

  return CHILD_PRIORITY.find((c) => counts[c] === maxCount) ?? 'C8'
}

export function getResultId(parentType: ParentType, childType: ChildType): string {
  const parentNum = parseInt(parentType.replace('P', ''), 10)
  const childNum = parseInt(childType.replace('C', ''), 10)
  const index = (parentNum - 1) * 8 + childNum
  return `R${index.toString().padStart(2, '0')}`
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
pnpm test
```

Expected: `Test Files 1 passed` と表示され全テスト PASS

- [ ] **Step 5: コミットする**

```bash
git add lib/scoring.ts lib/scoring.test.ts
git commit -m "feat: implement scoring logic with tests (TDD)"
```

---

## Task 7: レイアウト・認証・ミドルウェア

**Files:**
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Modify: `middleware.ts`
- Create: `app/page.tsx`
- Create: `app/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: app/globals.css を作成する**

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

:root {
  --ecamo-primary: #FF8C69;
  --ecamo-bg: #FFF8F0;
  --ecamo-text: #3D2B1F;
  --ecamo-card: #FFFFFF;
  --ecamo-border: #FFD5C2;
}

body {
  background-color: var(--ecamo-bg);
  color: var(--ecamo-text);
  font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', sans-serif;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeInUp 0.3s ease-out both;
}
```

- [ ] **Step 2: app/layout.tsx を作成する**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { jaJP } from '@clerk/localizations'
import './globals.css'

export const metadata: Metadata = {
  title: 'e:camo（イーカモ）',
  description: '今の親子の状態をやさしく整理するための心理診断チャットアプリ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={jaJP}>
      <html lang="ja">
        <body suppressHydrationWarning>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 3: middleware.ts を作成する（/chat を保護）**

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

- [ ] **Step 4: app/page.tsx を作成する（/chat へリダイレクト）**

```typescript
// app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/chat')
}
```

- [ ] **Step 5: app/sign-in/[[...sign-in]]/page.tsx を作成する**

```typescript
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--ecamo-bg)' }}>
      <SignIn />
    </div>
  )
}
```

- [ ] **Step 6: app/sign-up/[[...sign-up]]/page.tsx を作成する**

```typescript
// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--ecamo-bg)' }}>
      <SignUp />
    </div>
  )
}
```

- [ ] **Step 7: コミットする**

```bash
git add app/globals.css app/layout.tsx middleware.ts app/page.tsx \
  app/sign-in app/sign-up
git commit -m "feat: add layout, auth pages, and Clerk middleware for e:camo"
```

---

## Task 8: ChatBubble コンポーネント

**Files:**
- Create: `components/chat/ChatBubble.tsx`

- [ ] **Step 1: components/chat/ChatBubble.tsx を作成する**

```typescript
// components/chat/ChatBubble.tsx
type ChatBubbleProps = {
  sender: 'bot' | 'user'
  children: React.ReactNode
  delay?: number
}

export default function ChatBubble({ sender, children, delay = 0 }: ChatBubbleProps) {
  const style = delay > 0 ? { animationDelay: `${delay}ms` } : {}

  if (sender === 'bot') {
    return (
      <div className="flex items-start gap-2 mb-3 animate-fade-in" style={style}>
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm"
          style={{ backgroundColor: 'var(--ecamo-primary)' }}
          aria-label="いいかもさん"
        >
          🦆
        </div>
        <div
          className="rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] text-sm leading-relaxed shadow-sm"
          style={{ backgroundColor: 'var(--ecamo-card)', color: 'var(--ecamo-text)' }}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end mb-3 animate-fade-in" style={style}>
      <div
        className="rounded-2xl rounded-tr-none px-4 py-3 max-w-[80%] text-sm leading-relaxed shadow-sm text-white"
        style={{ backgroundColor: 'var(--ecamo-primary)' }}
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add components/chat/ChatBubble.tsx
git commit -m "feat: add ChatBubble component"
```

---

## Task 9: ChoiceButtons コンポーネント

**Files:**
- Create: `components/chat/ChoiceButtons.tsx`

- [ ] **Step 1: components/chat/ChoiceButtons.tsx を作成する**

```typescript
// components/chat/ChoiceButtons.tsx
'use client'

type Option = { id: string; label: string }

type SingleProps = {
  type: 'single'
  options: Option[]
  onSelect: (id: string, label: string) => void
}

type MultipleProps = {
  type: 'multiple'
  options: Option[]
  selected: string[]
  onToggle: (id: string) => void
  onConfirm: () => void
}

type ChoiceButtonsProps = SingleProps | MultipleProps

export default function ChoiceButtons(props: ChoiceButtonsProps) {
  if (props.type === 'single') {
    return (
      <div className="flex flex-col gap-2 mt-2 animate-fade-in">
        {props.options.map((option) => (
          <button
            key={option.id}
            onClick={() => props.onSelect(option.id, option.label)}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{
              border: '2px solid var(--ecamo-primary)',
              color: 'var(--ecamo-text)',
              backgroundColor: 'var(--ecamo-card)',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--ecamo-primary)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--ecamo-card)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ecamo-text)'
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 mt-2 animate-fade-in">
      {props.options.map((option) => {
        const isSelected = props.selected.includes(option.id)
        return (
          <button
            key={option.id}
            onClick={() => props.onToggle(option.id)}
            className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all active:scale-95 flex items-center gap-3"
            style={{
              border: '2px solid var(--ecamo-primary)',
              backgroundColor: isSelected ? 'var(--ecamo-primary)' : 'var(--ecamo-card)',
              color: isSelected ? '#fff' : 'var(--ecamo-text)',
            }}
          >
            <span className="text-base flex-shrink-0">{isSelected ? '☑' : '☐'}</span>
            {option.label}
          </button>
        )
      })}
      <button
        onClick={props.onConfirm}
        className="mt-1 w-full px-4 py-3 rounded-xl text-white text-sm font-bold transition-all active:scale-95"
        style={{ backgroundColor: 'var(--ecamo-text)' }}
      >
        次へ →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add components/chat/ChoiceButtons.tsx
git commit -m "feat: add ChoiceButtons component (single and multiple)"
```

---

## Task 10: ChatFlow ステートマシン

**Files:**
- Create: `components/chat/ChatFlow.tsx`

- [ ] **Step 1: components/chat/ChatFlow.tsx を作成する**

```typescript
// components/chat/ChatFlow.tsx
'use client'

import { useReducer, useRef, useEffect } from 'react'
import ChatBubble from './ChatBubble'
import ChoiceButtons from './ChoiceButtons'
import { parentQuestions } from '@/data/parent-questions'
import { childQuestions } from '@/data/child-questions'
import { results } from '@/data/results'
import { determineParentType, determineChildType, getResultId } from '@/lib/scoring'
import type { QuizState, ChatMessage, ParentAnswer, ChildType } from '@/lib/types'

const PARENT_ANSWER_OPTIONS = [
  { id: 'まったくない', label: 'まったくない' },
  { id: 'あまりない', label: 'あまりない' },
  { id: 'ときどきある', label: 'ときどきある' },
  { id: 'よくある', label: 'よくある' },
]

function initialChildChecks(): Record<ChildType, string[]> {
  return { C1: [], C2: [], C3: [], C4: [], C5: [], C6: [], C7: [], C8: [] }
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 'w1', sender: 'bot', text: 'こんにちは！いいかもよ🦆' },
  { id: 'w2', sender: 'bot', text: 'これから、いくつかの質問をするのよ' },
  { id: 'w3', sender: 'bot', text: 'これは診断や療養ではなく、今の親子の状態をやさしく整理するためのものよ' },
  { id: 'w4', sender: 'bot', text: '正解・不正解はないから、今の状況に寄り添うものを選んでほしいのよ' },
  { id: 'w5', sender: 'bot', text: '予想回答時間：約8分よ' },
]

const initialState: QuizState = {
  phase: 'welcome',
  messages: INITIAL_MESSAGES,
  parentQuestionIndex: 0,
  childQuestionIndex: 0,
  parentAnswers: {},
  childChecks: initialChildChecks(),
  currentChildSelections: [],
  resultId: null,
}

type Action =
  | { type: 'START_QUIZ' }
  | { type: 'CONFIRM_Q0' }
  | { type: 'ANSWER_PARENT'; questionId: string; answer: ParentAnswer }
  | { type: 'TOGGLE_CHILD'; choiceId: string }
  | { type: 'CONFIRM_CHILD' }
  | { type: 'RESTART' }

function msg(id: string, sender: 'bot' | 'user', text: string): ChatMessage {
  return { id, sender, text }
}

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case 'START_QUIZ': {
      return {
        ...state,
        phase: 'q0_opening',
        messages: [
          ...state.messages,
          msg('user-start', 'user', 'はじめる'),
          msg('q0-bot', 'bot', 'これからする質問は「親であるあなた自身について」と「お子さんの今の状況について」の2つよ'),
        ],
      }
    }

    case 'CONFIRM_Q0': {
      const firstQ = parentQuestions[0]
      return {
        ...state,
        phase: 'parent_questions',
        parentQuestionIndex: 0,
        messages: [
          ...state.messages,
          msg('user-q0', 'user', '了解しました'),
          msg('parent-intro', 'bot', 'まずは「親であるあなた自身のこと」について教えてほしいのよ'),
          msg(`bot-${firstQ.id}`, 'bot', firstQ.text),
        ],
      }
    }

    case 'ANSWER_PARENT': {
      const newAnswers = { ...state.parentAnswers, [action.questionId]: action.answer }
      const nextIndex = state.parentQuestionIndex + 1
      const userMsg = msg(`user-${action.questionId}`, 'user', action.answer)

      if (nextIndex >= parentQuestions.length) {
        const firstChild = childQuestions[0]
        return {
          ...state,
          parentAnswers: newAnswers,
          childQuestionIndex: 0,
          phase: 'child_questions',
          currentChildSelections: [],
          messages: [
            ...state.messages,
            userMsg,
            msg('child-intro', 'bot', '次に「お子さんの今の状況」についてきくすごいの'),
            msg('child-q0-title', 'bot', `【${firstChild.title}】${firstChild.questionText}`),
          ],
        }
      }

      const nextQ = parentQuestions[nextIndex]
      return {
        ...state,
        parentAnswers: newAnswers,
        parentQuestionIndex: nextIndex,
        messages: [
          ...state.messages,
          userMsg,
          msg(`bot-${nextQ.id}`, 'bot', nextQ.text),
        ],
      }
    }

    case 'TOGGLE_CHILD': {
      const isSelected = state.currentChildSelections.includes(action.choiceId)
      return {
        ...state,
        currentChildSelections: isSelected
          ? state.currentChildSelections.filter((id) => id !== action.choiceId)
          : [...state.currentChildSelections, action.choiceId],
      }
    }

    case 'CONFIRM_CHILD': {
      const currentChildQ = childQuestions[state.childQuestionIndex]
      const currentType = currentChildQ.id
      const newChecks = {
        ...state.childChecks,
        [currentType]: state.currentChildSelections,
      }

      const selectedLabels = currentChildQ.choices
        .filter((c) => state.currentChildSelections.includes(c.id))
        .map((c) => c.label)
      const userText = selectedLabels.length > 0 ? selectedLabels.join('、') : '（選択なし）'
      const userMsg = msg(`user-child-${currentType}`, 'user', userText)

      const nextIndex = state.childQuestionIndex + 1

      if (nextIndex >= childQuestions.length) {
        const parentType = determineParentType(state.parentAnswers)
        const childType = determineChildType(newChecks)
        const resultId = getResultId(parentType, childType)
        return {
          ...state,
          childChecks: newChecks,
          resultId,
          phase: 'result',
          currentChildSelections: [],
          messages: [
            ...state.messages,
            userMsg,
            msg('result-loading', 'bot', '回答してくれてありがとうよ🦆 今の状態を読み解くわね...'),
          ],
        }
      }

      const nextChild = childQuestions[nextIndex]
      return {
        ...state,
        childChecks: newChecks,
        childQuestionIndex: nextIndex,
        currentChildSelections: [],
        messages: [
          ...state.messages,
          userMsg,
          msg(`child-q${nextIndex}-title`, 'bot', `【${nextChild.title}】${nextChild.questionText}`),
        ],
      }
    }

    case 'RESTART':
      return { ...initialState }

    default:
      return state
  }
}

export default function ChatFlow() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages.length])

  const currentChildQ = childQuestions[state.childQuestionIndex]
  const result = state.resultId ? results.find((r) => r.resultId === state.resultId) : null

  return (
    <div className="flex flex-col h-screen max-w-[480px] mx-auto">
      {/* ヘッダー */}
      <div
        className="flex-shrink-0 text-white text-center py-3 text-sm font-bold tracking-widest shadow-sm"
        style={{ backgroundColor: 'var(--ecamo-primary)' }}
      >
        e:camo
      </div>

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {state.messages.map((m) => (
          <ChatBubble key={m.id} sender={m.sender}>
            {m.text}
          </ChatBubble>
        ))}

        {/* 結果カード */}
        {state.phase === 'result' && result && (
          <div className="animate-fade-in mt-4 rounded-2xl p-5 shadow-md" style={{ backgroundColor: 'var(--ecamo-card)' }}>
            <div className="text-center mb-4">
              <p className="text-xs mb-1" style={{ color: 'var(--ecamo-primary)' }}>診断結果</p>
              <h2 className="text-lg font-bold" style={{ color: 'var(--ecamo-text)' }}>{result.title}</h2>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--ecamo-text)' }}>{result.body}</p>
            <div className="space-y-2 mb-4">
              {[result.adviceA, result.adviceB, result.adviceC].map((advice, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-bold flex-shrink-0" style={{ color: 'var(--ecamo-primary)' }}>•</span>
                  <span className="text-sm" style={{ color: 'var(--ecamo-text)' }}>{advice}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => dispatch({ type: 'RESTART' })}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ border: '2px solid var(--ecamo-primary)', color: 'var(--ecamo-primary)', backgroundColor: 'transparent' }}
            >
              もう一度試してみる
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 操作エリア */}
      <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: 'var(--ecamo-border)', backgroundColor: 'var(--ecamo-bg)' }}>
        {state.phase === 'welcome' && (
          <button
            onClick={() => dispatch({ type: 'START_QUIZ' })}
            className="w-full py-4 rounded-full text-white font-bold text-base shadow-md transition-all active:scale-95"
            style={{ backgroundColor: 'var(--ecamo-primary)' }}
          >
            はじめる
          </button>
        )}

        {state.phase === 'q0_opening' && (
          <ChoiceButtons
            type="single"
            options={[{ id: 'ok', label: '了解しました' }]}
            onSelect={() => dispatch({ type: 'CONFIRM_Q0' })}
          />
        )}

        {state.phase === 'parent_questions' && (
          <ChoiceButtons
            type="single"
            options={PARENT_ANSWER_OPTIONS}
            onSelect={(_, label) =>
              dispatch({
                type: 'ANSWER_PARENT',
                questionId: parentQuestions[state.parentQuestionIndex].id,
                answer: label as ParentAnswer,
              })
            }
          />
        )}

        {state.phase === 'child_questions' && currentChildQ && (
          <ChoiceButtons
            type="multiple"
            options={currentChildQ.choices}
            selected={state.currentChildSelections}
            onToggle={(id) => dispatch({ type: 'TOGGLE_CHILD', choiceId: id })}
            onConfirm={() => dispatch({ type: 'CONFIRM_CHILD' })}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミットする**

```bash
git add components/chat/ChatFlow.tsx
git commit -m "feat: implement ChatFlow state machine with useReducer"
```

---

## Task 11: チャットページ

**Files:**
- Create: `app/chat/page.tsx`

- [ ] **Step 1: app/chat/page.tsx を作成する**

```typescript
// app/chat/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import ChatFlow from '@/components/chat/ChatFlow'

export default async function ChatPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <ChatFlow />
}
```

- [ ] **Step 2: コミットする**

```bash
git add app/chat/page.tsx
git commit -m "feat: add chat page with Clerk auth guard"
```

---

## Task 12: 動作確認

- [ ] **Step 1: 開発サーバーを起動する**

```bash
pnpm dev
```

Expected: `http://localhost:3000` でサーバーが起動する

- [ ] **Step 2: ブラウザで動作確認する**

以下の順にテストする：

1. `http://localhost:3000` にアクセス → `/sign-in` にリダイレクトされることを確認
2. サインインまたはサインアップを完了
3. `/chat` に遷移してウェルカムメッセージ（5件）が表示されることを確認
4. 「はじめる」ボタンをタップ → Q0メッセージが追加されることを確認
5. 「了解しました」をタップ → 親Q1が表示されることを確認
6. 4択で回答を12問続ける → 子どもの質問セクションへ遷移することを確認
7. C1〜C8 を順番に複数選択・「次へ」で進む
8. 最後に結果カード（タイトル・本文・アドバイス3項目）が表示されることを確認
9. 「もう一度試してみる」で最初に戻ることを確認

- [ ] **Step 3: 最終コミットする**

```bash
git add -A
git commit -m "feat: complete e:camo chatbot MVP"
```
