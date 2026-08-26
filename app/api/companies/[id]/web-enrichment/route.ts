import OpenAI from "openai";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type WebEnrichmentResult = {
  website: string;
  phone: string;
  email: string;
  logo_url: string;
  business_description: string;
  linkedin_url: string;
  facebook_url: string;
  confidence:
    | "high"
    | "medium"
    | "low";
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        message:
          "La clé API OpenAI n'est pas configurée.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const {
      data: company,
      error: companyError,
    } = await supabaseAdmin
      .from("companies")
      .select(
        `
          id,
          name,
          legal_name,
          siren,
          siret,
          address,
          postal_code,
          city,
          website,
          phone,
          email,
          logo_url,
          ape_code,
          ape_label
        `
      )
      .eq("id", id)
      .maybeSingle();

    if (companyError) {
      throw new Error(
        companyError.message
      );
    }

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Entreprise introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        tools: [
          {
            type: "web_search",
          },
        ],

        instructions: `
Tu travailles pour le CRM de LBMedia.

Ta mission est de rechercher sur le web les informations publiques d'une entreprise française précise.

Tu dois identifier l'entreprise avec prudence à partir des informations fournies.

PRIORITÉ

Ne confonds jamais deux entreprises portant un nom proche.

Utilise en priorité pour l'identification :
- le SIREN ;
- le SIRET ;
- la ville ;
- l'adresse ;
- la raison sociale.

INFORMATIONS À RECHERCHER

Recherche uniquement des informations publiques utiles au CRM :

- site internet officiel ;
- numéro de téléphone professionnel public ;
- adresse e-mail professionnelle publique ;
- logo officiel de l'entreprise ;
- page LinkedIn officielle de l'entreprise ;
- page Facebook officielle de l'entreprise ;
- courte description factuelle de l'activité.

RÈGLES IMPORTANTES

Pour le site internet :
- retourne uniquement le site officiel de l'entreprise ;
- n'utilise pas les pages PagesJaunes, annuaires, sociétés.com, Pappers ou autres annuaires comme site officiel.

Pour le téléphone :
- retourne uniquement un numéro professionnel publiquement associé à cette entreprise ;
- n'invente jamais de numéro.

Pour l'e-mail :
- retourne uniquement une adresse publiquement affichée ;
- n'invente jamais de format d'adresse.

Pour le logo :
- retourne uniquement une URL HTTPS publique pointant directement vers un logo officiel de l'entreprise ;
- privilégie le logo utilisé sur le site officiel de l'entreprise ;
- privilégie une image de bonne qualité et suffisamment grande pour être utilisée dans un document commercial ;
- évite les favicons, icônes de navigateur, captures d'écran, photos, bannières ou images contenant plusieurs marques ;
- n'utilise pas un logo provenant d'un annuaire ou d'un site tiers si un logo officiel est disponible ;
- l'URL doit désigner une image accessible publiquement sans authentification ;
- si tu ne peux pas identifier avec certitude une URL directe vers le logo officiel, retourne une chaîne vide ;
- n'invente jamais une URL d'image.

Pour LinkedIn et Facebook :
- retourne uniquement une page officielle suffisamment identifiable ;
- sinon retourne une chaîne vide.

Pour la description :
- fais une synthèse factuelle très courte ;
- 2 phrases maximum ;
- n'invente aucune information.

CONFIDENCE

Retourne :
- "high" si l'identification de l'entreprise est très fiable ;
- "medium" si elle est probable mais qu'un doute subsiste ;
- "low" si les résultats sont ambigus.

Si une information n'est pas trouvée avec suffisamment de fiabilité, retourne une chaîne vide.

Retourne exclusivement un objet JSON valide.
N'utilise aucun bloc Markdown.
`,

        input: `
Entreprise à rechercher :

Nom commercial :
${company.name || "Non renseigné"}

Raison sociale :
${company.legal_name || "Non renseignée"}

SIREN :
${company.siren || "Non renseigné"}

SIRET :
${company.siret || "Non renseigné"}

Adresse :
${company.address || "Non renseignée"}

Code postal :
${company.postal_code || "Non renseigné"}

Ville :
${company.city || "Non renseignée"}

Code APE :
${company.ape_code || "Non renseigné"}

Activité :
${company.ape_label || "Non renseignée"}

Informations déjà présentes dans le CRM :

Site :
${company.website || "Non renseigné"}

Téléphone :
${company.phone || "Non renseigné"}

E-mail :
${company.email || "Non renseigné"}

Logo :
${company.logo_url || "Non renseigné"}

Recherche maintenant les informations publiques fiables de cette entreprise.
`,

        text: {
          format: {
            type: "json_schema",
            name:
              "company_web_enrichment",
            strict: true,
            schema: {
              type: "object",

              properties: {
                website: {
                  type: "string",
                },

                phone: {
                  type: "string",
                },

                email: {
                  type: "string",
                },

                logo_url: {
                  type: "string",
                },

                business_description: {
                  type: "string",
                },

                linkedin_url: {
                  type: "string",
                },

                facebook_url: {
                  type: "string",
                },

                confidence: {
                  type: "string",
                  enum: [
                    "high",
                    "medium",
                    "low",
                  ],
                },
              },

              required: [
                "website",
                "phone",
                "email",
                "logo_url",
                "business_description",
                "linkedin_url",
                "facebook_url",
                "confidence",
              ],

              additionalProperties:
                false,
            },
          },
        },
      });

    const rawOutput =
      response.output_text.trim();

    if (!rawOutput) {
      throw new Error(
        "Aucune information publique n'a été retournée."
      );
    }

    const enrichment =
      JSON.parse(
        rawOutput
      ) as WebEnrichmentResult;

    return NextResponse.json({
      success: true,
      enrichment,
    });
  } catch (error) {
    console.error(
      "Company web enrichment error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Impossible de rechercher les informations publiques de l'entreprise.",

        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      }
    );
  }
}