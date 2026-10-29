export interface SpeechLanguage {
  code: string;
  name: string;
  nativeName: string;
  placeholder: string;
}

export const SPEECH_LANGUAGES: SpeechLanguage[] = [
  {
    code: "en-IN",
    name: "English (India)",
    nativeName: "English",
    placeholder: "Speak clearly into the microphone in English...",
  },
  {
    code: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    placeholder: "माइक में स्पष्ट रूप से हिन्दी में बोलें...",
  },
  {
    code: "mr-IN",
    name: "Marathi",
    nativeName: "मराठी",
    placeholder: "माईकमध्ये स्पष्टपणे मराठीत बोला...",
  },
  {
    code: "ta-IN",
    name: "Tamil",
    nativeName: "தமிழ்",
    placeholder: "மைக்ரோஃபோனில் தமிழில் தெளிவாகப் பேசுங்கள்...",
  },
  {
    code: "bn-IN",
    name: "Bengali",
    nativeName: "বাংলা",
    placeholder: "মাইক্রোফোনে বাংলায় পরিষ্কারভাবে বলুন...",
  },
];
