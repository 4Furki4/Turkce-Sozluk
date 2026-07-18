import { cn } from "@/lib/utils";
import styles from "./arcade-cabinet.module.css";

interface ArcadeCabinetProps {
    kicker: string;
    word: string;
    meaning: string;
    points: string;
    className?: string;
}

/**
 * Shared visual anchor for the learning arcade. Game pages can reuse the
 * cabinet without duplicating the reference art direction.
 */
export function ArcadeCabinet({
    kicker,
    word,
    meaning,
    points,
    className,
}: ArcadeCabinetProps) {
    return (
        <div
            className={cn(
                styles.cabinet,
                className,
            )}
        >
            <div className={styles.orbitLarge} />
            <div className={styles.orbitSmall} />

            <div className={styles.header}>
                <p className={styles.brand}>Turkish Dictionary</p>
                <div className={styles.lights} aria-hidden="true">
                    <span className={`${styles.light} ${styles.mint}`} />
                    <span className={`${styles.light} ${styles.yellow}`} />
                    <span className={`${styles.light} ${styles.red}`} />
                </div>
            </div>

            <div className={styles.screen}>
                <div className={styles.scanlines} />
                <p className={styles.kicker}>
                    {kicker}
                </p>
                <p className={styles.word}>
                    {word}
                </p>
                <p className={styles.meaning}>
                    {meaning}
                </p>
                <span className={styles.points}>
                    {points}
                </span>
            </div>

            <div className={styles.controls} aria-hidden="true">
                <span className={styles.dpad} />
                <span className={styles.buttons}>
                    <i className={`${styles.button} ${styles.red}`} />
                    <i className={`${styles.button} ${styles.mint}`} />
                </span>
            </div>
        </div>
    );
}
