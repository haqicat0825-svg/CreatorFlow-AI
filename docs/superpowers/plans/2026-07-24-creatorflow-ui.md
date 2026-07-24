# CreatorFlow AI UI Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, responsive, interactive five-page CreatorFlow AI prototype using local mock data only.

**Architecture:** Use Next.js App Router with one shared application shell, route-local client components for interaction, typed mock data, and small reusable business components. Visual assets are generated first from the approved art direction, then implemented with design tokens and verified against browser screenshots at 1440px and 390px.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library, Playwright

## Global Constraints

- Use a cream `#F8F5EF`, mist rose `#D8A7AF`, almond `#EADCCB`, berry `#3F3033`, and sage `#9EAC9D` design system.
- Use DM Serif Display for English display text, Noto Sans SC for Chinese/UI text, and Inter for utility data.
- Implement Dashboard, Library, Workflow, Creator, and Visual Studio routes with mock data only.
- Required reusable components: `AgentCard`, `ContentCard`, `WorkflowNode`, and `PromptCard`.
- Support visible hover, focus, selected, disabled, loading, empty, and success states where applicable.
- Respect `prefers-reduced-motion`.
- Validate desktop at 1440px and mobile at 390px with no horizontal overflow.
- Do not add authentication, databases, real AI calls, publishing integrations, or cloud persistence.

---

## File Structure

```text
app/
  globals.css                  design tokens, typography, motion, masonry
  layout.tsx                   fonts, metadata, shared app shell
  page.tsx                     Dashboard
  library/page.tsx             Content Intelligence Library
  workflow/page.tsx            Agent Workflow
  creator/page.tsx             Content Creator
  visual-studio/page.tsx       Visual Studio
components/
  app-shell.tsx                desktop sidebar and mobile navigation
  page-header.tsx              shared route heading/actions
  agent-card.tsx               agent identity and status
  content-card.tsx             library masonry item
  workflow-node.tsx            workflow state node
  prompt-card.tsx              visual prompt controls
  team-pulse.tsx               animated collaboration rail
  ui.tsx                       status pill, icon button, progress ring
data/
  mock.ts                      all seed content and image paths
lib/
  types.ts                     shared domain types
  workflow.ts                  pure workflow state transitions
public/images/
  creatorflow-*.webp           generated editorial assets
tests/
  setup.ts
  workflow.test.ts
  components.test.tsx
  routes.spec.ts
```

### Task 1: Scaffold the typed Next.js application shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `components/app-shell.tsx`
- Create: `components/page-header.tsx`
- Create: `components/ui.tsx`

**Interfaces:**
- Produces: `AppShell({ children }: PropsWithChildren)`, `PageHeader`, `StatusPill`, and shared CSS tokens used by every later task.

- [ ] **Step 1: Write the failing shell test**

