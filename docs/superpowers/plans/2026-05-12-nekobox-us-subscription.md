# NekoBox US Subscription Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an auto-updating U.S.-only NekoBox subscription URL from proxifly upstream data.

**Architecture:** A small Node.js build script fetches upstream U.S. proxy JSON, filters supported protocols, deduplicates proxies, emits plain-text and base64 subscription artifacts, and writes metadata. GitHub Actions runs the build on a schedule and commits updated artifacts to `main`.

**Tech Stack:** Node.js, built-in `node:test`, GitHub Actions

---

### Task 1: Test conversion behavior

**Files:**
- Create: `tests/build-nekobox-subscription.test.mjs`
- Create: `package.json`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Add minimal Node test harness**
- [ ] **Step 4: Run test to verify it still fails on missing implementation**

### Task 2: Implement build script

**Files:**
- Create: `scripts/build-nekobox-subscription.mjs`
- Modify: `package.json`

- [ ] **Step 1: Implement pure conversion helpers**
- [ ] **Step 2: Implement file output builder**
- [ ] **Step 3: Implement CLI fetch/write path**
- [ ] **Step 4: Run tests**

### Task 3: Publish and document

**Files:**
- Create: `.github/workflows/update-proxy-list.yml`
- Modify: `README.md`

- [ ] **Step 1: Add scheduled workflow**
- [ ] **Step 2: Rewrite README to match real output**
- [ ] **Step 3: Run local build**
- [ ] **Step 4: Verify generated `dist/` artifacts**
