# Teacher QA System: AI Integration Plan

## 1. Vision & Strategy
- **Concept:** Transform "Math Agora" into an **"Intelligent Learning Platform"**.
- **Core Philosophy:** AI as a **"Teacher's Copilot" (Human-in-the-loop)**, not a replacement.
- **Key Value:** Reduce teacher workload by 80% while maintaining high-quality, personalized feedback.
- **Critical Success Factor:** Maintaining trust by ensuring AI drafts are accurate, helpful, and Socratic in nature.

## 2. Phased Implementation Roadmap

### Phase 1: The Teacher's Copilot (Operational Efficiency)
- **Goal:** Automate draft generation for teachers.
- **Feature:** "✨ Generate AI Draft" button in Admin Dashboard.
- **Privacy:** AI-generated drafts are **visible ONLY to teachers** initially.
- **Multimodal Analysis:** AI analyzes problem images + student text to provide context-aware answers.
- **Tech Stack:** Gemini 1.5 Flash (Cost/Latency efficiency).

### Phase 2: Intelligent Guardrails (Student Experience)
- **Goal:** Prevent duplicate questions and provide instant help.
- **Feature:** Real-time **"Similar Question"** suggestions with visual matching.
- **Tech:** Hybrid Search (Keyword + Vector/Visual Similarity).
- **UX:** "Is this the problem you're looking for?" with thumbnail previews during question drafting.

### Phase 3: Autonomous Support (Scale & Automation)
- **Goal:** Handle high-volume, repetitive queries automatically.
- **Feature:** Automatic replies for high-confidence matches (95%+ similarity).
- **Control:** Flag for teacher review if AI confidence is low.

## 3. Technical Architecture (Gemini Service)

### Service Module: `gemini.js`
- **Model:** Gemini 1.5 Flash (for speed/cost) or Pro (for complex reasoning).
- **Primary Functions:**
    1.  `generateDraftAnswer(questionText, imageBase64, quizContext)`: Generates a draft answer.
    2.  `findSimilarQuestions(queryText, imageBase64)`: Finds existing Q&A pairs.

### Prompt Engineering Strategy
- **Role Persona:** Friendly, patient, Socratic Math Teacher.
- **Context Injection:**
    -   **Student's Wrong Answer:** Explain *why* it's wrong (misconception analysis).
    -   **Quiz Metadata:** Chapter, Unit, Concept keywords.
    -   **Image Analysis:** Identify geometry features, graphs, or equations in the image.
-   **Output Format:** Markdown + LaTeX for math symbols (e.g., `$x^2$`).

## 4. UI/UX Implementation Details

### Teacher Dashboard (`TeacherQA.jsx`)
- **Interaction Flow:**
    1.  Teacher opens a question.
    2.  Click **"✨ Generate AI Draft"**.
    3.  System analyzes text + image.
    4.  Draft appears in the editor.
    5.  Teacher reviews/edits -> **Submit**.
- **Metrics:** Track "Edit Rate" (distance between draft and final answer) to fine-tune prompts.

### Student Modal (`QuestionModal.jsx`)
- **Debounced Input:** Wait 500ms~1s after typing stops to prevent API spam.
- **Visual Search:** Show "Similar Questions" list with brief snippets.
- **Multimodal Input:** Allow attaching screenshots/images for better AI context.

## 5. Security & Operations
- **API Key Management:** Store in `.env` for MVP; migrate to **Firebase Functions (Serverless)** for production to hide keys.
- **Rate Limiting:** Implement per-user caps to prevent abuse.
- **Cost Control:** Optimize image size before sending to API (e.g., resize to max 768px width).

## 6. Verification & Testing
- **Accuracy Test:** Verify AI correctly identifies key elements in geometry problems.
- **Tone Test:** Ensure answers are encouraging and not just "giving away the answer".
- **Duplicate Detection:** Test with slightly rephrased questions to ensure robust matching.
