# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio transcription frontend application built with React 19, TypeScript 5.9, and Vite 7. Currently in initial scaffold state.

## Commands

- **Dev server:** `yarn dev` (Vite with HMR)
- **Build:** `yarn build` (runs `tsc -b && vite build`)
- **Lint:** `yarn lint` (ESLint with TypeScript and React plugins)
- **Preview prod build:** `yarn preview`
- **Package manager:** Yarn (use `yarn add` for dependencies)

No testing framework is configured yet.

## Architecture

- **Entry:** `index.html` → `src/main.tsx` → `src/App.tsx`
- **Build tool:** Vite with `@vitejs/plugin-react` (Babel-based Fast Refresh)
- **TypeScript:** Strict mode with `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` enabled
- **ESLint:** Flat config format (eslint.config.js) with typescript-eslint, react-hooks, and react-refresh plugins
- **CSS:** Plain CSS files co-located with components (no CSS modules or preprocessor)
- **TSConfig:** Split into `tsconfig.app.json` (app code, ES2022 target, bundler resolution) and `tsconfig.node.json` (build tooling config only)
