const fs = require("fs");
const path = require("path");

class SystemHelper {
  constructor() {
    this.systemsPath = path.join(__dirname, "..", "resource", "templates");
  }

  getPromptPath(fileType) {
    let promptPath = '';
    if (fileType === "sentiment") {
      promptPath = path.join(this.systemsPath, "sentiment_prompt.in");
    } else if (fileType === "summary") {
      promptPath = path.join(this.systemsPath, "summary_prompt.in");
    } else if (fileType === "html_page") {
      promptPath = path.join(this.systemsPath, "html_page_prompt.in");
    } else if (fileType === "graph_dashboard") {
      promptPath = path.join(this.systemsPath, "graph_dashboard_prompt.in");
    } else if (fileType === "instruct_update") {
      promptPath = path.join(this.systemsPath, "instruct_update.in");
    } else if (fileType === "prompt_example") {
      promptPath = path.join(this.systemsPath, "prompt_example.in");
    }else {
      throw new Error(`File type '${file_type}' not supported`);
    }

    return promptPath;
  }

  loadPrompt(fileType) {
    let promptPath = this.getPromptPath(fileType)
    const promptTemplate = fs.readFileSync(promptPath, "utf8");

    return promptTemplate;

  }
}

module.exports = SystemHelper;