import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  generateLbmediaRadioPresentation,
  getGammaGeneration,
} from "@/lib/gamma";

import {
  getZohoEstimate,
  type ZohoEstimate,
} from "@/lib/zoho-books";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    estimateId: string;
  }>;
};

function formatCurrency(
  value: number | undefined,
  currency = "EUR"
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency,
    }
  ).format(Number(value) || 0);
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "Non précisée";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR"
  ).format(date);
}

function formatDiscount(
  discount:
    | string
    | number
    | undefined,
  discountAmount:
    | number
    | undefined,
  currency: string
) {
  if (
    typeof discount ===
      "string" &&
    discount.trim()
  ) {
    return discount.trim();
  }

  if (
    typeof discount ===
      "number" &&
    Number.isFinite(discount) &&
    discount > 0
  ) {
    return `${discount} %`;
  }

  if (
    Number(discountAmount) > 0
  ) {
    return formatCurrency(
      discountAmount,
      currency
    );
  }

  return "Aucune";
}

function buildGammaPrompt(
  estimate: ZohoEstimate
) {
  const currency =
    estimate.currency_code ||
    "EUR";

  const lineItems =
    estimate.line_items ?? [];

  const prestations =
    lineItems.length > 0
      ? lineItems
          .map(
            (
              line,
              index
            ) => {
              const description =
                line.description
                  ?.trim();

              return [
                `Prestation ${
                  index + 1
                } :`,
                `- Intitulé : ${
                  line.name
                }`,
                description
                  ? `- Description : ${description}`
                  : null,
                `- Quantité : ${
                  line.quantity
                }${
                  line.unit
                    ? ` ${line.unit}`
                    : ""
                }`,
                `- Prix unitaire HT : ${formatCurrency(
                  line.rate,
                  currency
                )}`,
                `- Remise : ${formatDiscount(
                  line.discount,
                  line.discount_amount,
                  currency
                )}`,
                `- Total HT de la ligne : ${formatCurrency(
                  line.item_total,
                  currency
                )}`,
              ]
                .filter(Boolean)
                .join("\n");
            }
          )
          .join("\n\n")
      : "Aucune prestation détaillée.";

  return `
Créer une proposition commerciale Radio LBMedia à partir du template existant.

RÈGLE PRINCIPALE :
Le template Gamma Radio LBMedia constitue la base graphique et éditoriale de référence.
Il ne faut pas recréer une présentation différente : il faut personnaliser ce modèle pour le client et le devis ci-dessous.

IDENTITÉ ET ÉLÉMENTS FIXES DU TEMPLATE :
- Conserver le design, l'identité visuelle et la structure générale du template.
- Conserver impérativement le logo officiel LBMedia déjà présent dans le template.
- Conserver impérativement le bloc de coordonnées LBMedia présent dans le template, notamment sur la dernière page.
- Ne supprimer aucun élément fixe d'identité LBMedia.
- Conserver le nom de l'agence, le nom du commercial, les coordonnées de contact et les mentions de bas de page présentes dans le template.
- Les coordonnées LBMedia doivent rester visibles, complètes et lisibles dans la présentation finale.
- Ne pas remplacer les coordonnées LBMedia par une formule générique du type "Votre contact pour tout renseignement complémentaire".
- Les éléments permanents LBMedia du template ne doivent pas être résumés, raccourcis ou supprimés lors de la personnalisation.

AUDIENCES RFM :
- Conserver les informations générales RFM Lot déjà présentes dans le template.
- Conserver exactement les données d'audience RFM Lot présentes dans le template.
- Ne pas recalculer les audiences.
- Ne pas modifier les données Médiamétrie du template.
- Conserver les sources et mentions associées aux audiences.

PERSONNALISATION :
- Adapter les contenus commerciaux aux informations du devis ci-dessous.
- Présenter les prestations du devis de manière claire, commerciale et professionnelle.
- Ne pas inventer d'informations absentes du devis.
- La présentation doit valoriser la proposition commerciale sans devenir une simple reproduction du devis.
- La présentation est destinée à accompagner le devis officiel Zoho Books.

ÉLÉMENTS À NE PAS AJOUTER :
- Ne pas ajouter de compte rendu après diffusion.
- Ne pas ajouter de prestation qui ne figure pas dans le devis.
- Ne pas ajouter de prix ou de remise qui ne figure pas dans les données du devis.
- Ne pas ajouter d'engagement contractuel absent du devis.

CLIENT
Nom : ${estimate.customer_name}

DEVIS
Numéro : ${estimate.estimate_number}
Référence : ${
    estimate.reference_number ||
    "Non précisée"
  }
Date : ${formatDate(
    estimate.date
  )}
Validité : ${formatDate(
    estimate.expiry_date
  )}
Commercial : ${
    estimate.salesperson_name ||
    "Non précisé"
  }

PRESTATIONS

${prestations}

MONTANTS
Sous-total HT : ${formatCurrency(
    estimate.sub_total,
    currency
  )}
TVA : ${formatCurrency(
    estimate.tax_total,
    currency
  )}
Total TTC : ${formatCurrency(
    estimate.total,
    currency
  )}

NOTES DU DEVIS
${
  estimate.notes?.trim() ||
  "Aucune note particulière."
}

CONSIGNES FINALES :
Créer une présentation commerciale personnalisée pour ${estimate.customer_name}, cohérente avec le devis ${estimate.estimate_number}.

Le document doit pouvoir être envoyé directement au client avec le devis Zoho Books.

Avant de finaliser la présentation, vérifier impérativement que :
1. le logo LBMedia est toujours présent ;
2. les coordonnées complètes LBMedia du template sont toujours présentes et lisibles ;
3. les données d'audience RFM Lot du template sont conservées ;
4. les montants correspondent au devis ;
5. aucune prestation absente du devis n'a été ajoutée ;
6. aucun compte rendu après diffusion n'a été ajouté.
`.trim();
}

