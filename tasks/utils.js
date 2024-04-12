const fs = require("fs").promises;

async function readTemplate(dirPath) {
  try {
    const fileContent = await fs.readFile(dirPath, "utf8");
    const jsonData = JSON.parse(fileContent);
    return jsonData;
  } catch (error) {
    console.error("Error reading JSON files:", error);
  }

  return "";
}

module.exports = {
  readTemplate,
};
