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
    this.description = `You can generate images with 'stable-diffusion'. This tool is exclusively for visual content.
Guidelines:
- Visually describe the moods, details, structures, styles, and/or proportions of the image. Remember, the focus is on visual attributes.
- Craft your input by "showing" and not "telling" the imagery. Think in terms of what you'd want to see in a photograph or a painting.
- It's best to follow this format for image creation:
"detailed keywords to describe the subject, separated by comma | keywords we want to exclude from the final image"
- Here's an example prompt for generating a realistic portrait photo of a man:
"photo of a man in black clothes, half body, high detailed skin, coastline, overcast weather, wind, waves, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT3 | semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, out of frame, low quality, ugly, mutation, deformed"
- Generate images only once per human query unless explicitly requested by the user`;

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
