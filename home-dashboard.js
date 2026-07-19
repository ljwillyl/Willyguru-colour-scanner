"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const format = (value) => Number(value || 0).toLocaleString();

  function card(row) {
    const traits = [row.breed, row.pattern, row.build_type].filter(Boolean).join(" · ") || "Traits awaiting classification";
    const colours = [row.primary_colour, row.secondary_colour, row.tertiary_colour];
    return `<article class="v6DnaCard">
      <span class="v6KDNA">${esc(row.kdna_id || "DNA RECORD")}</span>
      <h3>${esc(row.name || "Unnamed Kubrow")}</h3>
      <p>${esc(traits)}</p>
      <div class="v6Swatches">${colours.map((colour) => `<span class="v6Swatch" title="${esc(colour || "Unknown")}">${esc(colour || "Unknown")}</span>`).join("")}</div>
      <a href="dna.html?id=${encodeURIComponent(row.kdna_id || "")}">View DNA profile →</a>
    </article>`;
  }

  async function loadDashboard() {
    const host = $("homeRecent");
    const status = $("homeStatsStatus");
    try {
      const sb = window.KubrowApp.getSupabaseClient();
      const [dnaResult, listingResult, recentResult] = await Promise.all([
        sb.from("public_kubrow_dna_complete").select("breed", { count: "exact" }).eq("verification_source", "screenshot").limit(2000),
        sb.from("kennel_kubrows").select("id", { count: "exact", head: true }).eq("is_public", true).in("trade_status", ["for_sale", "open_to_offers", "reserved"]),
        sb.from("public_kubrow_dna_complete").select("kdna_id,name,breed,pattern,build_type,primary_colour,secondary_colour,tertiary_colour,created_at").eq("verification_source", "screenshot").order("created_at", { ascending: false }).limit(4)
      ]);

      if (dnaResult.error) throw dnaResult.error;
      if (listingResult.error) throw listingResult.error;
      if (recentResult.error) throw recentResult.error;

      const dnaRows = dnaResult.data || [];
      $("homeVerified").textContent = format(dnaResult.count ?? dnaRows.length);
      $("homeListings").textContent = format(listingResult.count || 0);
      $("homeBreeds").textContent = format(new Set(dnaRows.map((row) => row.breed).filter(Boolean)).size);
      status.textContent = "Live figures from the public community database.";
      const recent = recentResult.data || [];
      host.innerHTML = recent.length ? recent.map(card).join("") : '<div class="v6Empty">No verified public DNA records have been published yet.</div>';
    } catch (error) {
      console.warn("Homepage dashboard unavailable:", error);
      status.textContent = "Live figures are temporarily unavailable. The scanner remains ready to use.";
      host.innerHTML = '<div class="v6Empty">Recent DNA could not be loaded right now. Open DNA Explorer to try again.</div>';
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadDashboard);
  else loadDashboard();
})();
