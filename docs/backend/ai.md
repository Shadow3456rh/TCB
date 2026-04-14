# AI & Question Generation (`app/routes/ai.py`)

This file contains the routes that connect the frontend buttons (like "Generate Questions" or "Explain Concept") to the local Ollama AI model.

## Functions Explained in Simple Words:

### `generate_questions_endpoint()`
This is the magic "Create questions from my notes" button.
- **Logic:** 
  1. The teacher puts some text notes into a lesson and clicks "Generate".
  2. This route grabs those notes and sends them over to the `ollama_service` with a command to build multiple-choice questions.
  3. The AI service replies with a clean JSON list of questions.
  4. This route iterates through that list, adds some extra metadata to them (like tagging them as `generated_by="ai"` so we can show a purple robot icon on the frontend), and saves them directly into the database.
  5. It returns the stored questions back to the frontend to display.

### `create_manual_question()` / `list_questions()`
In addition to AI generation, we need to let teachers write their own questions!
- **Logic:** `create_manual_question()` simply takes the manually typed question, tags it as `generated_by="manual"`, and saves it to the database. `list_questions()` pulls all questions (both AI and manual) from the database so the teacher can select which ones to put on a quiz.

### `explain_answer_endpoint()` / `explain_concept_endpoint()`
These are the student-facing AI features.
- **Logic:** When a student gets an answer wrong and asks for help, or highlights a term to explain, the frontend hits these routes. These routes simply format a quick request, send it to the `ollama_service` for a plain text explanation, and send that explanation right back down to the frontend popup window. No database saving required.

### `generate_practice()`
This is the **Adaptive Learning Core**. This doesn't actually use Ollama AI; it's a programmatic algorithm that creates a custom study session.
- **Logic:**
  1. It asks the database for the current student's last 10 quiz attempts.
  2. It groups every question they answered inside those attempts by `topic` (e.g., "History", "Math").
  3. It calculates a success rate for each topic. (e.g., "Math: 4/10 correct = 40%").
  4. If a topic's success rate is below 70%, that topic is added to a "Weak Topics" list.
  5. The algorithm then searches the general question bank for up to 3 questions specifically tagged with those weak topics.
  6. If the student has no weak topics, it praises them and just grabs 5 random general questions.
  7. It sends this custom set of questions back to the frontend for a practice quiz.
