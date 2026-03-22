import Devoir from "./composants/devoir";

function Rendus() {
    return (
        <>
            <h2>Devoirs rendus</h2>
            <main className="grid">
                <Devoir devoir="devoir"/>
                <Devoir devoir="devoir"/>
                <Devoir devoir="devoir"/>
                <Devoir devoir="devoir"/>
                <Devoir devoir="devoir"/>
                <Devoir devoir="devoir"/>
                <Devoir devoir="devoir"/>
            </main>

            <h2>Devoirs à rendre</h2>
            <main className="grid">
                <Devoir devoir="devoir"/>
                <Devoir devoir="devoir"/>
                
            </main>
        </>
    );    
}

export default Rendus;