---
title: CivicConnect Classifier
emoji: 🏙️
colorFrom: blue
colorTo: green
sdk: gradio
app_file: app.py
python_version: "3.10"
pinned: false
---

# CivicConnect AI Service and Hugging Face Space

This folder contains the deployable Hugging Face Space application. The Space
is the shared provider for image classification, voice transcription, and text
classification.

## Hugging Face Space deployment

The Space entrypoint is `app.py`. It exposes:

- `/classify` - top-3 image classes
- `/transcribe` - voice transcription (`auto`, `en`, `hi`, or `gu`)
- `/classify_text` - top-3 text classes

The `Deploy classifier Space` workflow publishes this folder's Space files to
`Maharsh8805/CivicConnect-Classifier` after changes reach `main`. Configure a
repository secret named `HF_SPACE_WRITE_TOKEN` with a Hugging Face token that
has write access to that Space. Never put this token in the repository.

## Space development

1. **Prerequisites**: Python 3.10+ installed.
2. **Create Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the Space locally**:
   ```bash
   python app.py
   ```
   Gradio will print the local URL.

## Repository conventions

Model files are supplied from `AI-Related-Files/` and local environment values
remain in an untracked `.env`. Python caches and virtual environments are
ignored by the repository. Run `python -m compileall -q .` as the lightweight
service validation used by CI.

## How it Integrates
- **Backend (Node.js)**: Uses the private Hugging Face Space for all
  multimodal classification in production.
