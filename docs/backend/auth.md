# Authentication (`app/routes/auth.py`)

This file manages logging in, signing up, and checking user permissions. It acts as the security checkpoint for the backend.

## Security Functions Explained:

### `get_current_user()`
This is the bouncer for the REST API. 
- **What it does:** If you add this to any other function in the backend, it forces that function to be locked behind a login screen.
- **Logic:** It expects the frontend to send a secret "Firebase Token" inside the web request header. It passes that token to the Firebase service to say, "Is this token legit?". If yes, it finds out who the user is and what their role is (Teacher vs Student), and lets the request pass. If the token is fake or missing, it blocks the request with a "401 Authentication Error".

### `require_role(*roles)`
This is a VIP bouncer.
- **What it does:** It uses `get_current_user()` to find out who the person is, but then it adds an extra check. If you say `require_role('educator')`, and a student tries to access the URL, it will block them with a "403 Insufficient permissions" error. This is how we prevent students from editing questions.

## Standard Route Endpoints:

### `register()`
- **Logic:** 
  1. This is a bit unique. The React frontend technically creates the "Account" directly using the Google Firebase SDK.
  2. The frontend then sends the new user's "token", along with their chosen Name, Role, and Institution to this backend route.
  3. This route says, "Okay, the account exists. Let me create a permanent database record inside our `users` collection to store their name and role so they show up properly on the dashboard."

### `get_profile()`
- **Logic:** Whenever the frontend reloads the page, it uses the user's secret token to call this route and ask, "Please remind me what my name, role, and institution are so I can draw the navigation bar correctly." This route looks them up in the database and sends that profile data back.
