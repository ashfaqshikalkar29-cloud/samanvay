import { SupportedLanguage, TranslationResult } from "./types";

export interface TranslationService {
  translate(text: string, targetLanguage: SupportedLanguage): Promise<TranslationResult>;
  detectLanguage(text: string): { language: SupportedLanguage; script: string };
}

// In-memory translation cache (Key: `${sourceLang}:${targetLang}:${hash}`)
const translationCache = new Map<string, TranslationResult>();

// High-frequency grievance vocabulary across Indian languages for accurate domain translations
const GRIEVANCE_LEXICON: Record<string, Record<SupportedLanguage, string>> = {
  complaint: { en: "complaint", hi: "शिकायत", mr: "तक्रार", ta: "புகார்", bn: "অভিযোগ", te: "ఫిర్యాదు" },
  refund: { en: "refund", hi: "वापसी (रिफंड)", mr: "परतावा", ta: "திருப்பிச் செலுத்துதல்", bn: "ফেরত", te: "రీఫండ్" },
  fees: { en: "fees", hi: "शुल्क", mr: "फी", ta: "கட்டணம்", bn: "ফি", te: "ఫీజు" },
  documents: { en: "original documents", hi: "मूल दस्तावेज", mr: "मूळ कागदपत्रे", ta: "அசல் ஆவணங்கள்", bn: "মূল নথি", te: "అసలు పత్రాలు" },
  ragging: { en: "ragging", hi: "रैगिंग (उत्पीड़न)", mr: "रॅगिंग", ta: "ராகிங்", bn: "র‌্যাগিং", te: "ర్యాగింగ్" },
  faculty: { en: "faculty / teacher", hi: "प्राध्यापक / शिक्षक", mr: "प्राध्यापक", ta: "பேராசிரியர்", bn: "অনুষদ / শিক্ষক", te: "అధ్యాపకులు" },
  salary: { en: "salary", hi: "वेतन", mr: "पगार", ta: "சம்பளம்", bn: "বেতন", te: "జీతం" },
  institution: { en: "institution / college", hi: "संस्थान / महाविद्यालय", mr: "संस्था / कॉलेज", ta: "நிறுவனம் / கல்லூரி", bn: "প্রতিষ্ঠান / কলেজ", te: "సంస్థ / కళాశాల" },
  approval: { en: "AICTE approval", hi: "एआईसीटीई अनुमोदन", mr: "एआयसीटीई मान्यता", ta: "ஏஐசிடிஇ ஒப்புதல்", bn: "এআইসিটিই অনুমোদন", te: "ఏఐసీటీఈ ఆమోదం" },
  hostel: { en: "hostel facility", hi: "छात्रावास सुविधा", mr: "वसतिगृह सुविधा", ta: "விடுதி வசதி", bn: "ছাত্রাবাস সুবিধা", te: "హాస్టల్ వసతి" },
};

export class DomainTranslationService implements TranslationService {
  detectLanguage(text: string): { language: SupportedLanguage; script: string } {
    if (!text) return { language: "en", script: "Latin" };

    // Test Devanagari range
    if (/[\u0900-\u097F]/.test(text)) {
      // Check for distinct Marathi markers (e.g. ळ \u0933)
      if (/\u0933/.test(text) || /\b(आहे|झाले|केले|नाही)\b/.test(text)) {
        return { language: "mr", script: "Devanagari (Marathi)" };
      }
      return { language: "hi", script: "Devanagari (Hindi)" };
    }

    // Tamil range
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return { language: "ta", script: "Tamil" };
    }

    // Bengali range
    if (/[\u0980-\u09FF]/.test(text)) {
      return { language: "bn", script: "Bengali" };
    }

    // Telugu range
    if (/[\u0C00-\u0C7F]/.test(text)) {
      return { language: "te", script: "Telugu" };
    }

    return { language: "en", script: "Latin (English)" };
  }

  async translate(text: string, targetLanguage: SupportedLanguage): Promise<TranslationResult> {
    const { language: sourceLanguage, script: detectedScript } = this.detectLanguage(text);

    // If source and target are the same, return as is
    if (sourceLanguage === targetLanguage) {
      return {
        original_text: text,
        translated_text: text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        detected_script: detectedScript,
        cached: false,
      };
    }

    // Cache lookup
    const cacheKey = `${sourceLanguage}:${targetLanguage}:${text.slice(0, 60)}:${text.length}`;
    if (translationCache.has(cacheKey)) {
      const cached = translationCache.get(cacheKey)!;
      return { ...cached, cached: true };
    }

    // Translation logic:
    // If translating from Regional to English
    let translated = "";
    if (targetLanguage === "en") {
      translated = `[AI Translated from ${detectedScript}]: ${text}`;
      // Perform domain term replacements for clarity
      for (const [key, transMap] of Object.entries(GRIEVANCE_LEXICON)) {
        const regionalWord = transMap[sourceLanguage];
        if (regionalWord && text.includes(regionalWord)) {
          translated = translated.replaceAll(regionalWord, `[${transMap.en}]`);
        }
      }
    } else {
      // Translating from English to Regional Language (e.g. Hindi, Tamil, Marathi)
      const prefix = {
        hi: "[अनुवादित विवरण]",
        mr: "[भाषांतरित तपशील]",
        ta: "[மொழிபெயர்க்கப்பட்ட விவரம்]",
        bn: "[অনুবাদিত বিবরণ]",
        te: "[అనువదించబడిన వివరాలు]",
      }[targetLanguage] || "[Translated]";

      translated = `${prefix}: ${text}`;
      for (const [key, transMap] of Object.entries(GRIEVANCE_LEXICON)) {
        const engWord = transMap.en;
        const targetWord = transMap[targetLanguage];
        if (targetWord) {
          const re = new RegExp(`\\b${engWord}\\b`, "gi");
          translated = translated.replace(re, targetWord);
        }
      }
    }

    const result: TranslationResult = {
      original_text: text,
      translated_text: translated,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      detected_script: detectedScript,
      cached: false,
    };

    translationCache.set(cacheKey, result);
    return result;
  }
}

export const defaultTranslator = new DomainTranslationService();
