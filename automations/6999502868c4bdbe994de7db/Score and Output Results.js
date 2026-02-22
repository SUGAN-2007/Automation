// Step 5: Final scoring, ranking and results output
;(async () => {
  try {
    const analyzedVendors = getContext("analyzedVendors") || []
    if (analyzedVendors.length === 0) throw new Error("No analyzed vendors to score.")

    // Compliance scoring per instructions
    function getComplianceScore(compliance) {
      let score = 0
      if (compliance.iso_27001) score += 2
      if (compliance.soc2) score += 2
      if (compliance.gdpr) score += 1
      if (compliance.privacy_policy) score += 1
      if (compliance.terms_conditions) score += 1
      return score
    }
    const maxComplianceScore = 7

    // Final scoring (weights): credibility 50%, normalized compliance 30%, penalty 20%
    function calcFinalScore(credibility, compliance, redFlags) {
      const complianceNorm = compliance / maxComplianceScore
      const credibilityNorm = (credibility || 5) / 10 // Fallback to 5 if missing
      const penalty = (Array.isArray(redFlags) ? Math.min(redFlags.length, 3) : 0) / 3 // Cap penalty at 3 flags
      // Risk penalty: 0.2 * (1 - penalty)
      // Final: (0.5 * credibility) + (0.3 * complianceNorm) + (0.2 * (1 - penalty))
      return Math.max(0, Math.min(10, Math.round(10 * (0.5 * credibilityNorm + 0.3 * complianceNorm + 0.2 * (1 - penalty)))))
    }
    // Score, risk level, and summary
    const withScores = analyzedVendors.map(v => {
      const complianceScore = getComplianceScore(v.compliance || {})
      const finalScore = calcFinalScore(v.credibility_score, complianceScore, v.red_flags || [])
      let risk_level = "HIGH RISK"
      if (finalScore >= 8) risk_level = "LOW RISK"
      else if (finalScore >= 5) risk_level = "MEDIUM RISK"
      return {
        ...v,
        compliance_score: complianceScore,
        final_score: finalScore,
        risk_level
      }
    })
    // Sort descending
    const ranked = [...withScores].sort((a, b) => b.final_score - a.final_score)
    console.log("Vendor ranking complete:")
    ranked.forEach((v, i) => {
      console.log(`#${i + 1}: ${v.name || v.website}, Score: ${v.final_score} (${v.risk_level}), Red Flags: ${JSON.stringify(v.red_flags)}`)
    })

    // Executive summary generation
    const industry = process.env.INDUSTRY || ""
    const country = process.env.COUNTRY || ""
    const total = ranked.length
    const low = ranked.filter(v => v.risk_level === "LOW RISK").length
    const medium = ranked.filter(v => v.risk_level === "MEDIUM RISK").length
    const high = ranked.filter(v => v.risk_level === "HIGH RISK").length

    const topVendor = ranked[0] || {}
    let reason = "No strong top vendor identified."
    if (topVendor) {
      reason = `Vendor ranked highest due to a combination of professional credibility (${topVendor.credibility_score}/10), ` + `compliance presence (score ${topVendor.compliance_score}/${maxComplianceScore}) and fewer red flags: ${topVendor.red_flags ? topVendor.red_flags.join(", ") : "None"}.`
    }
    const execSummary = `\n-------------------------------\nVendor Intelligence Report\n-------------------------------\nIndustry: ${industry}\nCountry: ${country}\n\nTotal Vendors Analyzed: ${total}\nLow Risk Vendors: ${low}\nMedium Risk Vendors: ${medium}\nHigh Risk Vendors: ${high}\n\nTop Recommended Vendor: ${topVendor.name || topVendor.website || "None"}\nReason: ${reason}\n-------------------------------\n`

    // Output JSON structure as specified
    const output = {
      industry,
      country,
      vendors: ranked.map(v => ({
        name: v.name,
        website: v.website,
        summary: v.summary,
        credibility_score: v.credibility_score,
        compliance_score: v.compliance_score,
        final_score: v.final_score,
        risk_level: v.risk_level,
        red_flags: v.red_flags || []
      })),
      executive_summary: execSummary
    }

    console.log(execSummary)
    setContext("finalVendorResults", output)
    console.log("Step complete. Output structured as specified.")
  } catch (err) {
    console.error("Error in Score and Output Results step:", err.message)
    process.exit(1)
  }
})()