/*
 * POST
 *
 * Lance la génération Gamma.
 * La requête n'attend pas la fin
 * de la génération.
 */
export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      estimateId,
    } = await context.params;

    const normalizedEstimateId =
      estimateId?.trim();

    if (
      !normalizedEstimateId
    ) {
      return NextResponse.json(
        {
          error:
            "Identifiant de devis Zoho manquant.",
        },
        {
          status: 400,
        }
      );
    }

    const estimate =
      await getZohoEstimate(
        normalizedEstimateId
      );

    const prompt =
      buildGammaPrompt(
        estimate
      );

    const generation =
      await generateLbmediaRadioPresentation(
        prompt
      );

    return NextResponse.json(
      {
        generationId:
          generation.generationId,
        status: "pending",
      }
    );
  } catch (error) {
    console.error(
      "Erreur lancement génération Gamma :",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de lancer la génération Gamma.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * GET
 *
 * Vérifie l'état d'une génération
 * Gamma déjà lancée.
 */
export async function GET(
  request: NextRequest,
  _context: RouteContext
) {
  try {
    const generationId =
      request.nextUrl.searchParams
        .get("generationId")
        ?.trim();

    if (!generationId) {
      return NextResponse.json(
        {
          error:
            "Identifiant de génération Gamma manquant.",
        },
        {
          status: 400,
        }
      );
    }

    const generation =
      await getGammaGeneration(
        generationId
      );

    return NextResponse.json({
      generationId,
      status:
        generation.status,
      gammaUrl:
        generation.gammaUrl ??
        null,
      exportUrl:
        generation.exportUrl ??
        null,
      error:
        generation.error ??
        null,
    });
  } catch (error) {
    console.error(
      "Erreur suivi génération Gamma :",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de vérifier la génération Gamma.",
      },
      {
        status: 500,
      }
    );
  }
}