/**
 * Shared game utility functions
 */

/**
 * Formats seconds into MM:SS format
 * @param seconds - Total seconds to format
 * @returns Formatted time string (e.g., "1:05")
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Fisher-Yates shuffle algorithm for randomizing arrays
 * @param array - Array to shuffle
 * @returns New shuffled array (does not mutate original)
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Calculates accuracy percentage
 * @param correct - Number of correct answers
 * @param total - Total number of questions
 * @returns Accuracy as percentage (0-100)
 */
export function calculateAccuracy(correct: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
}

/**
 * Calculates score with speed bonus
 * @param isCorrect - Whether answer was correct
 * @param timeLeft - Time remaining when answered
 * @param maxTime - Maximum time allowed
 * @param streak - Current streak (for multiplier)
 * @returns Points earned
 */
export function calculateScore(
    isCorrect: boolean,
    timeLeft: number,
    maxTime: number,
    streak: number = 0
): number {
    if (!isCorrect) return 0;

    const basePoints = 100;
    const speedBonus = Math.round((timeLeft / maxTime) * 50);
    const streakMultiplier = Math.min(streak + 1, 5); // Max 5x multiplier

    return (basePoints + speedBonus) * streakMultiplier;
}
