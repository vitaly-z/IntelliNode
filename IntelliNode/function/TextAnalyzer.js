const { RemoteLanguageModel, SupportedLangModels } = require("../controller/RemoteLanguageModel");
const LanguageModelInput = require("../model/input/LanguageModelInput");
const SystemHelper = require("../utils/SystemHelper");

class TextAnalyzer {
  constructor(keyValue, provider = SupportedLangModels.OPENAI) {
    if (!Object.values(SupportedLangModels).includes(provider)) {
      throw new Error(`The specified provider '${provider}' is not supported. Supported providers are: ${Object.values(SupportedLangModels).join(", ")}`);
    }
    this.provider = provider;
    this.remoteLanguageModel = new RemoteLanguageModel(keyValue, provider);
    this.systemHelper = new SystemHelper();
  }

  async summarize(text, options = {}) {
    const summaryPromptTemplate = this.systemHelper.loadSystem("summary");
    const prompt = summaryPromptTemplate.replace("${text}", text);
    const modelInput = new LanguageModelInput({
      prompt,
      maxTokens: options.maxTokens || null,
      temperature: options.temperature || 0.5,
    });
    modelInput.setDefaultModels(this.provider);
    const [summary] = await this.remoteLanguageModel.generateText(modelInput);
    return summary.trim();
  }

  async sentimentAnalysis(text, options = {}) {
    const mode = this.systemHelper.loadSystem("sentiment");
    const prompt = `${mode}\n\nAnalyze the sentiment of the following text: ${text}\n\nSentiment: `;

    const modelInput = new LanguageModelInput({
      prompt,
      maxTokens: options.maxTokens || 60,
      temperature: options.temperature || 0,
    });
    modelInput.setDefaultModels(this.provider);
    const [sentiment] = await this.remoteLanguageModel.generateText(modelInput);

    const sentiment_output = JSON.parse(sentiment.trim());
    return sentiment_output;
  }
}

module.exports = { TextAnalyzer };