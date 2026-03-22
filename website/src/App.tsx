import { BrowserRouter as Router, Routes, Route } from 'react-router'
import { useContext } from 'react';
import { MailContext } from './mail';
import Coursero from './coursero';
import Cours from './cours';
import Devoir from './devoir';
import Rendus from './rendus';
import Connecte from './connecte';
import Deconnexion from './deconnexion';

export default function App() {

    const mail = useContext(MailContext);

    if (mail) {
        return (
            <>
                <Router>
                    <Routes>
                        <Route path="*" element={<Connecte />} />;
                        </Routes>
                </Router>
            </>
        );
    }

    const header = (
        <>
            <header>
                <div>
                    <a href="/">Cours</a>
                    <a href="/rendus">Rendus</a>
                </div>
                {mail ? 
                <span>Compte<div> {mail} <div className='sep'></div><a href='/deconnexion'>Se deconnecter</a></div></span> : 
                <a href='/connecte'>Se connecter</a>
                }
            </header>
        </>
    );
    
    return (
        <>
            {header}
            <Router>
                <Routes>
                    <Route path="/" element={<Coursero />} />
                    <Route path="/cours/:coursId" element={<Cours />} />
                    <Route path="/devoir/:devoirId" element={<Devoir />} />
                    <Route path="/rendus" element={<Rendus />} />
                    <Route path="/connecte" element={<Connecte />} />;
                    <Route path="/deconnexion" element={<Deconnexion />} />
                </Routes>
            </Router>
        </>
  )
}