import { LANGUAGES, LANGUAGES_CUSTOM } from "./Languages.js";
import axios from "axios";

const AZURE_API_KEY = "a0108c17e18a45d0b8c7b1e38fd984cd";
const AZURE_REGION = "centralindia";

function getVoice(lang, gender) {
  const language = LANGUAGES.find((l) => l.LANGUAGE === lang && l.G);
  if (!language) return null;
  return gender === "female" ? language.FEMALECODE : language.MALECODE;
}

async function TextToSpeechAzure(text, lang, gender) {
  const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const headers = {
    "Ocp-Apim-Subscription-Key": AZURE_API_KEY,
    "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
  };

  const voice = getVoice(lang, gender);
  const body = { text, voice, format: "audio-16khz-32kbitrate-mono-mp3" };

  try {
    const response = await axios.post(url, body, { headers });
    if (response.status === 200) return response.data;

    console.error(
      "Failed to convert text to speech:",
      response.status,
      response.data
    );

    return null;
  } catch (error) {
    console.error("An error occurred:", error.message);
    return null;
  }
}

async function TextToSpeechCustom(text, lang, gender) {
  // http://indiantts.futurixai.com/
  const url = "http://indiantts.futurixai.com/";
  const headers = { "Content-Type": "application/json" };
}
export default TextToSpeechAzure;
