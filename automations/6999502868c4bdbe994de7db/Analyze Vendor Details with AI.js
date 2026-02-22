;(async () => {
  try {
    const vendorHtmlResults = getContext("vendorHtmlResults") || []
    if (vendorHtmlResults.length === 0) {
      throw new Error("No vendor HTML results to analyze.")
    }
    console.log(`Analyzing AI details for ${vendorHtmlResults.length} vendors...`)
    const aiResults = []
    for (const vendor of vendorHtmlResults) {
      // Skip vendors with no simplifiedHtml (could be non-live, fetch error, etc)
      if (!vendor.simplifiedHtml) {
        aiResults.push({
          ...vendor,
          summary: "No HTML or fetch error.",
          compliance: {
            gdpr: false,
            iso_27001: false,
            soc2: false,
            privacy_policy: false,
            terms_conditions: false
          },
          red_flags: [vendor.fetchError || "Missing HTML"],
          credibility_score: 5
        })
        continue
      }
      const prompt = `Analyze the following vendor homepage HTML. Return ONLY valid JSON in this format: { \"summary\": \"1-2 sentence company summary\", \"compliance\": { \"gdpr\": true/false, \"iso_27001\": true/false, \"soc2\": true/false, \"privacy_policy\": true/false, \"terms_conditions\": true/false }, \"red_flags\": [\"flag1\",\"flag2\"], \"credibility_score\": number (1-10) } STRICT: No markdown, no explanation, no backticks, output only JSON.\nHTML:\n${vendor.simplifiedHtml.slice(0, 8000)}`
      let aiContent = ""
      let summary = "",
        compliance = {},
        red_flags = [],
        credibility_score = 5
      try {
        const aiRes = await TurboticOpenAI([{ role: "user", content: prompt }], { model: "gpt-4.1", temperature: 0 })
        aiContent = aiRes.content
        const cleaned = aiContent
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim()
        const parsed = JSON.parse(cleaned)
        summary = parsed.summary || ""
        compliance = parsed.compliance || {
          gdpr: false,
          iso_27001: false,
          soc2: false,
          privacy_policy: false,
          terms_conditions: false
        }
        red_flags = parsed.red_flags || []
        credibility_score = typeof parsed.credibility_score === "number" ? parsed.credibility_score : 5
      } catch (err) {
        // Fallback values as defined
        summary = aiContent ? aiContent.slice(0, 300) : "AI parse fallback used."
        compliance = {
          gdpr: false,
          iso_27001: false,
          soc2: false,
          privacy_policy: false,
          terms_conditions: false
        }
        red_flags = ["AI parse fallback used"]
        credibility_score = 5
        console.error("AI parsing failed for vendor:", vendor.name || vendor.website, err)
      }
      aiResults.push({
        ...vendor,
        summary,
        compliance,
        red_flags,
        credibility_score
      })
    }
    setContext("analyzedVendors", aiResults)
  } catch (err) {
    console.error("Error in Analyze Vendor Details with AI step:", err.message)
    process.exit(1)
  }
})()
