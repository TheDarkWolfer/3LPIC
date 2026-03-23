import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams } from "react-router";
import Image from "./composants/image";
import { MailContext } from "./mail";
import Axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

type SubmissionStatus = "not_submitted" | "pending" | "processing" | "completed" | "failed";

interface SubmissionResult {
    status: SubmissionStatus;
    grade?: number;
    tests_passed?: number;
    tests_total?: number;
    details?: Array<{
        name: string;
        passed: boolean;
        expected: string;
        actual: string;
        error?: string;
    }>;
    error?: string;
}

function Devoir() {
    const { devoirId } = useParams();
    const mail = useContext(MailContext);
    
    const [language, setLanguage] = useState<"python" | "c">("python");
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [result, setResult] = useState<SubmissionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const pollIntervalRef = useRef<number | null>(null);

    // Poll for submission status
    useEffect(() => {
        if (!submissionId) return;
        
        const pollStatus = async () => {
            try {
                const response = await Axios.get(`${API_URL}/api/submissions/${submissionId}`);
                const data = response.data;
                
                setResult({
                    status: data.status,
                    grade: data.grade,
                    tests_passed: data.tests_passed,
                    tests_total: data.tests_total,
                    details: data.details,
                    error: data.error
                });
                
                // Stop polling if completed or failed
                if (data.status === "completed" || data.status === "failed") {
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                }
            } catch (err) {
                console.error("Error polling status:", err);
            }
        };
        
        pollStatus();
        pollIntervalRef.current = window.setInterval(pollStatus, 2000);
        
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [submissionId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!file) {
            setError("Veuillez sélectionner un fichier");
            return;
        }
        
        if (!mail) {
            setError("Veuillez vous connecter");
            return;
        }

        setSubmitting(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_email", mail);
        formData.append("course_id", "docker"); // TODO: dynamic
        formData.append("exercise_id", devoirId || "ex1");
        formData.append("language", language);

        try {
            const response = await Axios.post(`${API_URL}/api/submit`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            
            setSubmissionId(response.data.submission_id);
            setResult({ status: "pending" });
        } catch (err: any) {
            setError(err.response?.data?.error || "Erreur lors de la soumission");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = () => {
        if (!result) return null;
        
        const statusMap: Record<SubmissionStatus, { label: string; color: string }> = {
            not_submitted: { label: "Non soumis", color: "gray" },
            pending: { label: "En attente", color: "orange" },
            processing: { label: "En cours de correction", color: "blue" },
            completed: { label: "Corrigé", color: "green" },
            failed: { label: "Erreur", color: "red" }
        };
        
        const status = statusMap[result.status];
        return (
            <span className={`status-badge status-${status.color}`}>
                {status.label}
            </span>
        );
    };

    return (
        <>
            <h2>Projet Docker n°{devoirId?.replace("ex", "") || "1"}</h2>
            <main>
                <p>
                    Dans ce projet, il est demandé de réaliser des conteneurs dans docker grâce à un docker compose 
                    pour créer une solution plus simple que celle actuellement présente dans une entreprise.
                </p>
                <br />
                <span>Date limite du rendu: <strong>30/04/2026</strong></span>
                
                {/* Language selection */}
                <div className="language-select">
                    <h3>Langage de programmation</h3>
                    <input 
                        type="radio" 
                        name="langage" 
                        id="python" 
                        checked={language === "python"}
                        onChange={() => setLanguage("python")}
                    />
                    <label htmlFor="python"><Image icon="python.png" size="75px" /></label>
                    
                    <input 
                        type="radio" 
                        name="langage" 
                        id="c" 
                        checked={language === "c"}
                        onChange={() => setLanguage("c")}
                    />
                    <label htmlFor="c"><Image icon="c.png" size="75px" /></label>
                </div>
                
                {/* File upload */}
                <div className="file-upload">
                    <h3>Fichier à soumettre</h3>
                    <input 
                        type="file" 
                        accept={language === "python" ? ".py" : ".c"}
                        onChange={handleFileChange}
                    />
                    {file && <span className="filename">{file.name}</span>}
                </div>
                
                {/* Submit button */}
                <button 
                    onClick={handleSubmit} 
                    disabled={submitting || !file}
                    className="submit-btn"
                >
                    {submitting ? "Envoi en cours..." : "Soumettre"}
                </button>
                
                {/* Error display */}
                {error && <div className="error-message">{error}</div>}
                
                {/* Status display */}
                {result && (
                    <div className="submission-result">
                        <h3>Statut: {getStatusBadge()}</h3>
                        
                        {result.status === "completed" && (
                            <>
                                <div className="grade">
                                    <span className="grade-value">{result.grade}%</span>
                                    <span className="tests-info">
                                        ({result.tests_passed}/{result.tests_total} tests réussis)
                                    </span>
                                </div>
                                
                                {result.details && result.details.length > 0 && (
                                    <div className="test-details">
                                        <h4>Détail des tests</h4>
                                        {result.details.map((test, i) => (
                                            <div key={i} className={`test-item ${test.passed ? "passed" : "failed"}`}>
                                                <span className="test-name">{test.name}</span>
                                                <span className="test-status">
                                                    {test.passed ? "✓" : "✗"}
                                                </span>
                                                {!test.passed && (
                                                    <div className="test-error">
                                                        <div>Attendu: <code>{test.expected}</code></div>
                                                        <div>Obtenu: <code>{test.actual}</code></div>
                                                        {test.error && <div className="error">{test.error}</div>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                        
                        {result.status === "failed" && result.error && (
                            <div className="error-message">{result.error}</div>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}

export default Devoir;