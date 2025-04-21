document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("input-form");
  const loading = document.getElementById("loading");
  const companyInput = document.getElementById("company");
  const apiKeyInput = document.getElementById("api-key");

  loadStoredApiKey(apiKeyInput);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    toggleLoading(true);

    const company = companyInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!company || !apiKey) {
      alert("Please fill in all fields.");
      toggleLoading(false);
      return;
    }

    saveApiKey(apiKey);

    try {
      const responseText = await fetchCompanyAnalysis(apiKey, company);
      const data = parseJsonResponse(responseText);

      downloadJson(data, `${company}_analysis.json`);
      alert("JSON file downloaded.");
    } catch (error) {
      console.error(error);
      alert("X " + error.message);
    } finally {
      toggleLoading(false);
    }
  });
});

// Helpers

function loadStoredApiKey(input) {
  chrome.storage.local.get(["openai_api_key"], (result) => {
    if (result.openai_api_key) {
      input.value = result.openai_api_key;
    }
  });
}

function saveApiKey(apiKey) {
  chrome.storage.local.set({ openai_api_key: apiKey });
}

function toggleLoading(state) {
  const loading = document.getElementById("loading");
  loading.style.display = state ? "block" : "none";
}

async function fetchCompanyAnalysis(apiKey, company) {
  const prompt = generatePrompt(company);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const message = result.choices?.[0]?.message?.content;

  if (!message) {
    throw new Error("No message returned from OpenAI.");
  }

  return message;
}

function parseJsonResponse(responseText) {
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error("Response is not valid JSON:\n" + responseText);
  }
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generatePrompt(company) {
  return `
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
`;
}
