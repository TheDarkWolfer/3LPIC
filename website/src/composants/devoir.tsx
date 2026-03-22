import Image from "./image";

function Devoir({ devoir }) {
    return (
        <a href={"/devoir/" + devoir} className="devoir">
            <Image icon="dumbbell.png" size="35px" />
            <strong>{devoir}</strong>
            <div>
                <Image icon="percent.png" size="20px" />
                <span><int>{devoir}</int> de réussite</span>
            </div>
            <div>
                <Image icon="clock-fading.png" size="20px" />
                <span>Date de rendu:  <int>{devoir}</int></span>
            </div>
        </a>
    );
}

export default Devoir;