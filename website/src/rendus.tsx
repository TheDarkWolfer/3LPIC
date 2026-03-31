import React, { useState, useEffect, useContext } from "react";
import Axios from "axios";
import { MailContext } from "./mail";
import Devoir from "./composants/devoir";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:27017";

interface Submission {
    _id: string;
    course_id: string;
    exercise_id: string;
    status: string;
    grade: number | null;
    submitted_at: string;
}

interface Exercise {
    _id: string;
    course_id: string;
    exercise_id: string;
    title: string;
    description: string;
    languages: string[];
    deadline: string;
}

function Rendus() {
    const mail = useContext(MailContext);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [exercises, setExercises] = useState<Map<string, Exercise>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!mail) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Fetch user submissions
                const submissionsResponse = await Axios.get(`${API_URL}/api/users/${encodeURIComponent(mail)}/submissions`);
                setSubmissions(submissionsResponse.data);

                // Fetch all courses and exercises to map submission data
                const coursesResponse = await Axios.get(`${API_URL}/api/courses`);
                const courses = coursesResponse.data;

                const exercisesMap = new Map<string, Exercise>();

                for (const course of courses) {
                    const exercisesResponse = await Axios.get(`${API_URL}/api/courses/${course._id}/exercises`);
                    exercisesResponse.data.forEach((ex: Exercise) => {
                        exercisesMap.set(ex._id, ex);
                    });
                }

                setExercises(exercisesMap);
                setError(null);
            } catch (err) {
                console.error(err);
                setError('Erreur lors du chargement des données');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [mail]);

    if (!mail) {
        return (
            <>
                <h2>Mes rendus</h2>
                <p>Veuillez vous connecter pour voir vos rendus.</p>
            </>
        );
    }

    if (loading) {
        return (
            <>
                <h2>Mes rendus</h2>
                <p>Chargement...</p>
            </>
        );
    }

    if (error) {
        return (
            <>
                <h2>Mes rendus</h2>
                <main className="grid">
                    <p style={{ color: 'red' }}>{error}</p>
                </main>
            </>
        );
    }

    // Group submissions by status
    const submittedSubmissions = submissions.filter(s => s.status === 'completed');
    const pendingSubmissions = submissions.filter(s => ['pending', 'processing'].includes(s.status));

    return (
        <>
            <h2>Mes devoirs rendus</h2>
            <main className="grid">
                {submittedSubmissions.length > 0 ? (
                    submittedSubmissions.map((submission) => {
                        const exercise = exercises.get(
                            `${submission.course_id}-${submission.exercise_id}`
                        ) || exercises.get(`${submission.course_id}-ex${submission.exercise_id.replace('ex', '')}`);

                        if (!exercise) return null;

                        return (
                            <Devoir
                                key={submission._id}
                                exercise={exercise}
                                courseId={submission.course_id}
                                score={submission.grade}
                                submitted={true}
                            />
                        );
                    })
                ) : (
                    <p>Aucun devoir rendu</p>
                )}
            </main>

            <h2>Devoirs en attente de correction</h2>
            <main className="grid">
                {pendingSubmissions.length > 0 ? (
                    pendingSubmissions.map((submission) => {
                        const exercise = exercises.get(
                            `${submission.course_id}-${submission.exercise_id}`
                        ) || exercises.get(`${submission.course_id}-ex${submission.exercise_id.replace('ex', '')}`);

                        if (!exercise) return null;

                        return (
                            <Devoir
                                key={submission._id}
                                exercise={exercise}
                                courseId={submission.course_id}
                                submitted={true}
                            />
                        );
                    })
                ) : (
                    <p>Aucun devoir en attente</p>
                )}
            </main>
        </>
    );
}

export default Rendus;