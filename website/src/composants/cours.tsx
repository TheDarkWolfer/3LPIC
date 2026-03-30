import Image from "./image";

interface CoursProps {
    course: {
        _id: string;
        name: string;
        description: string;
    };
    completedCount?: number;
    totalCount?: number;
    averageScore?: number;
    nextDeadline?: string;
}

function Cours({ course, completedCount = 0, totalCount = 0, averageScore = 0, nextDeadline }: CoursProps) {
    const deadlineText = nextDeadline
        ? new Date(nextDeadline).toLocaleDateString('fr-FR')
        : 'Pas de deadline';

    return (
        <a href={"/cours/" + course._id} className="cours">
            <Image icon="book-type.png" size="35px" />
            <strong>{course.name}</strong>
            <p style={{ fontSize: '0.9em', color: '#666' }}>{course.description}</p>
            <div>
                <Image icon="list-todo.png" size="20px" />
                <span><int>{completedCount}/{totalCount}</int> terminé(s)</span>
            </div>
            <div>
                <Image icon="percent.png" size="20px" />
                <span><int>{averageScore}%</int> de réussite moyenne</span>
            </div>
            <div>
                <Image icon="clock-fading.png" size="20px" />
                <span>Prochain rendu: <int>{deadlineText}</int></span>
            </div>
        </a>
    );
}

export default Cours;