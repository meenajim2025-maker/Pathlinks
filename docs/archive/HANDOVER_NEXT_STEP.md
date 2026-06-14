# PathLinks Handover & Refactor Summary
**Date:** February 21, 2026

## Overview
The PathLinks architecture has undergone a massive streamlining and simplification exercise. Redundant and unused components have been purged to improve code maintainability, minimize bundle size, and reduce visual clutter for clinical users.

## Completed Work
1. **Decision Tools Convergence:** We migrated clinical content into the unified "Decision Tools" view (which natively combines guidance and diagnostic tests using `scripts/build-decision-tools.js`). 
2. **Removed Legacy Modals & Protocols View:** The legacy custom-coded `<section id="protocols-view">` and corresponding JavaScript modal loaders were entirely deleted from `index.html`, `app/index.html`, `script.js`, and `app/script.js`.
3. **Removed Dead Sidebar Modules:**
   - **EMIS Integration:** The EMIS coding helper module (`emis-coding-view` and `renderEmisIntegrations()`) has been removed, as integration is primarily handled locally through the EMIS network outside of this web app.
   - **Device Authorisation:** The mock OAuth workflow (`device-auth-view`, `generateDeviceAuthCode()`, etc) was stripped since the application operates in a completely stateless, URL-shareable, offline-first mode, rendering persistent session auth unnecessary for non-PII guidance.
4. **CSS Optimization:** Styles related to modals, device auth displays (`.device-auth-code`), and EMIS elements (`.emis-code-badge`) were purged from both the root desktop and the mobile `app` stylesheets.

## Current State & Remaining Core Architecture
The application now focuses sharply on **three primary high-value domains**, which are cleanly synced between both the root and mobile environments:

*   **Clinical Decision Tool (Dashboard):** High-speed test querying for actionable parameters (handles direct lab values and displays reference ranges).
*   **Decision Tools:** Expert-grade clinical pathways leveraging a dynamically generated JSON registry (`decision_tools_protocol.json`).
*   **Calculators:** Built-in medical calculators for fast triage (QRISK3, NEWS2, Wells DVT, CURB-65, CHA2DS2-VASc, eGFR).

## Advice for Next Agent / Maintainer
1. **Adding Clinical Content:** Do **not** hardcode HTML sections. You must use the `decision_tools_protocol.json` system by editing the `data/` source files or adding JSON templates, then rerunning the build pipeline. All updates should be dynamically ingested and output onto the `<section id="decision-tools-view">`.
2. **File Synchronization:** Any edits made to `index.html`, `script.js`, and `style.css` at the top level should generally mirror equivalent, lighter changes within the `/app/` directory. Keep these environments in lock-step to prevent regressions.
3. **App Architecture:** PathLinks is stateless. Do not attempt to mount Node servers, backend databases, or complex OAuth mechanisms unless explicitly pivoting the architecture.

The environment is in its strongest functional state yet and fully live. Good luck on the next phase!
