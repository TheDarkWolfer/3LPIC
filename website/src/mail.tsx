import { createContext } from "react";

export interface MailContextType {
    mail: string;
    setMail: (mail: string) => void;
}

export const MailContext = createContext<MailContextType>({
    mail: '',
    setMail: () => { }
});