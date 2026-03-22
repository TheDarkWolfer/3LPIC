import Image from "./image";

function Cours({ cours }) {
    return (
        <a href={"/cours/" + cours } className="cours">
            <Image icon="book-type.png" size="35px" />
            <strong>{cours}</strong>
            <div>
                <Image icon="list-todo.png" size="20px" />
                <span><int>{cours - 1}/{cours}</int> terminé(s)</span>
            </div>
            <div>
                <Image icon="percent.png" size="20px" />
                <span><int>{(cours - 1) / 10 * 100 + "%"}</int> de réussite moyenne</span>
            </div>
            <div>
                <Image icon="clock-fading.png" size="20px" />
                <span>Prochain rendu dans: <int>{10 - cours  + ' jours'}</int></span>
            </div>
        </a>
    );
}

export default Cours;