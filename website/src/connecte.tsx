import { useContext, useState } from "react";
import { MailContext } from "./mail";
import { useNavigate } from "react-router";

function Connecte() {
    const { setMail } = useContext(MailContext);
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError("Veuillez entrer une adresse e-mail");
            return;
        }

        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Veuillez entrer une adresse e-mail valide");
            return;
        }

        setMail(email);
        setError("");
        navigate("/");
    };

    return (
        <>
            <h1>Identifiez vous avec votre adresse mail</h1>
            <main className="connecte">
                <div>
                    <h2>Coursero</h2>
                    <span>Connectez vous simplement avec votre adresse mail pour acceder à exercices ainsi qu'à vos résultats</span>
                </div>
                <form onSubmit={handleConnect}>
                    <input
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                        }}
                    />
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <button type="submit">Se connecter</button>
                </form>
            </main>
        </>
    );
}

export default Connecte;