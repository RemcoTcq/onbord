import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client using the API key from environment variables
// Note: This must only be used in Server Components or Server Actions
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default anthropic;
