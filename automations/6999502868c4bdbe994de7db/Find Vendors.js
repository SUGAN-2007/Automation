"const industry = process.env.INDUSTRY
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
const blockedDomains = ["zoominfo", "statista", "golden", "linkedin", "wikipedia", "ambitionbox"]
// --- END user-updated blocklist ---
const blockedUrlPatterns = [/\/blog\//i, /\/lists?\//i, /\/review(s)?\//i, /\/directory/i, /\/jobs?\//i, /\/careers?\//i, /\/news\//i, /\/about\//i, /\?page=/i, /\/article(s)?\//i, /\/join\//i, /\/contact(s)?\//i, /\/forum(s)?\//i, /\/events\//i]
function domainIsBlocked(url) {
  try {
    const u = new URL(url)
    return blockedDomains.some(d => u.hostname.includes(d))
  } catch {
    return true
  }
}
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

    const query = `top ${maxVendors} companies in ${industry} industry in ${country}`
    const params = {
      engine: "google",
      api_key: serpapiApiKey,
      q: query,
      device: "desktop",
      num: Math.max(10, maxVendors * 4), // Search more and filter down
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

    // Parse organic results for unique valid homepages
    let vendorArr = []
    const usedDomains = new Set()
    for (const item of resultsRaw.organic_results) {
      if (item.title && item.link && item.title.length > 2 && item.link.startsWith("http")) {
        const urlObj = new URL(item.link)
        // Allow only homepages and filter blocked domains/patterns
        const fullUrl = urlObj.origin + "/"
        // --- BEGIN user-preferred direct website blocklist filtering ---
        if (!blockedDomains.some(d => fullUrl.includes(d)) && !urlHasBlockedPattern(fullUrl) && isHomepage(fullUrl) && !usedDomains.has(urlObj.hostname)) {
          // --- END user-preferred filter ---
          usedDomains.add(urlObj.hostname)
          vendorArr.push({
            name: item.title.split(" - ")[0].replace(/\|.*/, "").trim(),
            website: fullUrl
          })
        }
      }
      if (vendorArr.length >= maxVendors) break
    }

    if (vendorArr.length === 0) {
      throw new Error("No valid companies found in SerpAPI search results after filtering.")
    }
    console.log("Discovered vendors:", vendorArr.map(v => v.name).join(", "))
    setContext("vendors", vendorArr)
  } catch (err) {
    console.error("Error in Find Vendors (SerpAPI) step:", err.message)
    process.exit(1)
  }
})()
