# Real-time & Media Enhancements: Technical Plan

## 1. Overview
Enhance the learning experience by enabling visual communication (Canvas Drawing) and timely feedback (Notification Center).
**Core Principle:** "Light Data, Heavy Experience" - Utilize Firebase Storage for heavy media and Firestore for lightweight metadata.

## 2. Canvas Drawing Feature

### Architecture
- **Client-side:** Use `react-sketch-canvas` for the drawing interface.
- **Overlay Strategy:** Render the canvas *on top of* the Quiz Image (if available) or a whiteboard.
- **Storage:**
    -   Drawings are exported as PNG blobs.
    -   Uploaded to **Firebase Storage** at `/drawings/{userId}/{timestamp}.png`.
    -   **Download URL** is retrieved and stored in the `questions` document in Firestore.

### Implementation Checklist
1.  **Dependencies:** Verify `react-sketch-canvas` installation.
2.  **UI Components:**
    -   `QuestionModal.jsx`: Add "Draw Mode" toggle.
    -   Canvas Container: Needs `position: relative` to overlay on images.
3.  **Data Flow:**
    -   User draws -> "Submit" -> `canvasRef.current.exportImage('png')` -> Upload to Storage -> `addDoc(questions, { drawingUrl: url })`.

## 3. Notification Center

### Data Model (Firestore)
Collection: `notifications`
```json
{
  "recipientId": "string (UID)",
  "type": "string ('reply', 'badge', 'system')",
  "title": "string",
  "message": "string",
  "link": "string (e.g., '/agora/question/123')",
  "isRead": "boolean",
  "createdAt": "timestamp"
}
```

### UI Implementation
1.  **NotificationMenu (`SpaceNavbar`):**
    -   Bell Icon with Badge (count of `isRead: false`).
    -   Dropdown list using `onSnapshot` for real-time updates.
2.  **Interaction:**
    -   Clicking a notification marks it as read.
    -   **Deep Linking:** Navigates `useNavigate(notification.link)` to open the specific context.

### Teacher Dashboard Integration
-   When a teacher replies in `TeacherQA.jsx`, a Cloud Function (or client-side trigger for MVP) creates a notification document for the student.

## 4. Synergy with AI (Future)
-   **Multimodal AI:** The drawing URL can be passed to the Gemini API (`gemini.js`) to analyze the student's specific markings or handwriting.
-   **AI Answers:** Future AI features can use the drawing context to provide more accurate, visual explanations.

## 5. Verification & Testing
-   **Network Resilience:** Test incomplete uploads.
-   **Storage Rules:** Ensure students can only upload to their own folders; teachers can read all.
-   **Deep Link:** Verify clicking a notification opens the correct modal/page even if the app was closed.
