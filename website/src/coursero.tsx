import React, { useState, useEffect } from "react";
import Axios from "axios";
import Cours from "./composants/cours";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:27017";

interface Course {
    _id: string;
    name: string;
    description: string;
}

function Coursero() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const response = await Axios.get(`${API_URL}/api/courses`);
                setCourses(response.data);
                setError(null);
            } catch (err) {
                setError('Erreur lors du chargement des cours');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    if (loading) {
        return (
            <>
                <h2>Tous les cours</h2>
                <main className="grid">
                    <p>Chargement des cours...</p>
                </main>
            </>
        );
    }

    if (error) {
        return (
            <>
                <h2>Tous les cours</h2>
                <main className="grid">
                    <p style={{ color: 'red' }}>{error}</p>
                </main>
            </>
        );
    }

    return (
        <>
            <h2>Tous les cours</h2>
            <main className="grid">
                {courses.map((course) => (
                    <Cours
                        key={course._id}
                        course={course}
                        completedCount={0}
                        totalCount={5}
                        averageScore={0}
                    />
                ))}
            </main>
        </>
    );
}

export default Coursero;