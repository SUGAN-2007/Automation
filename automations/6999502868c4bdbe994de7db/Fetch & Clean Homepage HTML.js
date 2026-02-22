// Step 3: For each live vendor, fetch homepage HTML and simplify it
;(async () => {
  try {
    const checkedVendors = getContext("checkedVendors") || []
    if (checkedVendors.length === 0) {
      throw new Error("No vendors available from previous step.")
    }
    console.log(`Fetching and simplifying HTML for ${checkedVendors.filter(v => v.live).length} live vendor websites...`)
    const vendorResults = []
    for (const v of checkedVendors) {
      if (!v.live) {
        vendorResults.push({ ...v, html: null, simplifiedHtml: null, fetchError: "not live" })
        continue
      }
      try {
        const res = await fetch(v.website, { method: "GET", timeout: 15000 })
        if (!res.ok) throw new Error(`Failed (${res.status})`)
        const html = await res.text()
        const simplifiedHtml = await simplifyHtml(html)
        vendorResults.push({ ...v, html, simplifiedHtml, fetchError: null })
        console.log(`Fetched and simplified: ${v.name || v.website}`)
      } catch (e) {
        vendorResults.push({ ...v, html: null, simplifiedHtml: null, fetchError: (e && e.message) || String(e) })
        console.warn(`Failed to fetch/simplify for ${v.name}:`, e.message)
      }
    }
    setContext("vendorHtmlResults", vendorResults)
  } catch (err) {
    console.error("Error in Fetch & Clean Homepage HTML step:", err.message)
    process.exit(1)
  }
})()
