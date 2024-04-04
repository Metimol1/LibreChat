const availableTools = require('./manifest.json')
const ChatTool = require('./structured/ChatTool');
const SelfReflectionTool = require('./SelfReflection');
const StableDiffusionAPI = require('./StableDiffusion');
const StructuredSD = require('./structured/StableDiffusion');

module.exports = {
  availableTools,
  SelfReflectionTool,
  ChatTool,
  StructuredSD
}