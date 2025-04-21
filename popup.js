document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("input-form");
  const loading = document.getElementById("loading");
  const companyInput = document.getElementById("company");
  const apiKeyInput = document.getElementById("api-key");

  // Load saved API key
  chrome.storage.local.get(["openai_api_key"], (result) => {
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    loading.style.display = "block";

    const company = companyInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!company || !apiKey) {
      alert("Please fill in all fields.");
      loading.style.display = "none";
      return;
    }

    chrome.storage.local.set({ openai_api_key: apiKey });

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "user",
                content: `
Act as a corporate risk analyst. Based on your knowledge until 2023, simulate a full due diligence report on the company: "${company}".

Structure your response in JSON format with the following fields:
- company_profile
- financial_issues
- legal_issues
- executive_changes
- reputational_risks
- political_lobbying
- risk_score (1 to 5)

You may simulate content based on training knowledge, similar companies, and general risk factors if no direct info is known. Be realistic and concise.

Act like a corporate expert investigator. Conduct a thorough investigation of the company "${company}", including its subsidiaries, leadership, and recent activity, with a focus on identifying red flags, legal issues, financial instability, lobbying influence, or reputational risks. Your goal is to determine whether this company is a reliable, transparent, and viable partner for long-term technology or AI-related service provision.

Scope of Information (Prioritize Free Sources Where Possible)

Corporate Registry & Legal Status

Verify official company name, registration number, headquarters, incorporation date, active/inactive status

Sources:
- OpenCorporates
- European e-Justice Portal
- Dun & Bradstreet
- Transparency Register EU
- Corporate Structure & Ownership

Check ultimate beneficial owners, shareholders, subsidiaries, mergers/acquisitions

Sources:
- OpenCorporates
- Orbis (Moody\'s, partial access)
- Crunchbase
- Europages
- Financial Standing & Credit Risk

Look for bankruptcies, credit downgrades, major debts, unpaid taxes, or insolvency filings

Sources:
- Yahoo Finance
- DNB Basic Reports
- AnnualReports.com (if public)
- Moody's (where available)
- Legal Proceedings & Compliance


Investigate legal cases, sanctions, environmental violations, or regulatory non-compliance

Sources:
- EU e-Justice
- National court registries
- News portals (Reuters, AP, local business news)
- Lobbying & Political Influence

Examine lobbying activities, political donations, and government relationships

Sources:
- LobbyFacts.eu
- EU Transparency Register
- Reputation & News Mentions

Search for negative press, executive scandals, public boycotts, or major layoffs

Sources:
- Google News
- Reuters, Bloomberg, AP
- Trustpilot or Glassdoor (for employee & customer sentiment)
- Technology & Industry Footprint


Investigate tech usage, patents, AI initiatives, and whether they outsource/partner in AI

Sources:
- Crunchbase
- Y Combinator
- Company website & LinkedIn
- GitHub (if applicable)


Red Flags to Watch For
Frequent executive turnover, ongoing or recent lawsuits, tax evasion or shady offshore structures, negative media exposure, political lobbying with no transparency, unclear or overly complex ownership structures, poor financial ratios or loss declarations, connections to sanctioned individuals/entities.
`,
              },
            ],
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      const messageContent = result.choices?.[0]?.message?.content;

      if (!messageContent) {
        throw new Error("No message returned from OpenAI.");
      }

      let parsedData;
      try {
        parsedData = JSON.parse(messageContent);
      } catch {
        throw new Error("Response is not valid JSON:\n" + messageContent);
      }

      // Download JSON file
      const blob = new Blob([JSON.stringify(parsedData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${company}_analysis.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("JSON file downloaded.");
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      loading.style.display = "none";
    }
  });
});
