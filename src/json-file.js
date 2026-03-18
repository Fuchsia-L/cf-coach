const fs = require('fs');
const path = require('path');

function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`读取 JSON 文件失败：文件不存在 ${filePath}`);
    }

    if (error instanceof SyntaxError) {
      throw new Error(`读取 JSON 文件失败：JSON 格式错误 ${filePath}`);
    }

    throw new Error(`读取 JSON 文件失败：${filePath}，${error.message}`);
  }
}

function writeJsonFile(filePath, value) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  } catch (error) {
    throw new Error(`写入 JSON 文件失败：${filePath}，${error.message}`);
  }
}

module.exports = {
  readJsonFile,
  writeJsonFile,
};
