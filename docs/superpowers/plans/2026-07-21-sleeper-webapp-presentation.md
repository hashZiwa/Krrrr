# Sleeper Webapp Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a polished 11–12 slide PowerPoint deck explaining the Sleeper webapp to professors and judges while preserving the visual system of the supplied reference deck.

**Architecture:** Use the supplied PPTX as the only visual template, inspect every source slide, duplicate suitable source slides, and edit inherited elements with `@oai/artifact-tool`. Capture authentic states from the running React application, then render and inspect every final slide before delivery.

**Tech Stack:** PowerPoint PPTX, JavaScript ES modules, `@oai/artifact-tool`, React/Vite, Node.js/Express, PowerShell, PowerPoint COM export for fallback rendering, Codex in-app browser.

## Global Constraints

- Preserve `C:/Users/jmlee/Downloads/크어어어억_찐최종임(영상미포함).pptx` unchanged.
- Use that PPTX as the only visual source; do not mix in Codex Grid or another template.
- Follow the reference deck's white background, dark navy headings, thin blue rules, typography, spacing, page markers, and annotation style.
- Give every slide one explanation job and no more than two to four short callouts.
- Use authentic screenshots from the running Sleeper webapp; do not generate or redraw fake UI.
- Do not invent performance, accuracy, health outcome, or validation claims.
- Build with plain JavaScript ES modules and `@oai/artifact-tool`; do not use `python-pptx`.
- Write generated planning and QA notes as `.txt` files under the external scratch workspace.
- Deliver only a new PPTX at `D:/rehabP-jmlee/Sleeper/outputs/sleeper-webapp-overview.pptx`.

---

## File Structure

- Create: `tools/presentation/unzip.cmd` — compatibility shim required by the template inspection script on this Windows environment.
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/template-frame-map.json` — maps every output slide to a source slide and inherited edit targets.
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/template-audit.txt` — records source layout, typography, reusable frames, and placeholder rules.
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/deviation-log.txt` — records each intentional departure from the source slide.
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/*.png` — authentic webapp screenshots.
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/build-deck.mjs` — imports the starter PPTX and edits inherited slide objects.
- Create: `outputs/sleeper-webapp-overview.pptx` — final presentation deliverable.

### Task 1: Make source-deck inspection portable on Windows

**Files:**
- Create: `tools/presentation/unzip.cmd`
- Test: `C:/Users/jmlee/AppData/Local/Temp/codex-presentations/sleeper-webapp-overview/unzip-test/`

**Interfaces:**
- Consumes: invocations in the forms `unzip -Z1 <archive>` and `unzip -p <archive> <member>`.
- Produces: archive member names on stdout or one member's bytes on stdout, with a nonzero exit code on failure.

- [ ] **Step 1: Create the compatibility shim**

```bat
@echo off
setlocal
if "%~1"=="-Z1" (
  tar -tf "%~2"
  exit /b %errorlevel%
)
if "%~1"=="-p" (
  tar -xOf "%~2" "%~3"
  exit /b %errorlevel%
)
echo Unsupported unzip arguments: %* 1>&2
exit /b 2
```

- [ ] **Step 2: Verify archive listing**

Run:

```powershell
$env:Path = "D:\rehabP-jmlee\Sleeper\tools\presentation;$env:Path"
unzip -Z1 "C:\Users\jmlee\Downloads\크어어어억_찐최종임(영상미포함).pptx" | Select-Object -First 5
```

Expected: output begins with PPTX package members such as `[Content_Types].xml`, `_rels/.rels`, and `ppt/presentation.xml`.

- [ ] **Step 3: Verify member extraction**

Run:

```powershell
$env:Path = "D:\rehabP-jmlee\Sleeper\tools\presentation;$env:Path"
unzip -p "C:\Users\jmlee\Downloads\크어어어억_찐최종임(영상미포함).pptx" "ppt/presentation.xml" | Select-String "p:presentation"
```

Expected: one XML line containing `p:presentation`.

- [ ] **Step 4: Commit the shim**

```powershell
git add tools/presentation/unzip.cmd
git commit -m "build: add Windows unzip shim for presentation tooling"
```

### Task 2: Inspect and inventory the full reference deck

**Files:**
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/template-inspect/`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/template-audit.txt`

**Interfaces:**
- Consumes: the supplied reference PPTX and the unzip shim from Task 1.
- Produces: rendered source slides, layout JSON, extracted media, font evidence, manifest, and reusable-slide audit.

- [ ] **Step 1: Initialize paths and copy the reference to an ASCII-only temporary filename**

```powershell
$skillDir = "C:\Users\jmlee\.codex\plugins\cache\openai-primary-runtime\presentations\26.715.12143\skills\presentations"
$work = Join-Path ([System.IO.Path]::GetTempPath()) "codex-presentations\sleeper-webapp-overview"
$tmp = Join-Path $work "tmp"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
Copy-Item -LiteralPath "C:\Users\jmlee\Downloads\크어어어억_찐최종임(영상미포함).pptx" -Destination (Join-Path $tmp "reference-deck.pptx") -Force
```

- [ ] **Step 2: Run the required full-deck inspection**

Run from `C:/Users/jmlee` so the presentation tooling resolves the bundled runtime:

```powershell
$env:Path = "D:\rehabP-jmlee\Sleeper\tools\presentation;$env:Path"
& "C:\Users\jmlee\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "$skillDir\template_following_scripts\inspect_template_deck.mjs" --workspace $tmp --pptx (Join-Path $tmp "reference-deck.pptx")
```

Expected: exit code `0` and a complete `template-inspect` directory containing renders for all 32 source slides.

- [ ] **Step 3: Review every rendered source slide and record reusable frames**

Write `template-audit.txt` with:

```text
Source deck: 32 slides, 16:9.
Primary reusable webapp frames: slides 13, 14, 15, and 16.
Required chrome: dark navy section heading, thin blue top and bottom rules, section label, page marker.
Typography: preserve exact font family, sizes, weights, alignment, and text insets from each mapped source slide.
Screenshot treatment: large white UI screenshot, light border or shadow only when inherited, blue or purple annotations.
Placeholder contract: every inherited placeholder is rewritten or deleted by exact element ID; no empty structural placeholders remain.
```

- [ ] **Step 4: Verify the audit covers all source slides**

Run:

```powershell
(Get-ChildItem (Join-Path $tmp "template-inspect\slides") -Filter "*.png").Count
```

Expected: `32`.

### Task 3: Capture authentic webapp states

**Files:**
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/01-overview.png`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/03-saved-session.png`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/04-realtime.png`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/05-save-session.png`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/06-analysis-summary.png`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/07-breathing-chart.png`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/08-sleep-stage-chart.png`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/09-alarm.png`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/10-platform-data.png`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/assets/11-model-management.png`

**Interfaces:**
- Consumes: the existing application running at `http://localhost:5173` with the mock-first server at `http://localhost:4000`.
- Produces: named screenshots with no browser chrome, no fake data, and enough resolution for cropping in a 16:9 slide.

