"use client";
import { useState, useRef, useEffect, useCallback } from "react";

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [recordingError, setRecordingError] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const mounted = useRef(false);
  const generation = useRef(0);
  const starting = useRef(false);
  const release = useCallback(() => {
    if (recorder.current) {
      recorder.current.ondataavailable = null;
      recorder.current.onstop = null;
      if (recorder.current.state !== "inactive") recorder.current.stop();
      recorder.current = null;
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    chunks.current = [];
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      starting.current = false;
      release();
    };
  }, [release]);

  const startRecording = async () => {
    if (starting.current || recorder.current?.state === "recording") return;
    const attempt = ++generation.current;
    starting.current = true;
    setIsStarting(true);
    setRecordingError(false);
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!mounted.current || generation.current !== attempt) {
        acquired.getTracks().forEach((track) => track.stop());
        return;
      }
      release();
      stream.current = acquired;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const active = new MediaRecorder(
        acquired,
        mimeType ? { mimeType } : undefined,
      );
      recorder.current = active;
      active.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      active.onstop = () => {
        acquired.getTracks().forEach((track) => track.stop());
        if (stream.current === acquired) stream.current = null;
        if (mounted.current && generation.current === attempt) {
          setAudioBlob(
            new Blob(chunks.current, {
              type: active.mimeType || chunks.current[0]?.type || "audio/webm",
            }),
          );
          setIsRecording(false);
        }
      };
      active.start();
      setAudioBlob(null);
      setIsRecording(true);
    } catch {
      if (mounted.current && generation.current === attempt) {
        release();
        setRecordingError(true);
      }
    } finally {
      if (mounted.current && generation.current === attempt) {
        starting.current = false;
        setIsStarting(false);
      }
    }
  };
  const stopRecording = () => {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
    }
  };
  const resetRecording = () => {
    generation.current++;
    starting.current = false;
    release();
    setAudioBlob(null);
    setIsRecording(false);
    setIsStarting(false);
    setRecordingError(false);
  };
  return {
    isRecording,
    isStarting,
    recordingError,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
