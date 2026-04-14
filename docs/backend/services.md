# Services (`app/services/*`)

Services are the helper files that connect our python code to external systems, specifically Google Firebase (our database) and Ollama (our local AI).

## 1. Firebase Service (`firebase_service.py`)

This file acts as a universal translator between standard Python dictionaries and Google's Cloud Firestore document system.

- **`initialize_firebase()`**: Runs when the server starts. It reads the secret keys from the `firebase-credentials.json` file and connects us securely to Google's servers.
- **`verify_firebase_token(id_token)`**: A crucial security function. When a user logs in on the React frontend, Firebase gives their browser a temporary gibberish string called a "Token". The browser sends this token to our backend. This function takes that token, sends it back to Google, and says, "Can you verify this is real?" If Google says yes, it returns the user's permanent `uid`.
- **`create_document(collection_name, data)`**: Takes a Python dictionary of data, assigns it to a folder (collection) like `"users"` or `"courses"`, creates a unique random ID for it, stamps it with the current date and time, and pushes it up to the database.
- **`get_document(collection_name, doc_id)`**: The standard read function. It goes to a specific folder, looks for a specific ID, and pulls the document down.
- **`update_document()` / `delete_document()`**: As expected, these edit or remove specific documents based on their ID.
- **`query_documents(collection_name, filters, limit)`**: The search engine. You provide a query like `[("courseId", "==", "my_course_123")]` and it retrieves all documents that match that rule.

## 2. Ollama Service (`ollama_service.py`)

This file is the prompt engineer. It creates the specific text strings that command the local Llama 3.2 model to behave heavily regulated ways.

### `generate_questions(lesson_content, count, difficulty)`
Instead of a complex Vector Database connecting to thousands of PDFs, we use a simple, robust command architecture.
- **The Process:** We create a python string that says: *"You are an expert educator. Based on this text, generate X multiple choice questions... Return ONLY a valid JSON array."* We paste the teacher's lesson content right into the middle of that string.
- We send that giant string to Ollama.
- Because AI can sometimes be chatty (e.g. replying with "Sure! Here is your JSON: [{...}]"), we have a helper function called **`_extract_json()`**. This uses Regular Expressions to chop off all conversational fluff and grab *only* the data bracket `[...]` so python can parse it correctly.

### `explain_answer(question, student_answer, correct_answer)`
A very direct prompt to the AI.
- **The Process:** The prompt literally says: *"Question was X. Student answered Y. The actual correct answer is Z. Explain why Z is correct in 3-4 sentences in an encouraging way."* It returns a simple string of text.

### `explain_concept(concept, lesson_content)`
Similar to above. It asks the AI to explain a term in simple words, and optionally passes the lesson content as "context" so the AI doesn't define a term using a definition from an unrelated field.
