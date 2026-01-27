# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio transcription service built with Node.js. Uses Express for HTTP handling, multer for file uploads, and the OpenAI API for transcription.

## Commands

- **Install dependencies**: `yarn install`
- **Run**: `node index.js`
- **Dev (hot reload)**: `yarn dev`
- **Format code**: `yarn format`
- **Check formatting**: `yarn format:check`

## Architecture

The project is in early setup phase — `index.js` is the entry point but currently empty. Dependencies are installed and ready:

- **express** (v5) — HTTP server and routing
- **multer** (v2) — multipart/form-data file upload handling
- **openai** (v6) — OpenAI API client for audio transcription
- **dotenv** — loads environment variables from `.env`

## Environment

The `.env` file must contain:

- `OPENAI_API_KEY` — API key for OpenAI transcription
