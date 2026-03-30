import Image from "./image";

interface DevoirProps {
    exercise: {
        _id: string;
        course_id: string;
        exercise_id: string;
        title: string;
        description: string;
        languages: string[];
        deadline: string;
    };
    courseId?: string;
    score?: number;
    submitted?: boolean;
}

function Devoir({ exercise, courseId, score, submitted }: DevoirProps) {
    const deadlineDate = new Date(exercise.deadline);
    const isOverdue = new Date() > deadlineDate;
    const daysLeft = Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return (
        <a href={`/devoir/${exercise._id}`} className="devoir">
            <Image icon="dumbbell.png" size="35px" />
            <strong>{exercise.title}</strong>
            <p style={{ fontSize: '0.9em', color: '#666' }}>{exercise.description}</p>
            <div>
                <Image icon="percent.png" size="20px" />
                <span><int>{score !== undefined ? score : '-'}</int>% de réussite</span>
            </div>
            <div>
                <Image icon="clock-fading.png" size="20px" />
                <span>
                    Date de rendu: <int>{deadlineDate.toLocaleDateString('fr-FR')}
                        {isOverdue ? ' (DÉPASSÉE)' : daysLeft <= 3 ? ` (dans ${daysLeft} j)` : ''}
                    </int>
                </span>
            </div>
            <div style={{ fontSize: '0.85em', marginTop: '8px' }}>
                <span>Langages: {exercise.languages.join(', ')}</span>
                {submitted && <span style={{ marginLeft: '10px', color: '#4CAF50' }}>✓ Soumis</span>}
            </div>
        </a>
    );
}

export default Devoir;