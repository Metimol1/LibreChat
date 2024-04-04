const availableTools = require('./manifest.json')
const ChatTool = require('./structured/ChatTool');
const SelfReflectionTool = require('./SelfReflection');

module.exports = {
  availableTools,
  ChatTool,
  SelfReflectionTool
}