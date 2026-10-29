"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SPEECH_LANGUAGES, type SpeechLanguage } from "@/lib/speech-languages";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceInput({ onTranscript, className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>("en-IN");
  const [supported, setSupported] = useState(true);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLang;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setInterimText(interim);
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition notice:", event.error);
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [selectedLang, onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText("");
    } else {
      try {
        recognitionRef.current.lang = selectedLang;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const currentLangObj = SPEECH_LANGUAGES.find((l) => l.code === selectedLang) || SPEECH_LANGUAGES[0];

  return (
    <div className={`flex flex-col gap-2 ${className || ""}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <Select value={selectedLang} onValueChange={(val) => {
            if (val) {
              setSelectedLang(val);
              if (isListening && recognitionRef.current) {
                recognitionRef.current.stop();
                setIsListening(false);
              }
            }
          }}>
            <SelectTrigger className="h-8 w-44 text-xs border-slate-300 bg-white">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {SPEECH_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="text-xs">
                  {lang.nativeName} ({lang.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mic Button */}
          {supported ? (
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="sm"
              onClick={toggleListening}
              className={`h-8 gap-1.5 text-xs font-medium transition-all ${
                isListening
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  : "border-slate-300 hover:bg-slate-100 text-slate-700"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="h-3.5 w-3.5" />
                  <span>Stop Dictation</span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5 text-red-600" />
                  <span>Speak Grievance</span>
                </>
              )}
            </Button>
          ) : (
            <span className="text-[11px] text-slate-400">
              (Voice input supported in Chrome / Edge)
            </span>
          )}
        </div>

        {/* Visual feedback */}
        {isListening && (
          <div className="flex items-center gap-2 text-xs font-medium text-red-600 animate-pulse">
            <span className="flex h-2 w-2 rounded-full bg-red-600" />
            <span>Listening in {currentLangObj.nativeName}...</span>
          </div>
        )}
      </div>

      {interimText && (
        <div className="rounded border border-red-200 bg-red-50/70 p-2 text-xs text-red-800 flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 shrink-0 text-red-600 animate-bounce" />
          <span className="italic">{interimText}</span>
        </div>
      )}
    </div>
  );
}
