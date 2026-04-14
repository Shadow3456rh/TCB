# Analytics (`app/routes/analytics.py`)

This file is the powerhouse behind the Educator's Dashboard. It doesn't create or edit anything; its only job is to crunch massive amounts of data from the database and package it so React can draw charts and grids.

## Functions Explained in Simple Words:

### `course_analytics(course_id)`
This is a single, massive function. Here is the step-by-step logic of what it does when a teacher requests analytics for a specific course:

1. **Verify the Course:** It first checks if the course actually exists in the database.
2. **Gather Quizzes:** It asks the database, "Get me a list of all Quizzes inside this specific Course."
3. **Gather All Grades (Attempts):** For every single quiz in that list, it asks the database, "Get me every single time a student submitted an answer for this quiz." This results in a giant list of every test ever taken in the course.
4. **Gather Students:** It cross-references the list of students enrolled in the course with the main `users` database to get their actual names and emails.
5. **Crunch "Student Performance":** 
   - It lumps the giant list of attempts together by student.
   - For example: "John Doe took 4 quizzes. Let's add up all the points he earned across all 4 quizzes, and divide by the total possible points to find his overall average."
   - It packages this into a list and sorts it so the students with the **lowest** scores appear at the very top. This helps the teacher immediately see who needs help.
6. **Crunch "Topic Analysis" (The Weakness Detector):**
   - Instead of looking at students, it looks at individual *questions* inside all those attempts.
   - It groups the answers by the question's `topic` (e.g., "OOP", "Variables").
   - It calculates: "Out of all 100 times any student answered a question tagged 'OOP', they got it right 40 times. That's 40%."
   - If that number drops below 70%, the backend flags that topic with `"isWeak": true`. This tells the frontend to display a red warning icon next to the topic.
7. **Crunch "Quiz Stats":**
   - It looks at each individual quiz and calculates the highest score, the lowest score, and the average score for that specific test.
8. **Overall Stats:** It calculates a single grand average score for the entire course.
9. **Return Data:** It takes all those calculated numbers, bundles them into one giant dictionary, and sends it directly to the frontend React charts.
