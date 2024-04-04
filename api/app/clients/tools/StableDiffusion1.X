const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { Tool } = require('langchain/tools');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { FileContext } = require('librechat-data-provider');
const { getImageBasename } = require('~/server/services/Files/images');
const extractBaseURL = require('~/utils/extractBaseURL');
const { logger } = require('~/config');

class StableDiffusionCreateImage extends Tool {
  constructor(fields = {}) {
    super();

    this.userId = fields.userId;
    this.fileStrategy = fields.fileStrategy;
    if (fields.processFileURL) {
      this.processFileURL = fields.processFileURL.bind(this);
    }

    this.name = 'stable-diffusion';
    this.description = `You can generate images with 'stable-diffusion'. This tool is exclusively for visual content.`;
    this.description_for_model = `// Description for stable diffusion...`;

    let apiKey = fields.STABLE_DIFFUSION_API_KEY ?? this.getApiKey();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    };

    if (process.env.PROXY) {
      config.httpsAgent = new HttpsProxyAgent(process.env.PROXY);
    }

    this.config = config;
  }

  getApiKey() {
    const apiKey = process.env.STABLE_DIFFUSION_API_KEY ?? '';
    if (!apiKey) {
      throw new Error('Missing STABLE_DIFFUSION_API_KEY environment variable.');
    }
    return apiKey;
  }

  wrapInMarkdown(imageUrl) {
    return `![generated image](${imageUrl})`;
  }

  async _call(input) {
    let resp;

    try {
      resp = await axios.post('https://visioncraft.top/generate', input, this.config);
    } catch (error) {
      logger.error('[Stable Diffusion] Problem generating the image:', error);
      return `Something went wrong when trying to generate the image. The Stable Diffusion API may be unavailable:
Error Message: ${error.message}`;
    }

    const theImageUrl = resp.data.image_url;

    if (!theImageUrl) {
      throw new Error('No image URL returned from Stable Diffusion API.');
    }

    const imageBasename = getImageBasename(theImageUrl);

    const imageName = `img-${uuidv4()}.${imageBasename.split('.').pop()}`;

    logger.debug('[Stable Diffusion]', {
      imageName,
      imageBasename,
      theImageUrl,
    });

    try {
      const result = await this.processFileURL({
        fileStrategy: this.fileStrategy,
        userId: this.userId,
        URL: theImageUrl,
        fileName: imageName,
        basePath: 'images',
        context: FileContext.image_generation,
      });

      this.result = this.wrapInMarkdown(result.filepath);
    } catch (error) {
      logger.error('Error while saving the image:', error);
      this.result = `Failed to save the image locally. ${error.message}`;
    }

    return this.result;
  }
}

module.exports = StableDiffusionCreateImage;