import { useState, useEffect } from "react";

export function useTypewriter(
    words: string[],
    {
        typingSpeed = 150,
        deletingSpeed = 100,
        pauseDuration = 2000,
    } = {}
) {
    const [text, setText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [wordIndex, setWordIndex] = useState(0);
    const [speed, setSpeed] = useState(typingSpeed);

    useEffect(() => {
        const handleTyping = () => {
            const currentWord = words[wordIndex % words.length];

            if (isDeleting) {
                setText(currentWord.substring(0, text.length - 1));
                setSpeed(deletingSpeed);
            } else {
                setText(currentWord.substring(0, text.length + 1));
                setSpeed(typingSpeed);
            }

            if (!isDeleting && text === currentWord) {
                setSpeed(pauseDuration);
                setIsDeleting(true);
            } else if (isDeleting && text === "") {
                setIsDeleting(false);
                setWordIndex((prev) => prev + 1);
                setSpeed(typingSpeed);
            }
        };

        const timer = setTimeout(handleTyping, speed);
        return () => clearTimeout(timer);
    }, [text, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseDuration, speed]);

    return text;
}
