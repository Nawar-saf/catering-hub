# DATABASE V20 — Company Procurement / Billing Profile

Company signup stays lightweight so a buyer can publish an RFQ without uploading corporate documents first. Procurement details are completed when the company needs formal PO / invoice workflows.

Added company fields include legal name, CR number, VAT number, billing contact, billing email / phone / address, website, industry and profile update timestamp.

`private.company_procurement_profile_complete(company_id)` currently requires:

- legal company name
- billing email
- billing address

The PO write guard requires this minimum procurement profile before a new Purchase Order can be issued. This keeps customer acquisition low-friction while preventing incomplete formal procurement records.

UI: `/company/profile.html`.
