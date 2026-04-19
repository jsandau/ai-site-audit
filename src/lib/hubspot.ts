// src/lib/hubspot.ts
// Creates a contact + deal in HubSpot when a lead unlocks their report.

const HUBSPOT_API = "https://api.hubapi.com";
const API_KEY = process.env.HUBSPOT_API_KEY;

interface HubSpotResult {
  contactId: string | null;
  dealId: string | null;
  error?: string;
}

export async function syncLeadToHubSpot(params: {
  email: string;
  name: string;
  company: string;
  auditUrl: string;
  auditScore: number;
  reportLink: string;
}): Promise<HubSpotResult> {
  if (!API_KEY) {
    console.warn("HUBSPOT_API_KEY not set — skipping CRM sync");
    return { contactId: null, dealId: null, error: "No API key" };
  }

  try {
    const [firstName, ...rest] = params.name.split(" ");
    const lastName = rest.join(" ") || "";

    // 1. Create or update contact
    const contactRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          email: params.email,
          firstname: firstName,
          lastname: lastName,
          company: params.company,
          website: params.auditUrl,
          // Custom property — add this in HubSpot if you want it tracked
          hs_lead_status: "NEW",
        },
      }),
    });

    let contactId: string | null = null;

    if (contactRes.ok) {
      const contactData = await contactRes.json();
      contactId = contactData.id;
    } else if (contactRes.status === 409) {
      // Contact already exists — find their ID
      const existing = await fetch(
        `${HUBSPOT_API}/crm/v3/objects/contacts/${params.email}?idProperty=email`,
        { headers: { Authorization: `Bearer ${API_KEY}` } }
      );
      if (existing.ok) {
        const existingData = await existing.json();
        contactId = existingData.id;
      }
    }

    if (!contactId) {
      return { contactId: null, dealId: null, error: "Failed to create contact" };
    }

    // 2. Create deal
    const dealRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/deals`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          dealname: `Site Audit — ${params.auditUrl}`,
          pipeline: "default",
          dealstage: "appointmentscheduled",
          amount: "",
          description: `Score: ${params.auditScore}/100\nReport: ${params.reportLink}`,
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
          },
        ],
      }),
    });

    let dealId: string | null = null;
    if (dealRes.ok) {
      const dealData = await dealRes.json();
      dealId = dealData.id;
    }

    return { contactId, dealId };
  } catch (err) {
    console.error("HubSpot sync error:", err);
    return { contactId: null, dealId: null, error: String(err) };
  }
}
