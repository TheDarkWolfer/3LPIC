import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import Axios from "axios";
import Devoir from "./composants/devoir";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface Exercise {
    _id: string;
    course_id: string;
    exercise_id: string;
    title: string;
    description: string;
    languages: string[];
    deadline: string;
}

interface Course {
    _id: string;
    name: string;
    description: string;
}

function Cours() {
    const { coursId } = useParams<{ coursId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch course
                const courseResponse = await Axios.get(`${API_URL}/api/courses/${coursId}`);
                setCourse(courseResponse.data);

                // Fetch exercises
                const exercisesResponse = await Axios.get(`${API_URL}/api/courses/${coursId}/exercises`);
                setExercises(exercisesResponse.data);

                setError(null);
            } catch (err) {
                setError('Erreur lors du chargement des données');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (coursId) {
            fetchData();
        }
    }, [coursId]);

    if (loading) {
        return (
            <>
                <h1>Cours de...</h1>
                <p>Chargement...</p>
            </>
        );
    }

    if (error || !course) {
        return (
            <>
                <h1>Cours</h1>
                <p style={{ color: 'red' }}>{error || 'Cours non trouvé'}</p>
            </>
        );
    }

    // Separate exercises by deadline (future vs past)
    const now = new Date();
    const upcomingExercises = exercises.filter(e => new Date(e.deadline) > now);
    const submittedExercises = exercises.filter(e => new Date(e.deadline) <= now);

    return (
        <>
            <h1>Cours de {course.name}</h1>
            <p>{course.description}</p>

            <h2>Devoirs à rendre</h2>
            <main className="grid">
                {upcomingExercises.length > 0 ? (
                    upcomingExercises.map((exercise) => (
                        <Devoir
                            key={exercise._id}
                            exercise={exercise}
                            courseId={coursId}
                        />
                    ))
                ) : (
                    <p>Aucun devoir à rendre</p>
                )}
            </main>

            <h2>Devoirs rendus</h2>
            <main className="grid">
                {submittedExercises.length > 0 ? (
                    submittedExercises.map((exercise) => (
                        <Devoir
                            key={exercise._id}
                            exercise={exercise}
                            courseId={coursId}
                        />
                    ))
                ) : (
                    <p>Aucun devoir rendu</p>
                )}
            </main>
        </>
    );
}

export default Cours;