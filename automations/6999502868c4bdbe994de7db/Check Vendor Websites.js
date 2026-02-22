// Step 2: Check website availability using pingUrls for each vendor
;(async () => {
  try {
    const vendors = getContext("vendors") || []
    const urls = vendors.map(v => v.website || v.url).filter(Boolean)
    if (!urls || urls.length === 0) {
      throw new Error("No vendor URLs to check.")
    }
    console.log(`Checking availability of ${urls.length} vendor websites...`)
    const pingResults = await pingUrls(urls)
    const urlMap = {}
    ;(pingResults.results || []).forEach(r => {
      // Domain log (user format)
      let domain = null
      try {
        domain = new URL(r.url).hostname
        console.log(`Checking: ${domain}`)
      } catch (err) {
        console.log(`Checking: INVALID_URL (${r.url})`)
      }
      urlMap[r.url] = r.success
      console.log(`${r.url}: ${r.success ? "LIVE" : "DOWN"}, Latency: ${r.latency || "?"}ms`)
    })
    const checkedVendors = vendors.map(v => ({
      ...v,
      website: v.website || v.url,
      live: !!urlMap[v.website || v.url]
    }))
    setContext("checkedVendors", checkedVendors)
  } catch (err) {
    console.error("Error in Check Vendor Websites step:", err.message)
    process.exit(1)
  }
})()
