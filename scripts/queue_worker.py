#!/usr/bin/env python3
"""
Coursero - Queue Worker Daemon
Processes submission queue from MongoDB and runs corrections.
"""

import os
import sys
import json
import time
import signal
import logging
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
import subprocess

# Configuration
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "coursero"
POLL_INTERVAL = 2
CORRECTION_SCRIPT = "/var/www/coursero/scripts/correction.py"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

running = True

def signal_handler(signum, frame):
    global running
    logger.info(f"Received signal {signum}, shutting down...")
    running = False

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)


class QueueWorker:
    def __init__(self):
        self.client = None
        self.db = None
        
    def connect(self):
        """Connect to MongoDB."""
        self.client = MongoClient(MONGO_URI)
        self.db = self.client[DB_NAME]
        self.client.admin.command('ping')
        logger.info(f"Connected to MongoDB: {MONGO_URI}")
    
    def get_next_submission(self):
        """Get next pending submission (FIFO, atomic)."""
        return self.db.submissions.find_one_and_update(
            {"status": "pending"},
            {"$set": {"status": "processing", "started_at": datetime.utcnow()}},
            sort=[("submitted_at", 1)],
            return_document=True
        )
    
    def run_correction(self, submission: dict) -> dict:
        """Run the correction script for a submission."""
        submission_id = str(submission["_id"])
        file_path = submission.get("file_path")
        language = submission.get("language")
        exercise_id = submission.get("exercise_id")
        course_id = submission.get("course_id")
        
        logger.info(f"Processing {submission_id}: {language} - {course_id}/{exercise_id}")
        
        try:
            result = subprocess.run(
                ["python3", CORRECTION_SCRIPT, file_path, language, exercise_id, course_id],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                return json.loads(result.stdout)
            return {
                "error": f"Correction failed: {result.stderr}",
                "percentage": 0, "tests_passed": 0, "tests_total": 0, "details": []
            }
        except subprocess.TimeoutExpired:
            return {"error": "Timeout exceeded", "percentage": 0, "tests_passed": 0, "tests_total": 0, "details": []}
        except Exception as e:
            return {"error": str(e), "percentage": 0, "tests_passed": 0, "tests_total": 0, "details": []}
    
    def update_submission(self, submission_id: ObjectId, correction_result: dict):
        """Update submission with correction results."""
        self.db.submissions.update_one(
            {"_id": submission_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "grade": correction_result.get("percentage", 0),
                "tests_passed": correction_result.get("tests_passed", 0),
                "tests_total": correction_result.get("tests_total", 0),
                "details": correction_result.get("details", []),
                "error": correction_result.get("error")
            }}
        )
        logger.info(f"Submission {submission_id} completed: {correction_result.get('percentage', 0)}%")
    
    def update_best_grade(self, submission: dict, grade: float):
        """Update user's best grade if this one is higher."""
        user_email = submission.get("user_email")
        exercise_id = submission.get("exercise_id")
        course_id = submission.get("course_id")
        
        existing = self.db.best_grades.find_one({
            "user_email": user_email,
            "exercise_id": exercise_id,
            "course_id": course_id
        })
        
        if existing is None or existing.get("grade", 0) < grade:
            self.db.best_grades.update_one(
                {"user_email": user_email, "exercise_id": exercise_id, "course_id": course_id},
                {"$set": {"grade": grade, "updated_at": datetime.utcnow(), "submission_id": submission["_id"]}},
                upsert=True
            )
            logger.info(f"Updated best grade for {user_email}: {grade}%")
    
    def cleanup_file(self, file_path: str):
        """Delete submission file after processing."""
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up: {file_path}")
        except Exception as e:
            logger.warning(f"Cleanup failed {file_path}: {e}")
    
    def process_one(self) -> bool:
        """Process one submission. Returns True if processed, False if queue empty."""
        submission = self.get_next_submission()
        if submission is None:
            return False
        
        submission_id = submission["_id"]
        try:
            correction_result = self.run_correction(submission)
            self.update_submission(submission_id, correction_result)
            self.update_best_grade(submission, correction_result.get("percentage", 0))
            self.cleanup_file(submission.get("file_path"))
        except Exception as e:
            logger.error(f"Error processing {submission_id}: {e}")
            self.db.submissions.update_one(
                {"_id": submission_id},
                {"$set": {"status": "failed", "error": str(e), "completed_at": datetime.utcnow()}}
            )
        return True
    
    def run(self):
        """Main worker loop."""
        logger.info("Queue worker started")
        self.connect()
        
        while running:
            try:
                if not self.process_one():
                    time.sleep(POLL_INTERVAL)
            except Exception as e:
                logger.error(f"Worker error: {e}")
                time.sleep(POLL_INTERVAL * 2)
        
        logger.info("Queue worker stopped")
        if self.client:
            self.client.close()


if __name__ == "__main__":
    QueueWorker().run()
