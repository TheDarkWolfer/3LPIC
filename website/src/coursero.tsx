import React, { useState, useEffect, useRef } from "react";
import Axios from "axios";
import Cours from "./composants/cours";

function Devoirs() {

    return (
        <>
            <h2>Tous les cours</h2>
            <main className="grid">
                <Cours cours="Docker" />
                <Cours cours="React" />
                <Cours cours="C#" />
                <Cours cours="Python" />
                <Cours cours="Linux" />
                <Cours cours="" />
                <Cours cours="7" />
                <Cours cours="9" />
                <Cours cours="10" />
            </main>
        </>
    );
}

export default Devoirs;