import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  projectType?: string;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData: ContactFormData = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const projectTypeLabels: Record<string, string> = {
      "protective-coatings": "Protective Coatings Inspection",
      "intumescent": "Intumescent Coatings Inspection",
      "passive-fire": "Passive Fire Protection Inspection",
      "qa-verification": "QA Verification Support",
      "other": "Other / General Enquiry",
    };

    const projectTypeLabel = formData.projectType
      ? projectTypeLabels[formData.projectType] || formData.projectType
      : "Not specified";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #C8102E 0%, #A60E25 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 20px; }
            .label { font-weight: bold; color: #C8102E; margin-bottom: 5px; }
            .value { background: white; padding: 12px; border-radius: 4px; border-left: 3px solid #C8102E; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Contact Form Submission</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">P&R Consulting Limited</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Name</div>
                <div class="value">${formData.name}</div>
              </div>

              <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:${formData.email}">${formData.email}</a></div>
              </div>

              ${formData.phone ? `
              <div class="field">
                <div class="label">Phone</div>
                <div class="value">${formData.phone}</div>
              </div>
              ` : ''}

              ${formData.company ? `
              <div class="field">
                <div class="label">Company / Organisation</div>
                <div class="value">${formData.company}</div>
              </div>
              ` : ''}

              <div class="field">
                <div class="label">Project Type</div>
                <div class="value">${projectTypeLabel}</div>
              </div>

              <div class="field">
                <div class="label">Message</div>
                <div class="value" style="white-space: pre-wrap;">${formData.message}</div>
              </div>

              <div class="footer">
                <p>This email was sent from the P&R Consulting website contact form.</p>
                <p>Submitted at ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })} NZDT</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
New Contact Form Submission - P&R Consulting Limited

Name: ${formData.name}
Email: ${formData.email}
${formData.phone ? `Phone: ${formData.phone}` : ''}
${formData.company ? `Company: ${formData.company}` : ''}
Project Type: ${projectTypeLabel}

Message:
${formData.message}

---
Submitted at ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })} NZDT
    `.trim();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "P&R Consulting <noreply@prconsulting.nz>",
        to: ["info@prconsulting.nz"],
        reply_to: formData.email,
        subject: `New Contact Request: ${projectTypeLabel} - ${formData.name}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        id: data.id
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