- [ ] **Step 1: Verify the application before capture**

Run:

```powershell
npm run test
npm run typecheck
npm run build
```

Expected: all tests pass, both workspaces typecheck, and both workspaces build successfully.

- [ ] **Step 2: Start the existing development server**

Run:

```powershell
npm run dev
```

Expected: server reports `http://localhost:4000` and Vite reports `http://localhost:5173`.

- [ ] **Step 3: Capture the overview and saved-session states**

Use the in-app browser at 1600×900. Select a display-data CSV with populated analysis content, capture the complete page for `01-overview.png`, then crop the selector and initial analysis area for `03-saved-session.png`.

- [ ] **Step 4: Capture the realtime workflow**

Open the realtime confirmation state and save it as `04-realtime.png`. Capture the session-save confirmation or authentic stopped-session state as `05-save-session.png`. If the mock backend cannot produce a nonempty realtime session, use the genuine confirmation and empty-state UI and state that limitation in `source-notes.txt`.

- [ ] **Step 5: Capture analysis and control panels**

Capture the analysis summary, breathing chart, sleep-stage chart, alarm panel, platform-data panel, and model-management panel into their exact filenames. Keep each crop centered on one panel and retain surrounding context only when needed to identify the screen.

- [ ] **Step 6: Verify screenshot dimensions and provenance**

Run:

```powershell
Get-ChildItem (Join-Path $tmp "assets") -Filter "*.png" | ForEach-Object { $image = [System.Drawing.Image]::FromFile($_.FullName); "{0}: {1}x{2}" -f $_.Name,$image.Width,$image.Height; $image.Dispose() }
```

Expected: all ten screenshots exist and each crop is at least 900 pixels wide or 500 pixels tall.

