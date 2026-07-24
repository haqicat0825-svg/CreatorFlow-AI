# CreatorFlow AI Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Model Hub, Content Brief, enhanced Creator context, per-Agent model visibility, and Safety Guard while preserving the existing CreatorFlow visual system.

**Architecture:** Extend the current typed mock-data architecture with provider interfaces and a session-scoped `ContentTask`. Keep provider logic separate from React pages; routes consume typed mock adapters and deterministic seed data.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Testing Library

## Global Constraints

- Preserve the existing cream, mist rose, almond, berry, and sage design system.
- Do not remove or redesign existing routes.
- Use Mock Data only; do not read API keys, execute CLI commands, or send network requests.
- New routes: `/models` and `/create-task`.
- Validate at 1440px and 390px with no horizontal overflow.

---

### Task 1: Provider contracts, types, data, and navigation

**Files:**
- Modify: `lib/types.ts`
- Modify: `data/mock.ts`
- Create: `lib/providers/types.ts`
- Create: `lib/providers/mock.ts`
- Create: `lib/providers/index.ts`
- Modify: `components/app-shell.tsx`
- Test: `tests/providers.test.ts`

**Interfaces:**
- Produces `ModelConfig`, `ContentTask`, `TitleCandidate`, `SafetyReport`.
- Produces `TextModelAdapter.generate(task)` and `ImageModelAdapter.generatePrompt(task)`.

- [ ] Write a failing test proving Mock adapters return five title candidates and a 92-point Safety Report.
- [ ] Run `npm test -- --run tests/providers.test.ts`; expect failure because providers do not exist.
- [ ] Add exact types and deterministic adapters.
- [ ] Add Model Hub to desktop and horizontally scrollable mobile navigation.
- [ ] Run the provider test; expect PASS.

### Task 2: Model Hub

**Files:**
- Create: `components/model-config-card.tsx`
- Create: `app/models/page.tsx`
- Test: `tests/model-hub.test.tsx`

**Interfaces:**
- Consumes `ModelConfig` and mock model presets.
- Produces reusable `ModelConfigCard`.

- [ ] Write a failing test for mode switching and Connected status.
- [ ] Implement two editorial configuration cards with masked API keys, provider/mode controls, connection test, and save feedback.
- [ ] Verify tests and route build.

### Task 3: Content Brief and task handoff

**Files:**
- Create: `components/tag-selector.tsx`
- Create: `app/create-task/page.tsx`
- Modify: `app/page.tsx`
- Test: `tests/content-brief.test.tsx`

**Interfaces:**
- Produces `ContentTask` JSON in `sessionStorage["creatorflow-task"]`.

- [ ] Write a failing test for empty-topic validation and task creation.
- [ ] Implement multi-select audience/style tags, single goal, knowledge switch, and task persistence.
- [ ] Add Dashboard “创建新任务” entry.
- [ ] Verify tests and navigation to `/creator`.

### Task 4: Upgrade Creator, Workflow, and Safety Guard

**Files:**
- Modify: `app/creator/page.tsx`
- Modify: `app/workflow/page.tsx`
- Modify: `components/workflow-node.tsx`
- Modify: `lib/workflow.ts`
- Modify: `data/mock.ts`
- Create: `components/safety-guard.tsx`
- Modify: `tests/workflow.test.ts`

**Interfaces:**
- Creator reads `creatorflow-task`, falling back to seed task.
- Workflow consumes seven typed steps including `model`.

- [ ] Write failing tests for seven-step progression and model metadata.
- [ ] Add task summary, five title candidates, Tags, and cover Prompt to Creator.
- [ ] Insert Safety Guard and per-node Model label.
- [ ] Add four safety checks and Content Quality Score 92.
- [ ] Verify workflow and component tests.

### Task 5: Full regression and visual verification

**Files:**
- Modify only files with verified defects.

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Start the app and inspect all seven routes in the Browser.
- [ ] Verify core interactions: model mode, brief creation, title selection, workflow progression.
- [ ] Check all routes at 1440px and 390px for horizontal overflow.
- [ ] Capture and inspect updated screenshots, then fix all material visual defects.
- [ ] Commit the verified Phase 2 implementation.
