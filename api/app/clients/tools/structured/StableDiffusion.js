// Generates image using stable diffusion webui's api (automatic1111)
const fs = require('fs');
const { z } = require('zod');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { StructuredTool } = require('langchain/tools');
const { FileContext } = require('librechat-data-provider');
const paths = require('~/config/paths');
const { logger } = require('~/config');

class StableDiffusionAPI extends StructuredTool {
  constructor(fields) {
    super();
    /** @type {string} User ID */
    this.userId = fields.userId;
    /** @type {Express.Request | undefined} Express Request object, only provided by ToolService */
    this.req = fields.req;
    /** @type {boolean} Used to initialize the Tool without necessary variables. */
    this.override = fields.override ?? false;
    /** @type {boolean} Necessary for output to contain all image metadata. */
    this.returnMetadata = fields.returnMetadata ?? false;
    if (fields.uploadImageBuffer) {
      /** @type {uploadImageBuffer} Necessary for output to contain all image metadata. */
      this.uploadImageBuffer = fields.uploadImageBuffer.bind(this);
    }

    this.name = 'stable-diffusion';
    this.url = this.getServerURL();
    this.token = this.getToken();
    this.description_for_model = `// Generate images and visuals using text.
// Guidelines:
// - ALWAYS use {{"prompt": "7+ detailed keywords", "negative_prompt": "7+ detailed keywords"}} structure for queries.
// - Visually describe the moods, details, structures, styles, and/or proportions of the image. Remember, the focus is on visual attributes.
// - Craft your input by "showing" and not "telling" the imagery. Think in terms of what you'd want to see in a photograph or a painting.
// - Here's an example for generating a realistic portrait photo of a man:
// "prompt":"photo of a man in black clothes, half body, high detailed skin, coastline, overcast weather, wind, waves, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT3"
// "negative_prompt":"semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, out of frame, low quality, ugly, mutation, deformed"
// - Generate images only once per human query unless explicitly requested by the user`;
    this.description =
      'You can generate images using text with \'stable-diffusion\'. This tool is exclusively for visual content.';
    this.schema = z.object({
      prompt: z
        .string()
        .describe(
          'Detailed keywords to describe the subject, using at least 7 keywords to accurately describe the image, separated by comma',
        ),
      negative_prompt: z
        .string()
        .describe(
          'Keywords we want to exclude from the final image, using at least 7 keywords to accurately describe the image, separated by comma',
        ),
    });
  }

  getMarkdownImageUrl(imageUrl) {
    return `![generated image](${imageUrl})`;
  }

  getServerURL() {
    const url = process.env.SD_WEBUI_URL || '';
    if (!url && !this.override) {
      throw new Error('Missing SD_WEBUI_URL environment variable.');
    }
    return url;
  }

  getToken() {
    const token = process.env.SD_WEBUI_TOKEN || '';
    if (!token) {
      throw new Error('Missing SD_WEBUI_TOKEN environment variable.');
    }
    return token;
  }

  async _call(data) {
    const url = this.url;
    const token = this.token;
    const { prompt, negative_prompt } = data;
    const payload = {
      token: token,
      model: 'juggernautXL',
      prompt,
      negative_prompt,
      sampler: 'Euler',
      cfg_scale: 7,
      steps: 30,
      width: 1024,
      height: 1024,
    };
    const generationResponse = await axios.post(`${url}/generate-xl`, payload);
    const theImageUrl = generationResponse.data.images[0];
    this.result = this.getMarkdownImageUrl(theImageUrl);

    return this.result;
  }
}

module.exports = StableDiffusionAPI;
