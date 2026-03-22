import React, { useState, useEffect, useRef } from "react";
import Image from "./composants/image";
import Axios from "axios";

function Devoir() {

    return (
        <>
            <h2>Projet Docker n°3</h2>
            <main>
                Dans ce projet, il est demandé de réaliser des conteneurs dans docker grâce à un docker compose pour créer une solution plus simple que celle actuellement présente dans une entreprise: elle utilise des machines virtuelles et souhaite passer sur des méthodes plus actuelles, plus performantes et plus scallable. Reprenez le sujet de l'entreprise disponible ici : <a href="">https://entreprise.com/doc/it.pdf</a>
                <br />
                <br />
                <span>
                Date limite du rendu: <strong>30/04/2026</strong>
                </span>
                <div className="">
                    <input type="radio" name="langage" id="python" />
                    <label htmlFor="python"><Image icon="python.png" size="75px" /> </label>
                    <input type="radio" name="langage" id="c" />
                    <label htmlFor="c"><Image icon="c.png" size="75px" /> </label>
                </div>
                <input type="file" name="" id="" />
            </main>
        </>
    );
}

export default Devoir;