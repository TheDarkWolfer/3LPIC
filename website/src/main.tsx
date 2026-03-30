import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { MailContext } from './mail'

function AppWithMailContext() {
    const [mail, setMail] = useState<string>(() => {
        // Try to load mail from localStorage
        return localStorage.getItem('userEmail') || '';
    });

    // Save mail to localStorage whenever it changes
    const handleMailChange = (newMail: string) => {
        setMail(newMail);
        if (newMail) {
            localStorage.setItem('userEmail', newMail);
        } else {
            localStorage.removeItem('userEmail');
        }
    };

    return (
        <MailContext.Provider value={{ mail, setMail: handleMailChange }}>
            <App />
        </MailContext.Provider>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppWithMailContext />
    </StrictMode>,
)