import React, { useState, useEffect, useRef } from "react";
import Axios from "axios";
import Devoir from "./composants/devoir";

function Devoirs() {

    return (
            <>
                <h1>Cours de </h1>
                <h2>Devoirs à rendre</h2>
                <main className="grid">
                    <Devoir devoir="devoir"/>
                    <Devoir devoir="devoir"/>
                    <Devoir devoir="devoir"/>
                </main>
                <h2>Devoirs rendus</h2>
                <main className="grid">
                    <Devoir devoir="devoir"/>
                    <Devoir devoir="devoir"/>
                    <Devoir devoir="devoir"/>
                    <Devoir devoir="devoir"/>
                    <Devoir devoir="devoir"/>
                    <Devoir devoir="devoir"/>
                </main>
            </>
    );
}

export default Devoirs;