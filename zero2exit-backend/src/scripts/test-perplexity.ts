import "dotenv/config"
import { perplexitySearch } from "../lib/research/perplexity.js"
import { researchTopic } from "../services/research.service.js"

async function main() {
  console.log("PERPLEXITY_API_KEY set:", !!process.env.PERPLEXITY_API_KEY)
  console.log("RESEARCH_ENGINE:", process.env.RESEARCH_ENGINE)

  const query = `Topic: test Perplexity integration

Research questions:
- What is the approximate population of Saudi Arabia?

Return:
{
  "facts": [],
  "sources": []
}`

  console.log("\n--- Calling perplexitySearch directly ---")
  console.log("Perplexity query:", query)
  const text = await perplexitySearch(query)
  console.log("Response length:", text.length)
  console.log("Response preview:", text.slice(0, 500))

  console.log("\n--- Calling researchTopic (hybrid engine) ---")
  const result = await researchTopic("Furniture / Interior design", [
    "market size in Saudi Arabia",
    "typical customer segments",
  ])
  console.log("researchTopic result sample:", {
    factsSample: result.facts.slice(0, 3),
    sourcesSample: result.sources.slice(0, 3),
  })
}

main().catch((err) => {
  console.error("Test Perplexity script failed:", err)
  process.exit(1)
})

