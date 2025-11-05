'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button, Progress } from '@heroui/react';

interface CustomAudioPlayerProps {
    src: string;
    className?: string;
}

export function CustomAudioPlayer({ src, className }: CustomAudioPlayerProps) {
    // --- Refs ---
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    // --- State ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);

    // --- Effects ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Event listeners
        const setAudioData = () => setDuration(audio.duration);
        const setAudioTime = () => setCurrentTime(audio.currentTime);
        const handleAudioEnd = () => setIsPlaying(false);

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleAudioEnd);

        // Cleanup
        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleAudioEnd);
        };
    }, []);

    // --- Handlers ---
    const togglePlayPause = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        setVolume(newVolume);
    };

    const handleMute = () => {

        if (audioRef.current) {
            audioRef.current.volume = volume === 0 ? 1 : 0;
            setVolume(volume === 0 ? 1 : 0)
        }

    }

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !audioRef.current) return;

        const progressBar = progressRef.current;
        const clickPosition = e.clientX - progressBar.getBoundingClientRect().left;
        const barWidth = progressBar.clientWidth;
        const seekTime = (clickPosition / barWidth) * duration;

        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };


    // --- Helpers ---
    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // --- Renders ---
    const progressPercentage = (currentTime / duration) * 100 || 0;
    const VolumeIcon = volume === 0 ? VolumeX : Volume2;

    return (
        <div
            className={cn(
                'flex w-full items-center gap-2 rounded-lg bg-background/10',
                className,
            )}
        >
            {/* Hidden Audio Element */}
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause Button */}
            <Button
                size='sm'
                isIconOnly
                onPress={togglePlayPause}
                className="flex-shrink-0 bg-transparent"
            >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </Button>


            <div className="flex w-full items-center gap-1 sm:gap-2">
                <span className="w-10 text-xs font-light text-muted-foreground">
                    {formatTime(currentTime)}
                </span>
                {/* 
   
                {/* Progress Bar */}
                <Progress ref={progressRef} onClick={handleSeek} value={progressPercentage} color='primary' classNames={{
                    track: "bg-primary/20"
                }} />
                <span className="w-10 text-xs font-light text-muted-foreground">
                    {formatTime(duration)}
                </span>
            </div>

            {/* Volume Controls */}
            <div className="hidden sm:flex items-center gap-2 ">
                <Button size={"sm"} isIconOnly className='bg-transparent' onPress={handleMute}>
                    <VolumeIcon size={20} className="text-muted-foreground" />
                </Button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    // Custom styling for the range input
                    className="h-1.5 w-10 sm:w-20 cursor-pointer appearance-none rounded-full
                    bg-linear-to-r
                    from-primary/10
                    to-primary/100
                    [&::-webkit-slider-thumb]:h-3.5
                    [&::-webkit-slider-thumb]:w-3.5
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-primary
                    [&::-webkit-slider-container]:appearance-none
                    [&::-webkit-slider-runnable-track]:appearance-none
                    [&::-moz-range-thumb]:h-3.5
                    [&::-moz-range-thumb]:w-3.5
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-none
                    [&::-moz-range-thumb]:bg-primary
                    [&::-moz-range-progress]:bg-primary/80
                    [&::-moz-range-track]:bg-primary/20
                    "
                />
            </div>
        </div>
    );
}