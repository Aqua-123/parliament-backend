import axios from "axios";
import { v4 } from "uuid";
import { LANGUAGES, LANGUAGES_CUSTOM } from "./Languages.js";

const AZURE_T2T_KEY = "7f2623d635f944d7969e462d54f8c5cc";
const AZURE_REGION = "centralindia";

async function TranslateTextAzure(text, targetLang) {
  console.log(text, targetLang);
  const url = `https://api.cognitive.microsofttranslator.com/translate`;
  const params = { "api-version": "3.0", to: targetLang, textType: "html" };
  const headers = {
    "Ocp-Apim-Subscription-Key": AZURE_T2T_KEY,
    "Ocp-Apim-Subscription-Region": AZURE_REGION,
    "Content-type": "application/json",
    "X-ClientTraceId": v4().toString(),
  };
  const body = [{ text: text }];

  try {
    const response = await axios.post(url, body, { params, headers });
    console.log(response.status_code);
    try {
      console.log(response.data[0]["translations"][0]["text"]);
      return response.data[0]["translations"][0]["text"];
    } catch (error) {
      console.error("An error occurred:", error.message);
      return null;
    }
  } catch (error) {
    console.error("An error occurred:", error.message);
    return null;
  }
}

export default TranslateTextAzure;