### Task 4: Map output slides to inherited source frames

**Files:**
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/template-frame-map.json`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/deviation-log.txt`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/template-starter.pptx`

**Interfaces:**
- Consumes: source inspection element IDs and the 12-slide content design.
- Produces: a validated source-slide mapping in which every output slide inherits one existing source frame.

- [ ] **Step 1: Create the 12-slide mapping**

Map slides as follows, substituting the exact inherited `shapeId` values from `template-inspect.ndjson` into every `editTargets` entry:

```json
{
  "outputSlides": [
    {"outputSlide":1,"sourceSlide":13,"narrativeRole":"webapp overview","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":2,"sourceSlide":14,"narrativeRole":"webapp data flow","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":3,"sourceSlide":15,"narrativeRole":"saved session selection","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":4,"sourceSlide":14,"narrativeRole":"realtime monitoring","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":5,"sourceSlide":14,"narrativeRole":"realtime session save","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":6,"sourceSlide":15,"narrativeRole":"analysis summary","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":7,"sourceSlide":15,"narrativeRole":"breathing time series","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":8,"sourceSlide":15,"narrativeRole":"sleep stage time series","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":9,"sourceSlide":16,"narrativeRole":"alarm controls","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":10,"sourceSlide":16,"narrativeRole":"platform data management","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":11,"sourceSlide":16,"narrativeRole":"model management","reuseMode":"duplicate-slide","editTargets":[]},
    {"outputSlide":12,"sourceSlide":11,"narrativeRole":"integrated lifecycle","reuseMode":"duplicate-slide","editTargets":[]}
  ],
  "omittedSourceSlides": []
}
```

Every `editTargets` array must then explicitly classify each inherited title, body, screenshot, annotation, footer, page marker, and placeholder as `rewrite`, `replace`, `keep`, or `delete` using exact IDs.

- [ ] **Step 2: Record deviations**

Write one line per output slide in `deviation-log.txt`, for example:

```text
Output 6 / source 15: replace the inherited monitoring screenshot with the authentic analysis-summary crop; rewrite title and annotations; preserve all section chrome.
```

- [ ] **Step 3: Validate the mapping**

Run:

```powershell
& "$node" "$skillDir\template_following_scripts\validate_template_plan.mjs" --workspace $tmp --map (Join-Path $tmp "template-frame-map.json")
```

Expected: exit code `0`; no unresolved edit targets and no unhandled inherited placeholders.

- [ ] **Step 4: Build the starter deck**

Run:

```powershell
& "$node" "$skillDir\template_following_scripts\prepare_template_starter_deck.mjs" --workspace $tmp --pptx (Join-Path $tmp "reference-deck.pptx") --map (Join-Path $tmp "template-frame-map.json") --out (Join-Path $tmp "template-starter.pptx") --preview-dir (Join-Path $tmp "template-starter-preview") --layout-dir (Join-Path $tmp "template-starter-layout") --contact-sheet (Join-Path $tmp "template-starter-contact-sheet.png")
```

Expected: a 12-slide starter PPTX using only duplicated source slides.

### Task 5: Author the presentation by editing inherited elements

**Files:**
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/build-deck.mjs`
- Create: `outputs/sleeper-webapp-overview.pptx`

**Interfaces:**
- Consumes: `template-starter.pptx`, exact inherited element IDs, content copy from the approved design, and authentic screenshots.
- Produces: an editable 12-slide PPTX preserving reference-deck typography and chrome.

- [ ] **Step 1: Initialize the artifact-tool workspace**

Run:

```powershell
& "$node" "$skillDir\container_tools\setup_artifact_tool_workspace.mjs" --workspace $tmp
```

Expected: `$tmp/node_modules/@oai/artifact-tool` resolves to the bundled package.

- [ ] **Step 2: Implement exact inherited-object edits**

In `build-deck.mjs`, import the starter deck, locate inherited objects by the IDs recorded in `template-frame-map.json`, replace screenshot assets in their existing frames, and rewrite titles and callouts with the exact approved slide messages. Preserve inherited font family, size, weight, alignment, insets, and vertical anchor. Delete only objects marked `delete`.

The visible slide titles are:

