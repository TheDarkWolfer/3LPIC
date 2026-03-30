import { useContext, useEffect } from "react";
import { MailContext } from "./mail";
import { useNavigate } from "react-router";

function Deconnexion() {
    const { setMail } = useContext(MailContext);
    const navigate = useNavigate();

    useEffect(() => {
        // Disconnect the user
        setMail("");
        // Redirect to login page
        navigate("/connecte");
    }, [setMail, navigate]);

    return (
        <>
            <h1>Déconnexion en cours...</h1>
        </>
    );
}

export default Deconnexion;