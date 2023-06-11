const { RemoteLanguageModel } = require("../controller/RemoteLanguageModel");
const { RemoteImageModel, SupportedImageModels } = require("../controller/RemoteImageModel");
const { RemoteSpeechModel } = require("../controller/RemoteSpeechModel");
const LanguageModelInput = require("../model/input/LanguageModelInput");
const ImageModelInput = require("../model/input/ImageModelInput");
const Text2SpeechInput = require("../model/input/Text2SpeechInput");
const { Chatbot, SupportedChatModels } = require("../function/Chatbot");
const { ChatGPTInput, ChatGPTMessage } = require("../model/input/ChatModelInput");
const { SupportedLangModels } = require('../controller/RemoteLanguageModel');
const SystemHelper = require("../utils/SystemHelper");
const fs = require('fs');
const path = require('path');

class Gen {
  static async get_marketing_desc(prompt, apiKey, provider = SupportedLangModels.OPENAI) {

    if (provider == SupportedLangModels.OPENAI) {
        const chatbot = new Chatbot(apiKey);
        const input = new ChatGPTInput("generate marketing description", { maxTokens: 800 });
        input.addUserMessage(`Create a marketing description for the following: ${prompt}`);
        const responses = await chatbot.chat(input);

        return responses[0].trim();
    } else if (provider == SupportedLangModels.COHERE) {

        const langInput = new LanguageModelInput({prompt:`Create a marketing description for the following: ${prompt}`});
        langInput.setDefaultValues(SupportedLangModels.COHERE, 400);

        const cohereLanguageModel = new RemoteLanguageModel(apiKey, provider);
        const responses = await cohereLanguageModel.generateText(langInput);

        return responses[0].trim();
    } else {
        const supportedModels = RemoteLanguageModel.getSupportedModels();
        const models = supportedModels.join(' - ');
        throw new Error(`The received keyValue is not supported. Send any model from: ${models}`);
    }

  }

  static async get_blog_post(prompt, apiKey, provider = SupportedLangModels.OPENAI) {
    if (provider == SupportedLangModels.OPENAI) {
        const chatbot = new Chatbot(apiKey);
        const input = new ChatGPTInput("generate blog posts related to user input", { maxTokens: 1200 });
        input.addUserMessage(`Write a blog post about ${prompt}`);
        const responses = await chatbot.chat(input);

        return responses[0].trim();
    } else if (provider == SupportedLangModels.COHERE) {
        const langInput = new LanguageModelInput({prompt:`Write a blog post with sections titles about ${prompt}`});
        langInput.setDefaultValues(SupportedLangModels.COHERE, 1200);

        const cohereLanguageModel = new RemoteLanguageModel(apiKey, provider);
        const responses = await cohereLanguageModel.generateText(langInput);

        return responses[0].trim();
    } else {
        const supportedModels = RemoteLanguageModel.getSupportedModels();
        const models = supportedModels.join(' - ');
        throw new Error(`The received keyValue is not supported. Send any model from: ${models}`);
    }

  }

  static async getImageDescription(prompt, apiKey) {
    const chatbot = new Chatbot(apiKey);
    const input = new ChatGPTInput("Generate image description to use for image generation models. return only the image description");
    input.addUserMessage(`Generate image description from the following text: ${prompt}`);
    const responses = await chatbot.chat(input);
    return responses[0].trim();
  }

  /**
  * Generates image description from the user prompt then use the image description to generate the image.
  *
  * @param {string} prompt - The text prompt used for image generation.
  * @param {string} openaiKey - The OpenAI API key to generate the description.
  * @param {string} imageApiKey - The image API key to generate the image based on the received provider.
  * @param {boolean} [is_base64=true] - Set to true for base64 image string, false if it should be returned as a Buffer.
  * @param {SupportedImageModels} [provider=SupportedImageModels.STABILITY] - The image model provider.
  *
  * @returns {Promise<string|Buffer>} - The generated image, either as base64 string or Buffer.
  */
  static async generate_image_from_desc(prompt, openaiKey, imageApiKey, is_base64 = true,
                                          provider = SupportedImageModels.STABILITY) {

    const imageDescription = await Gen.getImageDescription(prompt, openaiKey);
    const imgModel = new RemoteImageModel(imageApiKey, provider);
    const images = await imgModel.generateImages(
          new ImageModelInput({ prompt: imageDescription,
                                numberOfImages: 1,
                                width: 512,
                                height: 512,
                                responseFormat: 'b64_json'}));
    if (is_base64) {
      return images[0];
    } else {
      return Buffer.from(images[0], "base64");
    }
  }

  static async generate_speech_synthesis(text, googleKey) {
    const speechModel = new RemoteSpeechModel(googleKey, "google");
    const input = new Text2SpeechInput({ text: text, language: "en-gb" });
    const audioContent = await speechModel.generateSpeech(input);
    return audioContent;
  }

  static async generate_html_page(text, openaiKey, model_name='gpt-4') {
    // load and fill the template
    const promptTemplate = new SystemHelper().loadPrompt("html_page");
    const prompt = promptTemplate.replace("${text}", text);

    // prepare the bot
    const chatbot = new Chatbot(openaiKey);
    const input = new ChatGPTInput('generate only html, css and javascript based on the user request in the following format {"html": "<code>", "message":"<text>"}',
                                   { maxTokens: 2000, model: model_name });
    // set the user message with the template
    input.addUserMessage(prompt);
    const responses = await chatbot.chat(input);
    return JSON.parse(responses[0].trim());
  }

  static async save_html_page(text, folder, file_name, openaiKey, model_name='gpt-4') {
    const htmlCode = await Gen.generate_html_page(text, openaiKey, model_name=model_name);
    const folderPath = path.join(folder, file_name + '.html');
    fs.writeFileSync(folderPath, htmlCode['html']);
    return true;
  }


  static async generate_dashboard(csv_str_data, topic, openaiKey, model_name='gpt-4', num_graphs=1) {

    if (num_graphs < 1 || num_graphs > 4) {
        throw new Error('num_graphs should be between 1 and 4 (inclusive)');
    }

    // load and fill the template
    const promptTemplate = new SystemHelper().loadPrompt("graph_dashboard");

    let prompt = promptTemplate.replace("${count}", num_graphs);
    prompt = prompt.replace("${topic}", topic);
    prompt = prompt.replace("${text}", csv_str_data);

    // prepare the bot
    let tokeSize = 2100;
    if (model_name=='gpt-4') {
      tokeSize = 4000;
    }
    const chatbot = new Chatbot(openaiKey);
    const input = new ChatGPTInput(`Generate HTML graphs from the CSV data, following the output template, and ensure the response is a valid JSON to parse. Include valid HTML tags. The resulting output should not exceed ${tokeSize} tokens.`,
                                   { maxTokens: tokeSize, model: model_name, temperature:0.3 });
    // set the user message with the template
    input.addUserMessage(prompt);
    const responses = await chatbot.chat(input);

    return JSON.parse(responses[0].trim())[0];
  }

}

module.exports = { Gen };
