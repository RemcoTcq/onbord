const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  try {
    const models = await anthropic.models.list();
    console.log(models.data.map(m => m.id));
  } catch (err) {
    console.error(err);
  }
}

main();
