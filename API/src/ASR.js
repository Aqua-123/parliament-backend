import { LANGUAGES, LANGUAGES_CUSTOM } from "./Languages.js";
import axios from "axios";

const AZURE_API_KEY = "a0108c17e18a45d0b8c7b1e38fd984cd";
const AZURE_REGION = "centralindia";

async function SpeechToText(audio, language) {
  console.log(audio);
  console.log(language);
  const url = `https://${AZURE_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
  const headers = {
    "Ocp-Apim-Subscription-Key": AZURE_API_KEY,
    "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
  };

  const params = {
    language: language,
  };

  try {
    const response = await axios.post(url, audio, { params, headers });
    if (response.status === 200) {
      return response.data.DisplayText;
    } else {
      console.error(
        "Failed to convert speech to text:",
        response.status,
        response.data
      );
      return null;
    }
  } catch (error) {
    console.error("An error occurred:", error.message);
    return null;
  }
}

export default SpeechToText;
