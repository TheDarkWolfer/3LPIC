#!/usr/bin/env python3
"""
Coursero - Correction Script
Executes student code in a sandboxed environment (Firejail) and compares outputs.
"""

import subprocess
import os
import sys
import json
import tempfile
import shutil
from pathlib import Path
from typing import Tuple, List, Dict
import time

# Configuration
TIMEOUT_SECONDS = 10  # Max execution time per test
MAX_OUTPUT_SIZE = 10000  # Max output size in bytes
EXERCISES_DIR = "/var/www/coursero/exercises"


class CorrectionResult:
    def __init__(self):
        self.tests_passed = 0
        self.tests_total = 0
        self.percentage = 0.0
        self.details = []
        self.error = None

    def to_dict(self) -> dict:
        return {
            "tests_passed": self.tests_passed,
            "tests_total": self.tests_total,
            "percentage": self.percentage,
            "details": self.details,
            "error": self.error
        }


def get_firejail_command(language: str, file_path: str, args: List[str]) -> List[str]:
    """
    Build the Firejail command for sandboxed execution.
    Security restrictions:
    - No network access
    - Read-only filesystem except /tmp
    - Limited resources
    - No access to home directory
    """
    firejail_opts = [
        "firejail",
        "--quiet",
        "--net=none",              # No network
        "--noroot",                # No root privileges  
        "--private",               # New /home and /root
        "--private-tmp",           # New /tmp
        "--private-dev",           # Minimal /dev
        "--nogroups",              # No supplementary groups
        "--nosound",               # No sound
        "--no3d",                  # No 3D acceleration
        "--nodvd",                 # No DVD/CD
        "--notv",                  # No TV devices
        "--novideo",               # No video devices
        "--seccomp",               # Seccomp filter
        "--caps.drop=all",         # Drop all capabilities
        f"--rlimit-cpu={TIMEOUT_SECONDS}",  # CPU limit
        "--rlimit-fsize=1048576",  # 1MB max file size
        "--rlimit-nofile=64",      # Max open files
        "--rlimit-nproc=16",       # Max processes
        "--rlimit-as=268435456",   # 256MB address space
    ]
    
    if language == "python":
        cmd = firejail_opts + ["python3", file_path] + args
    elif language == "c":
        cmd = firejail_opts + [file_path] + args
    else:
        raise ValueError(f"Unsupported language: {language}")
    
    return cmd


def compile_c_code(source_path: str, output_path: str) -> Tuple[bool, str]:
    """Compile C source code with security restrictions."""
    compile_cmd = [
        "gcc",
        "-o", output_path,
        "-Wall", "-Wextra",
        "-std=c11", "-O2",
        "-fstack-protector-strong",
        "-D_FORTIFY_SOURCE=2",
        source_path
    ]
    
    try:
        result = subprocess.run(
            compile_cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            return False, f"Compilation error:\n{result.stderr}"
        return True, ""
    except subprocess.TimeoutExpired:
        return False, "Compilation timeout"
    except Exception as e:
        return False, f"Compilation failed: {str(e)}"


def run_test(executable: str, language: str, args: List[str], 
             expected_output: str, test_name: str) -> Dict:
    """Run a single test case and compare output."""
    result = {
        "name": test_name,
        "passed": False,
        "expected": expected_output.strip(),
        "actual": "",
        "error": None
    }
    
    try:
        cmd = get_firejail_command(language, executable, args)
        
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS
        )
        
        actual_output = proc.stdout.strip()
        
        if len(actual_output) > MAX_OUTPUT_SIZE:
            actual_output = actual_output[:MAX_OUTPUT_SIZE] + "\n[OUTPUT TRUNCATED]"
        
        result["actual"] = actual_output
        
        # Compare outputs (normalize whitespace)
        expected_normalized = " ".join(expected_output.split())
        actual_normalized = " ".join(actual_output.split())
        
        if expected_normalized == actual_normalized:
            result["passed"] = True
        else:
            result["error"] = "Output mismatch"
            
        if proc.returncode != 0 and proc.stderr:
            result["error"] = f"Runtime error (exit {proc.returncode}): {proc.stderr[:500]}"
            
    except subprocess.TimeoutExpired:
        result["error"] = f"Timeout: execution exceeded {TIMEOUT_SECONDS} seconds"
    except Exception as e:
        result["error"] = f"Execution error: {str(e)}"
    
    return result


def load_test_cases(exercise_id: str, course_id: str) -> List[Dict]:
    """Load test cases from exercises/<course_id>/<exercise_id>/tests.json"""
    tests_file = Path(EXERCISES_DIR) / course_id / exercise_id / "tests.json"
    
    if not tests_file.exists():
        raise FileNotFoundError(f"Test cases not found: {tests_file}")
    
    with open(tests_file, "r") as f:
        config = json.load(f)
    
    return config.get("tests", [])


def correct_submission(submission_path: str, language: str, 
                       exercise_id: str, course_id: str) -> CorrectionResult:
    """Main correction function."""
    result = CorrectionResult()
    
    if not os.path.exists(submission_path):
        result.error = "Submission file not found"
        return result
    
    if language not in ["python", "c"]:
        result.error = f"Unsupported language: {language}"
        return result
    
    with tempfile.TemporaryDirectory(prefix="coursero_") as tmpdir:
        try:
            if language == "python":
                exec_path = os.path.join(tmpdir, "submission.py")
                shutil.copy(submission_path, exec_path)
            elif language == "c":
                source_path = os.path.join(tmpdir, "submission.c")
                exec_path = os.path.join(tmpdir, "submission")
                shutil.copy(submission_path, source_path)
                
                success, error = compile_c_code(source_path, exec_path)
                if not success:
                    result.error = error
                    return result
            
            try:
                test_cases = load_test_cases(exercise_id, course_id)
            except FileNotFoundError as e:
                result.error = str(e)
                return result
            
            result.tests_total = len(test_cases)
            
            for i, test in enumerate(test_cases):
                test_name = test.get("name", f"Test {i+1}")
                args = test.get("args", [])
                expected = test.get("expected_output", "")
                
                test_result = run_test(exec_path, language, args, expected, test_name)
                result.details.append(test_result)
                
                if test_result["passed"]:
                    result.tests_passed += 1
            
            if result.tests_total > 0:
                result.percentage = round(
                    (result.tests_passed / result.tests_total) * 100, 2
                )
            
        except Exception as e:
            result.error = f"Correction error: {str(e)}"
    
    return result


def main():
    """CLI: python correction.py <submission_path> <language> <exercise_id> <course_id>"""
    if len(sys.argv) != 5:
        print("Usage: python correction.py <submission_path> <language> <exercise_id> <course_id>")
        sys.exit(1)
    
    submission_path = sys.argv[1]
    language = sys.argv[2].lower()
    exercise_id = sys.argv[3]
    course_id = sys.argv[4]
    
    result = correct_submission(submission_path, language, exercise_id, course_id)
    print(json.dumps(result.to_dict(), indent=2))
    sys.exit(0 if result.error is None else 1)


if __name__ == "__main__":
    main()
