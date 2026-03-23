#!/usr/bin/env python3
"""
Seed script to initialize MongoDB with courses and exercises.
Run once on deployment.
"""

from pymongo import MongoClient
import os

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")

def seed_database():
    client = MongoClient(MONGO_URI)
    db = client["coursero"]
    
    # Courses
    courses = [
        {"_id": "docker", "name": "Docker", "description": "Conteneurisation avec Docker"},
        {"_id": "react", "name": "React", "description": "Développement frontend avec React"},
        {"_id": "linux", "name": "Linux", "description": "Administration système Linux"},
        {"_id": "python", "name": "Python", "description": "Programmation Python"},
    ]
    
    for course in courses:
        db.courses.update_one(
            {"_id": course["_id"]},
            {"$set": course},
            upsert=True
        )
    print(f"Inserted {len(courses)} courses")
    
    # Exercises
    exercises = [
        {
            "_id": "docker-ex1",
            "course_id": "docker",
            "exercise_id": "ex1",
            "title": "Hello World",
            "description": "Écrivez un programme qui affiche 'Hello, World!'",
            "languages": ["python", "c"],
            "deadline": "2026-04-30"
        },
        {
            "_id": "docker-ex2",
            "course_id": "docker",
            "exercise_id": "ex2",
            "title": "Calculatrice de somme",
            "description": "Écrivez un programme qui prend deux nombres en arguments et affiche leur somme",
            "languages": ["python", "c"],
            "deadline": "2026-04-30"
        }
    ]
    
    for ex in exercises:
        db.exercises.update_one(
            {"_id": ex["_id"]},
            {"$set": ex},
            upsert=True
        )
    print(f"Inserted {len(exercises)} exercises")
    
    # Create indexes
    db.submissions.create_index([("status", 1), ("submitted_at", 1)])
    db.submissions.create_index([("user_email", 1)])
    db.best_grades.create_index(
        [("user_email", 1), ("course_id", 1), ("exercise_id", 1)],
        unique=True
    )
    print("Indexes created")
    
    client.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed_database()