```tsx
// tests/components.test.tsx
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";

it("renders all five product destinations", () => {
  render(<AppShell><main>Current page</main></AppShell>);
  ["首页", "内容资产", "Agent 流程", "内容创作", "视觉工作室"].forEach((label) => {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Install dependencies and confirm the test fails**

Run: `npm install && npm test -- --run`

Expected: FAIL because `@/components/app-shell` does not exist.

- [ ] **Step 3: Implement configuration and shell**

Create scripts `dev`, `build`, `lint`, `test`, and `test:e2e`. Configure the `@/*` alias, jsdom, Testing Library setup, and Tailwind PostCSS plugin. Implement `AppShell` with route-aware Lucide icons and these exact links: `/`, `/library`, `/workflow`, `/creator`, `/visual-studio`. Implement a 76px desktop rail and a five-item mobile bottom bar.

- [ ] **Step 4: Implement global tokens and typography**

Define CSS custom properties for every global color, `--radius-card: 28px`, warm low-contrast shadows, keyboard focus rings, reduced-motion overrides, and utility classes for panel, display title, and fine label. Load the three approved fonts through `next/font/google` in `app/layout.tsx`.

- [ ] **Step 5: Run verification**

Run: `npm test -- --run && npm run build`

Expected: all shell tests PASS and the production build completes without errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts tests app components
git commit -m "feat: scaffold CreatorFlow application shell"
```

### Task 2: Define domain types, mock data, and visual assets

**Files:**
- Create: `lib/types.ts`
- Create: `data/mock.ts`
- Create: `public/images/creatorflow-*.webp`
- Modify: `tests/components.test.tsx`

**Interfaces:**
- Produces: `Agent`, `AgentStatus`, `LibraryItem`, `WorkflowStep`, `Topic`, `Draft`, `CoverCandidate`.
- Produces arrays: `agents`, `libraryItems`, `workflowSteps`, `topics`, `coverCandidates`, `alternateCovers`.

- [ ] **Step 1: Generate and inspect visual concepts**

Use Image Gen to create the approved full Dashboard concept plus coordinated Library, Workflow, Creator, and Visual Studio concepts at a readable desktop size. Generate separable Korean fashion, café, still-life, and cover candidate assets. Inspect every output with `view_image`; reject assets with text artifacts, watermark-like marks, mismatched lighting, or black-tech styling.

- [ ] **Step 2: Write the type/data contract test**

```tsx
import { agents, libraryItems, topics, coverCandidates } from "@/data/mock";

it("provides complete prototype seed data", () => {
  expect(agents).toHaveLength(4);
  expect(libraryItems.length).toBeGreaterThanOrEqual(8);
  expect(topics).toHaveLength(10);
  expect(coverCandidates).toHaveLength(4);
});
```

- [ ] **Step 3: Confirm the contract test fails**

Run: `npm test -- --run tests/components.test.tsx`

Expected: FAIL because `@/data/mock` does not exist.

- [ ] **Step 4: Implement exact shared types**

```ts
export type AgentStatus = "working" | "ready" | "waiting";
export type WorkflowStatus = "completed" | "running" | "waiting";
export type Agent = { id: string; name: string; role: string; status: AgentStatus; detail?: string; icon: "search" | "sparkles" | "pen" | "shield" };
export type LibraryItem = { id: string; title: string; image: string; category: "爆款案例" | "我的风格" | "标题公式" | "视觉素材"; tags: string[]; score: number; saved: boolean; aspect: "portrait" | "square" | "tall" };
export type WorkflowStep = { id: string; name: string; subtitle: string; status: WorkflowStatus; output?: string; duration?: string };
export type Draft = { title: string; body: string; tags: string[]; cover: string };
export type Topic = { id: string; label: string; title: string; match: number; tags: string[]; draft: Draft };
export type CoverCandidate = { id: string; image: string; alt: string; composition: string };
```

- [ ] **Step 5: Add realistic mock content and generated images**

Populate the exact four agents, six workflow steps, ten distinct topics, at least eight library entries across all four categories, and two groups of four covers. Store optimized WebP assets under `public/images`.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- --run`

Expected: all tests PASS.

```bash
git add lib data public/images tests/components.test.tsx
git commit -m "feat: add CreatorFlow mock content and imagery"
```

### Task 3: Build Dashboard and reusable Agent components

**Files:**
- Create: `components/agent-card.tsx`
- Create: `components/team-pulse.tsx`
- Create: `app/page.tsx`
- Modify: `tests/components.test.tsx`

**Interfaces:**
- Consumes: `Agent`, `agents`, shared panel/status primitives.
- Produces: `AgentCard({ agent }: { agent: Agent })`, `TeamPulse`.

- [ ] **Step 1: Write failing AgentCard tests**

```tsx
import { AgentCard } from "@/components/agent-card";

it("communicates agent state with text", () => {
  render(<AgentCard agent={{ id: "research", name: "Research Agent", role: "内容研究专家", status: "working", detail: "发现热门趋势", icon: "search" }} />);
  expect(screen.getByText("Working")).toBeInTheDocument();
  expect(screen.getByText("发现热门趋势")).toBeInTheDocument();
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm test -- --run tests/components.test.tsx`

Expected: FAIL because `AgentCard` does not exist.

- [ ] **Step 3: Implement AgentCard and TeamPulse**

Map status to visible text and icon treatment. Use a pulse animation only for `working`, a soft ring for `ready`, and a static neutral dot for `waiting`. Keep card anatomy consistent while varying height and accent placement for the approved editorial asymmetry.

- [ ] **Step 4: Compose Dashboard**

Implement exact brand copy, today task card, editorial calendar, four-agent team section, progress information, and working “继续创作” link to `/creator`. Ensure Team Pulse is semantic decoration with `aria-hidden`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run && npm run build`

Expected: tests and build PASS.

```bash
git add app/page.tsx components/agent-card.tsx components/team-pulse.tsx tests/components.test.tsx
git commit -m "feat: build CreatorFlow dashboard"
```

### Task 4: Build the interactive Content Intelligence Library

**Files:**
- Create: `components/content-card.tsx`
- Create: `app/library/page.tsx`
- Modify: `tests/components.test.tsx`

**Interfaces:**
- Consumes: `LibraryItem`, `libraryItems`.
- Produces: `ContentCard({ item, saved, onToggleSave, onOpen })`.

- [ ] **Step 1: Write failing interaction test**

```tsx
it("filters library items by category", async () => {
  const user = userEvent.setup();
  render(<LibraryPage />);
  await user.click(screen.getByRole("button", { name: "我的风格" }));
  expect(screen.getAllByTestId("content-card").every((node) => node.dataset.category === "我的风格")).toBe(true);
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm test -- --run tests/components.test.tsx`

Expected: FAIL because the page and filter behavior do not exist.

- [ ] **Step 3: Implement ContentCard**

Use `next/image`, aspect variants, score ring, AI tags, accessible save button, hover lift, and a code-native detail action. Never place critical UI text inside images.

- [ ] **Step 4: Implement Library state**

Use client state for category, query, saved IDs, and selected item. Apply both category and case-insensitive title/tag search. Render CSS columns at wide sizes and one column on mobile. Implement a keyboard-dismissible right detail drawer with focusable close control.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run && npm run build`

Expected: filter, save, and drawer tests PASS.

```bash
git add app/library components/content-card.tsx tests/components.test.tsx
git commit -m "feat: add content intelligence library"
```

### Task 5: Build the animated Agent Workflow

**Files:**
- Create: `lib/workflow.ts`
- Create: `components/workflow-node.tsx`
- Create: `app/workflow/page.tsx`
- Create: `tests/workflow.test.ts`

**Interfaces:**
- Produces: `advanceWorkflow(steps: WorkflowStep[]): WorkflowStep[]`, `resetWorkflow(): WorkflowStep[]`.
- Produces: `WorkflowNode({ step, index }: { step: WorkflowStep; index: number })`.

- [ ] **Step 1: Write pure transition tests**

```ts
it("completes the running step and starts the next waiting step", () => {
  const next = advanceWorkflow([
    { id: "a", name: "A", subtitle: "", status: "running" },
    { id: "b", name: "B", subtitle: "", status: "waiting" },
  ]);
  expect(next.map((step) => step.status)).toEqual(["completed", "running"]);
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm test -- --run tests/workflow.test.ts`

Expected: FAIL because `advanceWorkflow` does not exist.

- [ ] **Step 3: Implement deterministic transitions**

`advanceWorkflow` must be immutable, preserve already completed steps, complete the current running step, and start the next waiting step. If no waiting step remains, return all completed. `resetWorkflow` returns a new copy of seed workflow data.

- [ ] **Step 4: Implement WorkflowNode and page**

Render the six exact nodes on the animated Team Pulse rail, plus execution log and summary. “运行模拟” starts a 1500ms interval, “暂停” clears it, and “重置” restores seed state. Clear timers on unmount. Use text and icons in addition to color.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run tests/workflow.test.ts && npm run build`

Expected: transition tests PASS and build succeeds.

```bash
git add lib/workflow.ts components/workflow-node.tsx app/workflow tests/workflow.test.ts
git commit -m "feat: add interactive agent workflow"
```

### Task 6: Build the three-panel Content Creator

**Files:**
- Create: `app/creator/page.tsx`
- Modify: `tests/components.test.tsx`

**Interfaces:**
- Consumes: `topics`, `Topic`, and `Draft`.
- Produces no cross-task interface; owns selected topic and editable draft state.

- [ ] **Step 1: Write failing selection test**

```tsx
it("updates the draft when a new topic is selected", async () => {
  const user = userEvent.setup();
  render(<CreatorPage />);
  await user.click(screen.getByRole("button", { name: /100元平价韩系复刻/ }));
  expect(screen.getByLabelText("标题")).toHaveValue(expect.stringContaining("平价"));
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm test -- --run tests/components.test.tsx`

Expected: FAIL because the Creator page does not exist.

- [ ] **Step 3: Implement desktop and mobile workspace**

Desktop uses 300px / minmax(0,1fr) / 320px. Render ten selectable topic buttons with match scores, editable title/body/tag controls, character count, and portrait cover preview. Mobile uses an accessible three-tab segmented control for 选题、文案、封面.

- [ ] **Step 4: Implement simulated actions**

“重新生成” shows a short local loading state and replaces the selected draft with its alternate copy. “保存草稿” shows a live-region success toast. Selection always copies draft data before editing so mock seeds remain immutable.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run && npm run build`

Expected: selection, editing, and save tests PASS.

```bash
git add app/creator tests/components.test.tsx
git commit -m "feat: build content creator workspace"
```

### Task 7: Build Visual Studio and PromptCard

**Files:**
- Create: `components/prompt-card.tsx`
- Create: `app/visual-studio/page.tsx`
- Modify: `tests/components.test.tsx`

**Interfaces:**
- Consumes: `CoverCandidate`, `coverCandidates`, `alternateCovers`.
- Produces: `PromptCard({ value, onChange, settings, onSettingsChange, onGenerate, generating })`.

- [ ] **Step 1: Write failing generation test**

```tsx
it("selects a cover and simulates a new generation", async () => {
  const user = userEvent.setup();
  render(<VisualStudioPage />);
  await user.click(screen.getByRole("button", { name: /候选封面 2/ }));
  expect(screen.getByRole("button", { name: /候选封面 2/ })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "生成 4 张" }));
  expect(screen.getAllByTestId("cover-skeleton")).toHaveLength(4);
});
```

- [ ] **Step 2: Confirm failure**

Run: `npm test -- --run tests/components.test.tsx`

Expected: FAIL because Visual Studio does not exist.

- [ ] **Step 3: Implement PromptCard**

Include exact theme “韩系秋季穿搭”, editable prompt, aspect ratio, tone and composition controls. Disable generation while loading and expose `aria-busy`.

- [ ] **Step 4: Implement candidate selection and simulation**

Render a responsive 2×2 grid with `next/image`. Use `aria-pressed` on candidate buttons, a rose selected border, larger selected preview, and “设为封面” success toast. Simulated generation displays four skeletons for 900ms then swaps to `alternateCovers`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run && npm run build`

Expected: selection and loading tests PASS.

```bash
git add components/prompt-card.tsx app/visual-studio tests/components.test.tsx
git commit -m "feat: build visual studio"
```

### Task 8: Browser QA, responsive repair, and final fidelity pass

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/routes.spec.ts`
- Modify: any UI file with a verified visual or interaction defect

**Interfaces:**
- Consumes the complete prototype.
- Produces repeatable route and overflow checks.

- [ ] **Step 1: Write route and overflow E2E checks**

```ts
for (const route of ["/", "/library", "/workflow", "/creator", "/visual-studio"]) {
  test(`${route} renders without horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
}
```

- [ ] **Step 2: Run full automated verification**

Run: `npm test -- --run && npm run build && npm run test:e2e`

Expected: unit tests, production build, and all five route checks PASS.

- [ ] **Step 3: Verify core workflows in Browser/IAB**

At 1440px, visit every route; filter and save a Library item, run/pause/reset Workflow, select and edit a Creator topic, generate and select a Visual Studio cover. Repeat navigation and core readability checks at 390px.

- [ ] **Step 4: Capture and inspect screenshots**

Capture each desktop route and at least Dashboard, Creator, and Visual Studio at 390px. Use `view_image` on the approved concept and latest browser screenshots. Compare copy, navigation, first-viewport balance, typography, palette, card anatomy, imagery, icon treatment, spacing, motion, selected states, and responsive collapse.

- [ ] **Step 5: Write and resolve the fidelity ledger**

Record at least five concrete comparisons. Fix every material mismatch, rerun the relevant automated check, and recapture the affected screenshot. Confirm the above-the-fold copy contains no unapproved additions.

- [ ] **Step 6: Final verification and commit**

Run: `npm test -- --run && npm run build && npm run test:e2e`

Expected: all checks PASS with no console errors or horizontal overflow.

```bash
git add app components data lib public tests playwright.config.ts
git commit -m "test: verify CreatorFlow responsive prototype"
```

## Post-Implementation AI Integration Map

The prototype stays mock-only. A later implementation replaces `data/mock.ts` through a typed service layer:

- `POST /api/research` → Research Agent trends and ten topic candidates
- `POST /api/style-memory` → RAG-backed personal style matches
- `POST /api/generate-content` → title, body, and tags
- `POST /api/review` → brand and quality review output
- `POST /api/generate-image` → generated prompt and cover assets

Use streamed job events or polling to map server progress to the existing `WorkflowStatus`; keep Human Review as a required publication gate.