```text
1. 수면 데이터의 수집부터 분석·관리까지 하나의 웹앱으로 통합
2. 서로 다른 데이터 입력을 하나의 수면 세션으로 변환
3. 측정 기록을 선택하면 해당 수면 결과를 즉시 분석
4. Mobius 데이터를 주기적으로 확인해 실시간 상태를 갱신
5. 실시간 수집 데이터를 새로운 분석 기록으로 저장
6. 복잡한 수면 데이터를 두 가지 핵심 지표로 요약
7. 시간에 따른 호흡 변화를 통해 이상 구간을 확인
8. 수면 단계의 전환 과정을 시간 흐름으로 확인
9. 웹에서 알람 시간과 동작 상태를 직접 관리
10. Mobius 원시 데이터를 날짜별 수면 기록으로 변환
11. 새로운 데이터로 수면 단계 모델을 지속적으로 개선
12. 수집·분석·제어·학습이 하나의 순환 구조로 연결
```

- [ ] **Step 3: Export through artifact-tool**

The module must finish with the equivalent of:

```js
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save("D:/rehabP-jmlee/Sleeper/outputs/sleeper-webapp-overview.pptx");
```

Run:

```powershell
& "$node" (Join-Path $tmp "build-deck.mjs")
```

Expected: `outputs/sleeper-webapp-overview.pptx` exists and contains 12 slides.

### Task 6: Render, inspect, and correct every slide

**Files:**
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/preview/final/`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/layout/final/`
- Create temporarily: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/qa/qa-ledger.txt`
- Modify if needed: `%TEMP%/codex-presentations/sleeper-webapp-overview/tmp/build-deck.mjs`
- Modify if needed: `outputs/sleeper-webapp-overview.pptx`

**Interfaces:**
- Consumes: the first exported PPTX and the starter-deck layout.
- Produces: a visually verified PPTX with no unintended overlap, clipping, empty placeholders, or template regressions.

- [ ] **Step 1: Render all final slides and layouts**

Use artifact-tool export to create all 12 slide PNGs, per-slide layout JSON, and a montage. Expected: 12 final slide images and one contact sheet.

- [ ] **Step 2: Run overflow testing**

Run:

```powershell
& "$python" "$skillDir\container_tools\slides_test.py" "D:\rehabP-jmlee\Sleeper\outputs\sleeper-webapp-overview.pptx"
```

Expected: no objects overflow the slide canvas.

- [ ] **Step 3: Inspect every slide at full size**

Record one line per slide in `qa-ledger.txt` covering title fit, screenshot crop, annotation alignment, text wrapping, page marker, required chrome, and visual hierarchy. Fix every unintended overlap or clipping issue in `build-deck.mjs`, rerun the build, and re-render the affected slide.

- [ ] **Step 4: Check template fidelity and empty placeholders**

Run:

```powershell
& "$node" "$skillDir\template_following_scripts\check_template_fidelity.mjs" --workspace $tmp --starter-pptx (Join-Path $tmp "template-starter.pptx") --final-pptx "D:\rehabP-jmlee\Sleeper\outputs\sleeper-webapp-overview.pptx" --map (Join-Path $tmp "template-frame-map.json") --starter-layout-dir (Join-Path $tmp "template-starter-layout") --final-layout-dir (Join-Path $tmp "layout\final") --edit-dir $tmp
```

Expected: exit code `0`; no unresolved placeholders or unplanned template changes.

- [ ] **Step 5: Run final application verification**

Run:

```powershell
npm run test
npm run typecheck
npm run build
```

Expected: all commands pass, confirming presentation work did not alter application behavior.

### Task 7: Final delivery verification

**Files:**
- Verify: `outputs/sleeper-webapp-overview.pptx`

**Interfaces:**
- Consumes: the QA-approved final deck.
- Produces: the single user-facing PPTX link and a short summary.

- [ ] **Step 1: Confirm the deliverable exists and is nonempty**

Run:

```powershell
Get-Item "D:\rehabP-jmlee\Sleeper\outputs\sleeper-webapp-overview.pptx" | Select-Object FullName,Length,LastWriteTime
```

Expected: a nonzero file size and a current modification time.

- [ ] **Step 2: Confirm slide count**

Open the final PPTX with artifact-tool inspection and verify exactly 12 slides. If slide 12 duplicates a later presentation section, remove it through the mapped template workflow and repeat Tasks 5–7 expecting 11 slides.

- [ ] **Step 3: Deliver the deck**

Return exactly one standalone Markdown link to `D:/rehabP-jmlee/Sleeper/outputs/sleeper-webapp-overview.pptx`, mention that the supplied PPTX was used as the visual source, and do not attach scratch files.
