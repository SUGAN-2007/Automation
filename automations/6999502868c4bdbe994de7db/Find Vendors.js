const industry = process.env.INDUSTRY
const country = process.env.COUNTRY
const maxVendors = parseInt(process.env.MAX_VENDORS || "3", 10)
const serpapiApiKey = process.env.SERPAPI_API_KEY // Add this env variable in Automation config

// Filtering logic for homepages only
function isHomepage(url) {
  try {
    const u = new URL(url)
    return (u.pathname === "/" || u.pathname === "") && !u.search
  } catch {
    return false
  }
}
// --- BEGIN user-updated blocklist and filtering ---
const blockedDomains = ["gov", "treasury", "federalregister", "freedomhouse", "ofac", "cisa", "malware", "faq", "report"]
// --- END user-updated blocklist ---
// FIXED: invalid regex, scan for similar
const blockedUrlPatterns = [/\/blog\//i, /\/lists\?/i, /\/review(s)?\//i, /\/directory/i, /\/jobs?\//i, /\/careers?\//i, /\/news\//i, /\/about\//i, /\?page=/i, /\/article(s)?\//i, /\/join\//i, /\/contact(s)?\//i, /\/forum(s)?\//i, /\/events\//i]

function urlHasBlockedPattern(url) {
  return blockedUrlPatterns.some(pattern => pattern.test(url))
}

const { getJson } = require("serpapi")

;(async () => {
  try {
    if (!industry || !country) {
      throw new Error("Both INDUSTRY and COUNTRY are required.")
    }
    if (!serpapiApiKey) {
      throw new Error("SERPAPI_API_KEY is required (env variable). Add it to the automation config.")
    }
    console.log(`Discovering vendors via SerpAPI for: ${industry}, ${country}, max: ${maxVendors}`)
    // Updated query: less restrictive, more open to official/major sites with visible websites and Wikipedia
    const query = `Top supermarket companies in ${country}. Include official websites, Wikipedia, and known business portals, but avoid government and compliance results.`
    const params = {
      engine: "google",
      api_key: serpapiApiKey,
      q: query,
      device: "desktop",
      num: 25,
      hl: "en",
      no_cache: true,
      safe: "active"
    }

    let resultsRaw = null
    try {
      resultsRaw = await getJson(params)
    } catch (err) {
      console.error("Error fetching from SerpAPI:", err)
      throw new Error("SerpAPI request failed.")
    }
    if (!resultsRaw || !Array.isArray(resultsRaw.organic_results) || resultsRaw.organic_results.length === 0) {
      throw new Error("No results from SerpAPI.")
    }

    console.log("[Debug] Raw search homepages:", resultsRaw.organic_results.map(r => `${r.title} => ${r.link}`).join(" | "))
    // Parse organic results for unique valid homepages
    let vendors = []
    const usedDomains = new Set()
    for (const item of resultsRaw.organic_results) {
      if (item.title && item.link && item.title.length > 2 && item.link.startsWith("http")) {
        const urlObj = new URL(item.link)
        const fullUrl = urlObj.origin + "/"
        if (!urlHasBlockedPattern(fullUrl) && isHomepage(fullUrl) && !usedDomains.has(urlObj.hostname)) {
          usedDomains.add(urlObj.hostname)
          vendors.push({
            name: item.title.split(" - ")[0].replace(/\|.*/, "").trim(),
            website: fullUrl
          })
        }
      }
      if (vendors.length >= maxVendors) break
    }
    console.log("[Debug] Candidates after homepage/url filtering (pre-blocklist):", vendors.map(v => v.website).join(", "))
    // Apply user-provided blocklist only to website (case-insensitive)
    const preBlocklistCandidates = [...vendors]
    vendors = vendors.filter(v => !blockedDomains.some(word => v.website.toLowerCase().includes(word)))
    console.log("[Debug] Candidates after blocklist filtering:", vendors.map(v => v.website).join(", "))
    if (vendors.length === 0) {
      // Give full pre-blocklist vendor dump for manual curation!
      console.error("[Debug] No vendors remaining after filtering. Manual review of candidates BEFORE blocklist:")
      console.log("[Debug] MANUAL_CURATION_RAW (pre-blocklist HOME candidate websites):", preBlocklistCandidates.map(v => `${v.name} => ${v.website}`).join(" | "))
      throw new Error("No valid companies found in SerpAPI search results after filtering.")
    }
    console.log("Discovered vendors:", vendors.map(v => v.name).join(", "))
    setContext("vendors", vendors)
  } catch (err) {
    console.error("Error in Find Vendors (SerpAPI) step:", err.message)
    process.exit(1)
  }
})()
