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

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    estimateId: string;
  }>;
};

const LBMEDIA_CONTACT = {
  name: "Laurent Barrès",
  phone: "05 65 33 76 44",
  email: "laurent@lbmedia.fr",
  website: "www.lbmedia.fr",
} as const;

type CampaignContext = {
  objective: string | null;
  territory: string;
  hasFigeac: boolean;
  hasSaintCere: boolean;
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

function normalizeForDetection(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}

type CoverVisualDirection = {
  label: string;
  instructions: string;
};

function getEstimateSearchableText(
  estimate: ZohoEstimate,
  campaignContext: CampaignContext
) {
  return [
    estimate.customer_name,
    estimate.reference_number,
    estimate.notes,
    campaignContext.objective,
    ...(estimate.line_items ?? []).flatMap(
      (line) => [
        line.name,
        line.description,
      ]
    ),
  ]
    .filter(Boolean)
    .join(" ");
}

function inferCoverVisualDirection(
  estimate: ZohoEstimate,
  campaignContext: CampaignContext
): CoverVisualDirection {
  const normalized =
    normalizeForDetection(
      getEstimateSearchableText(
        estimate,
        campaignContext
      )
    );

  const hasAny = (
    keywords: string[]
  ) =>
    keywords.some((keyword) =>
      normalized.includes(keyword)
    );

  if (
    hasAny([
      "restaurant",
      "restauration",
      "traiteur",
      "bar",
      "brasserie",
      "cafe",
      "boulanger",
      "boulangerie",
      "patisserie",
      "epicerie",
      "vin",
      "cave",
      "aliment",
      "food",
    ])
  ) {
    return {
      label:
        "Restauration / alimentaire",
      instructions:
        "Utiliser une image de couverture chaleureuse et réaliste liée à l'univers de la restauration ou de l'alimentaire : établissement, produits, service, ambiance conviviale, clientèle ou scène de vie crédible. Éviter les images trop luxueuses ou trop génériques.",
    };
  }

  if (
    hasAny([
      "artisan",
      "artisanat",
      "batiment",
      "btp",
      "travaux",
      "renovation",
      "construction",
      "charpente",
      "menuiserie",
      "plomberie",
      "chauffage",
      "electricite",
      "peinture",
      "maconnerie",
      "habitat",
      "materiaux",
      "piscine",
      "cuisine",
      "carrelage",
    ])
  ) {
    return {
      label:
        "Artisan / bâtiment / habitat",
      instructions:
        "Utiliser une image de couverture réaliste liée au savoir-faire métier : chantier propre, réalisation, habitat, équipe au travail, détail de matériaux ou intervention professionnelle. L'image doit inspirer sérieux, proximité et qualité.",
    };
  }

  if (
    hasAny([
      "communaute de communes",
      "mairie",
      "ville",
      "departement",
      "collectivite",
      "office de tourisme",
      "tourisme",
      "patrimoine",
      "festival",
      "evenement",
      "manifestation",
      "territoire",
      "association",
      "culture",
      "saison",
    ])
  ) {
    return {
      label:
        "Collectivité / tourisme / événement / territoire",
      instructions:
        "Utiliser une image de couverture ancrée dans le territoire et l'humain : paysage local, lieu identifiable sans être trop carte postale, scène de vie, public, événement, patrimoine ou service de proximité selon le contexte. Le rendu doit rester institutionnel, accessible et chaleureux.",
    };
  }

  if (
    hasAny([
      "magasin",
      "boutique",
      "commerce",
      "optique",
      "coiffure",
      "salon",
      "beaute",
      "fleuriste",
      "garage",
      "automobile",
      "moto",
      "concession",
      "animalerie",
      "pharmacie",
      "superette",
      "librairie",
      "pret a porter",
    ])
  ) {
    return {
      label:
        "Commerce local",
      instructions:
        "Utiliser une image de couverture réaliste montrant le commerce, l'accueil client, la vitrine, le point de vente ou l'expérience en magasin. L'ambiance doit être locale, professionnelle et engageante.",
    };
  }

  return {
    label:
      "Services / entreprise locale",
    instructions:
      "Utiliser une image de couverture réaliste et professionnelle liée à l'activité du client : personnes en situation de travail, accueil, échange, environnement métier ou scène d'usage cohérente avec le service proposé. Éviter les visuels trop abstraits ou impersonnels.",
  };
}


function detectRadioTerritory(
  estimate: ZohoEstimate
) {
  const searchableText =
    (
      estimate.line_items ??
      []
    )
      .map((line) =>
        [
          line.name,
          line.description,
        ]
          .filter(Boolean)
          .join(" ")
      )
      .join(" ");

  const normalized =
    normalizeForDetection(
      searchableText
    );

  const hasFigeac =
    normalized.includes(
      "rfm figeac"
    );

  const hasSaintCere =
    normalized.includes(
      "rfm saint cere"
    ) ||
    normalized.includes(
      "rfm st cere"
    ) ||
    normalized.includes(
      "rfm st-cere"
    ) ||
    normalized.includes(
      "rfm saint-cere"
    );

  if (
    hasFigeac &&
    hasSaintCere
  ) {
    return {
      territory:
        "Nord et Sud du Lot — couverture combinée des zones de diffusion RFM Saint-Céré et RFM Figeac",
      hasFigeac,
      hasSaintCere,
    };
  }

  if (hasFigeac) {
    return {
      territory:
        "Sud du Lot — zone de diffusion RFM Figeac",
      hasFigeac,
      hasSaintCere,
    };
  }

  if (hasSaintCere) {
    return {
      territory:
        "Nord du Lot — zone de diffusion RFM Saint-Céré",
      hasFigeac,
      hasSaintCere,
    };
  }

  return {
    territory:
      "Territoire défini par les prestations du devis",
    hasFigeac,
    hasSaintCere,
  };
}

async function getCampaignObjective(
  zohoEstimateId: string
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from(
      "estimate_campaign_contexts"
    )
    .select(
      "campaign_objective"
    )
    .eq(
      "zoho_estimate_id",
      zohoEstimateId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Erreur récupération objectif de campagne :",
      error
    );

    return null;
  }

  const objective =
    typeof data?.campaign_objective ===
      "string"
      ? data.campaign_objective.trim()
      : "";

  return objective || null;
}

async function getCampaignContext(
  estimate: ZohoEstimate
): Promise<CampaignContext> {
  const [
    objective,
    territory,
  ] = await Promise.all([
    getCampaignObjective(
      estimate.estimate_id
    ),

    Promise.resolve(
      detectRadioTerritory(
        estimate
      )
    ),
  ]);

  return {
    objective,
    territory:
      territory.territory,
    hasFigeac:
      territory.hasFigeac,
    hasSaintCere:
      territory.hasSaintCere,
  };
}

async function getCompanyLogoUrl(
  zohoContactId: string
) {
  if (!zohoContactId) {
    return null;
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("companies")
    .select(
      `
        id,
        name,
        logo_url
      `
    )
    .eq(
      "zoho_contact_id",
      zohoContactId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Erreur récupération logo entreprise :",
      error
    );

    return null;
  }

  const logoUrl =
    typeof data?.logo_url ===
      "string"
      ? data.logo_url.trim()
      : "";

  if (!logoUrl) {
    return null;
  }

  const isStoredInCompanyLogos =
    logoUrl.includes(
      "/storage/v1/object/public/company-logos/"
    );

  if (!isStoredInCompanyLogos) {
    console.warn(
      "Logo client ignoré pour Gamma car il n'est pas stocké dans company-logos :",
      {
        companyId:
          data?.id,
        companyName:
          data?.name,
        logoUrl,
      }
    );

    return null;
  }

  return logoUrl;
}

function buildGammaPrompt(
  estimate: ZohoEstimate,
  clientLogoUrl: string | null,
  campaignContext: CampaignContext
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

  const clientLogoInstructions =
    clientLogoUrl
      ? `
LOGO CLIENT :
Le logo officiel du client est disponible à cette URL :
${clientLogoUrl}

RÈGLES POUR LE LOGO CLIENT :
- utiliser cette image comme logo officiel du client ;
- remplacer le placeholder ou emplacement "logo client" du template par cette image ;
- ne pas inventer un autre logo ;
- ne pas utiliser une autre image à la place ;
- conserver les proportions du logo ;
- ne pas étirer ni déformer le logo ;
- ne pas rogner le logo ;
- le positionner proprement dans la zone prévue sur la couverture ;
- ne pas afficher l'URL du logo dans la présentation ;
- ne pas afficher de texte "Logo client" ou de placeholder si le logo est disponible.
`
      : `
LOGO CLIENT :
Aucun logo client fiable n'est disponible dans la fiche entreprise.

RÈGLES :
- ne pas inventer de logo ;
- ne pas générer de faux logo ;
- ne pas utiliser une image générique à la place ;
- supprimer tout placeholder du type "Logo client" si aucun logo n'est disponible.
`;

  const campaignObjectiveInstructions =
    campaignContext.objective
      ? `
OBJECTIF DE LA CAMPAGNE :
${campaignContext.objective}

RÈGLES IMPÉRATIVES :
- cet objectif a été renseigné manuellement par LBMedia dans Office ;
- il constitue la référence éditoriale principale pour expliquer les enjeux de la campagne ;
- le reprendre clairement et explicitement dans la page "Enjeux" ;
- adapter le paragraphe "Pourquoi ce dispositif ?" à cet objectif précis ;
- ne pas remplacer cet objectif par un objectif marketing générique ;
- ne pas transformer automatiquement l'objectif en "développer la notoriété" ;
- ne pas inventer d'autre objectif ;
- les bénéfices du dispositif doivent être expliqués en fonction de cet objectif.
`
      : `
OBJECTIF DE LA CAMPAGNE :
Aucun objectif spécifique n'a été renseigné dans LBMedia Office.

RÈGLE :
- rester factuel à partir des prestations du devis ;
- ne pas inventer un objectif commercial précis qui ne figure pas dans les données disponibles.
`;
  const coverVisualDirection =
    inferCoverVisualDirection(
      estimate,
      campaignContext
    );

  const territoryInstructions = `
TERRITOIRE DE LA CAMPAGNE :
${campaignContext.territory}

DÉTECTION DES ANTENNES :
- RFM Figeac : ${
    campaignContext.hasFigeac
      ? "OUI"
      : "NON"
  }
- RFM Saint-Céré : ${
    campaignContext.hasSaintCere
      ? "OUI"
      : "NON"
  }

RÈGLES TERRITOIRE :
- utiliser exactement le territoire indiqué ci-dessus comme référence ;
- RFM Figeac correspond à la zone Sud du Lot ;
- RFM Saint-Céré correspond à la zone Nord du Lot ;
- si les deux antennes sont présentes, présenter une couverture combinée Nord + Sud du Lot ;
- ne pas réduire RFM Figeac à la seule ville ou agglomération de Figeac ;
- ne pas réduire RFM Saint-Céré à la seule ville ou agglomération de Saint-Céré ;
- ne pas inventer les expressions "bassin de Figeac", "bassin de Saint-Céré" ou autre territoire non fourni ;
- la carte des zones de diffusion présente dans le template Gamma doit servir de représentation visuelle du territoire ;
- conserver cette carte ;
- ne pas la remplacer par une carte générée ;
- ne pas inventer de nouvelles limites géographiques ;
- le texte doit être cohérent avec la ou les zones réellement sélectionnées dans le devis.
`;

  return `
Créer une proposition commerciale Radio LBMedia à partir du template existant.

RÈGLE PRINCIPALE :
Le template Gamma Radio LBMedia constitue la base graphique et éditoriale de référence.
Il ne faut pas recréer une présentation différente : il faut personnaliser ce modèle pour le client et le devis ci-dessous.

IDENTITÉ LBMEDIA :
- Conserver le design, l'identité visuelle et la structure générale du template.
- Conserver impérativement le logo officiel LBMedia déjà présent dans le template.
- Conserver le bloc de contact LBMedia sur la dernière page.
- Ne pas supprimer ou remplacer le logo LBMedia.
- Ne jamais afficher de placeholders tels que [Téléphone], [Email], [E-mail], [Site web LBMedia] ou équivalent.
- Remplacer systématiquement les éventuels placeholders du template par les coordonnées exactes fournies ci-dessous.

COORDONNÉES OFFICIELLES LBMEDIA À AFFICHER :
Nom : ${LBMEDIA_CONTACT.name}
Téléphone : ${LBMEDIA_CONTACT.phone}
E-mail : ${LBMEDIA_CONTACT.email}
Web : ${LBMEDIA_CONTACT.website}

Sur la dernière page, afficher impérativement et lisiblement :
${LBMEDIA_CONTACT.name}
${LBMEDIA_CONTACT.phone} · ${LBMEDIA_CONTACT.email}
${LBMEDIA_CONTACT.website}

Ces coordonnées sont des données fixes fournies par LBMedia.
Elles doivent être reproduites exactement.
Ne pas les résumer, les reformuler, les masquer ou les remplacer par des placeholders.

${clientLogoInstructions}

${campaignObjectiveInstructions}

${territoryInstructions}

COUVERTURE — IMAGE DE PREMIÈRE PAGE :
La première page doit conserver la mise en page générale du template Gamma, mais l'image principale de couverture doit être personnalisée en fonction du client et de la campagne.

Activité / famille visuelle détectée : ${coverVisualDirection.label}
Direction visuelle recommandée : ${coverVisualDirection.instructions}

RÈGLES POUR LA COUVERTURE :
- l'image de couverture doit être cohérente avec l'activité réelle du client ;
- elle doit également être cohérente avec l'objectif de campagne lorsqu'il est renseigné ;
- si l'objectif concerne une opération ponctuelle (portes ouvertes, événement, recrutement, promotion, lancement, saison, opération commerciale), l'image doit le suggérer visuellement de manière crédible ;
- privilégier une image réaliste, sobre, professionnelle et crédible ;
- l'image doit évoquer le terrain, la proximité et l'activité du client plutôt qu'un univers radio générique ;
- ne pas utiliser de visuel futuriste, d'illustration abstraite, de robot, de cerveau numérique, ni de composition artificielle sans lien avec le métier ;
- éviter les images de banque d'images trop génériques, trop corporate ou déconnectées du territoire et du client ;
- ne pas inventer de texte intégré dans l'image ;
- ne pas intégrer de faux logo ou de signalétique inventée dans l'image ;
- l'image de couverture doit rester élégante et compatible avec la lisibilité des éléments de la page.

PAGE "ENJEUX" :
Cette page doit être personnalisée en priorité à partir de l'objectif de campagne et du territoire fournis ci-dessus.

Elle doit permettre au client de comprendre immédiatement :
- ce que la campagne cherche concrètement à obtenir ;
- pourquoi le dispositif radio proposé répond à cet objectif ;
- sur quel territoire la campagne sera diffusée.

Ne pas utiliser un discours générique de notoriété si l'objectif fourni concerne une opération ponctuelle, un événement, des portes ouvertes, une promotion, une ouverture, un recrutement ou toute autre finalité spécifique.

POSITIONNEMENT RFM :
- Ne jamais inventer ni extrapoler un positionnement de supériorité pour RFM au-delà des données fournies.
- Ne jamais inventer de classement, de part de marché ou de chiffre d'audience.
- Toute affirmation chiffrée concernant l'audience doit provenir exclusivement des données Médiamétrie fournies ci-dessous ou déjà présentes dans le template.
- La comparaison d'audience ci-dessous est une donnée commerciale de référence fournie par LBMedia : elle doit être présentée clairement et factuellement.

AUDIENCES RFM :
- Conserver les informations générales RFM Lot déjà présentes dans le template.
- Conserver exactement les données d'audience RFM Lot présentes dans le template.
- Ne pas recalculer ni modifier les données Médiamétrie du template.
- Conserver les sources et mentions associées aux audiences.

COMPARAISON DES AUDIENCES DANS LE LOT :
Créer ou conserver une page dédiée à la comparaison des audiences quotidiennes des radios dans le Lot.

Titre recommandé :
"RFM se démarque nettement dans le Lot"

Données à afficher :
- RFM : 25 100 auditeurs par jour
- Totem : 7 200 auditeurs par jour
- ICI : 2 600 auditeurs par jour
- 100% : 1 700 auditeurs par jour
- Antenne d'Oc–Pluriel : 1 400 auditeurs par jour
- CFM : 1 400 auditeurs par jour
- 47 FM : 800 auditeurs par jour
- Jordanne FM : 800 auditeurs par jour

RÈGLES IMPÉRATIVES POUR CETTE COMPARAISON :
- RFM doit être la seule radio mise en avant comme offre commerciale ;
- mettre visuellement en évidence RFM et son audience de 25 100 auditeurs par jour ;
- afficher explicitement le nom Totem uniquement comme repère comparatif ;
- Totem ne doit jamais bénéficier d'un encadré, d'une carte, d'un titre ou d'un traitement graphique équivalent à celui de RFM ;
- ne jamais présenter Totem comme une offre, une solution ou un support proposé par LBMedia ;
- dans le graphique, Totem et les autres radios doivent rester visuellement secondaires par rapport à RFM ;
- reprendre la disposition visuelle validée : graphique horizontal à gauche et bloc de mise en avant RFM à droite ;
- conserver une composition aérée, équilibrée et proche de la disposition précédente, sans inverser ni réorganiser inutilement les deux zones ;
- utiliser exclusivement un dégradé de bleu pour toutes les barres du graphique ;
- la barre RFM doit utiliser le bleu le plus soutenu et être clairement dominante visuellement ;
- Totem doit utiliser un bleu secondaire plus discret que RFM ;
- les autres radios doivent utiliser des nuances de bleu progressivement plus claires et discrètes ;
- ne pas utiliser d'orange, de gris comme couleur principale de barre, ni d'autre couleur concurrente ;
- toutes les radios doivent appartenir à la même palette bleue, avec une hiérarchie visuelle nette en faveur de RFM ;
- à côté du bloc principal RFM, utiliser de préférence une simple mention discrète du type :
  "vs Totem : 7 200 auditeurs/jour"
- il est permis d'ajouter :
  "soit près de 3,5 fois plus d'auditeurs quotidiens pour RFM dans le Lot."
- le graphique peut afficher toutes les radios listées ci-dessus afin de rendre la comparaison immédiatement compréhensible ;
- ne modifier aucun des chiffres fournis ;
- ne pas inventer d'autres radios, chiffres, parts de marché ou périodes ;
- reprendre exactement la même phrase de source Médiamétrie que celle déjà affichée sur la diapositive précédente "Une audience locale puissante" ;
- ne pas créer une formulation spécifique ou différente pour la page de comparaison ;
- conserver exactement le même texte, la même ponctuation et les mêmes mentions méthodologiques que sur la diapositive précédente ;
- afficher cette source en pied de page dans une police sensiblement plus petite que le contenu principal, discrète mais lisible ;
- ne jamais raccourcir, reformuler ou supprimer cette source lors de la personnalisation de la présentation.

PERSONNALISATION :
- Adapter les contenus commerciaux aux informations du devis ci-dessous.
- Présenter les prestations du devis de manière claire, commerciale et professionnelle.
- Ne pas inventer d'informations absentes du devis.
- La présentation doit valoriser la proposition commerciale sans devenir une simple reproduction du devis.
- La présentation est destinée à accompagner le devis officiel Zoho Books.

PAGE FINALE "LBMEDIA" :

La dernière page de la présentation doit présenter brièvement les différentes expertises de LBMedia tout en conservant le bloc de contact final.

Cette page doit rester élégante, visuelle et concise. Elle ne doit pas ressembler à un catalogue commercial.

Titre recommandé :
"LBMedia, votre communication sur plusieurs terrains"

Présenter les trois activités suivantes :

RADIO
Campagnes publicitaires sur RFM Lot.
Conseil, conception et accompagnement.

SITES INTERNET
Création et refonte de sites internet.
Des sites pensés pour être clairs, visibles et générer des contacts.

SEO & GEO
Référencement sur Google et visibilité dans les réponses des intelligences artificielles.
Diagnostic et optimisation de sites existants.

RÈGLES IMPÉRATIVES POUR CETTE PAGE :

- ces éléments présentent les activités générales de LBMedia ;
- ils ne constituent pas des prestations incluses dans le présent devis ;
- ne pas leur attribuer de prix ;
- ne pas les intégrer au dispositif radio proposé au client ;
- conserver le design et l'identité visuelle du template Gamma ;
- privilégier une mise en page graphique avec trois blocs ou trois univers clairement identifiables ;
- ne pas surcharger la page de texte ;
- conserver impérativement sur cette même page le bloc de contact LBMedia avec les coordonnées officielles fournies plus haut ;
- cette page doit être la dernière page de la présentation.

ÉLÉMENTS À NE PAS AJOUTER :
- Ne jamais ajouter de compte rendu après diffusion.
- Ne jamais ajouter de bilan post-campagne.
- Ne jamais ajouter de reporting après diffusion.
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
    LBMEDIA_CONTACT.name
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
1. le logo officiel LBMedia est toujours présent ;
2. ${
    clientLogoUrl
      ? "le logo officiel du client fourni par URL est bien présent sur la couverture"
      : "aucun faux logo client n'a été ajouté"
  } ;
3. l'objectif de campagne ${
    campaignContext.objective
      ? `"${campaignContext.objective}" est clairement identifiable sur la page Enjeux`
      : "n'a pas été inventé"
  } ;
4. le territoire affiché est cohérent avec "${campaignContext.territory}" ;
5. la carte des zones de diffusion du template est conservée ;
6. aucune affirmation de leadership, de classement ou de part de marché absente des données fournies n'a été inventée ;
7. la comparaison des audiences dans le Lot est présente avec RFM à 25 100 auditeurs par jour et Totem à 7 200 auditeurs par jour ;
8. RFM est la seule radio mise en avant comme offre commerciale et Totem apparaît uniquement comme repère comparatif secondaire ;
9. Totem ne bénéficie d'aucun encadré, carte ou traitement graphique équivalent à celui de RFM ;
10. la page de comparaison reprend exactement la même phrase de source Médiamétrie que la diapositive précédente, en petit corps de texte et sans reformulation ;
11. la disposition conserve le graphique horizontal à gauche et le bloc RFM à droite ;
12. toutes les barres du graphique utilisent exclusivement un dégradé de bleu, avec RFM dans le bleu le plus soutenu et Totem visuellement secondaire ;
13. aucun chiffre de la comparaison d'audience n'a été modifié ;
14. le nom "${LBMEDIA_CONTACT.name}" est présent dans le bloc de contact final ;
15. le téléphone "${LBMEDIA_CONTACT.phone}" est affiché exactement ;
16. l'adresse e-mail "${LBMEDIA_CONTACT.email}" est affichée exactement ;
17. le site "${LBMEDIA_CONTACT.website}" est affiché exactement ;
18. aucun placeholder [Téléphone], [Email], [E-mail] ou [Site web LBMedia] ne subsiste ;
19. les données d'audience RFM Lot du template sont conservées ;
20. les montants correspondent exactement au devis ;
21. aucune prestation absente du devis n'a été ajoutée ;
22. aucun compte rendu, bilan ou reporting après diffusion n'a été ajouté ;
23. la dernière page présente clairement les trois activités LBMedia : Radio, Sites internet et SEO & GEO ;
24. ces activités sont présentées comme les expertises générales de LBMedia et non comme des prestations incluses dans le devis ;
25. le bloc de contact LBMedia est conservé sur cette dernière page.
`.trim();
}

async function persistGammaState(
  zohoEstimateId: string,
  values: {
    gamma_generation_id?: string | null;
    gamma_url?: string | null;
    gamma_generated_at?: string | null;
  }
) {
  const {
    data: existingRow,
    error: updateError,
  } = await supabaseAdmin
    .from(
      "estimate_campaign_contexts"
    )
    .update(values)
    .eq(
      "zoho_estimate_id",
      zohoEstimateId
    )
    .select(
      "zoho_estimate_id"
    )
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (existingRow) {
    return;
  }

  const {
    error: insertError,
  } = await supabaseAdmin
    .from(
      "estimate_campaign_contexts"
    )
    .insert({
      zoho_estimate_id:
        zohoEstimateId,
      ...values,
    });

  if (insertError) {
    throw insertError;
  }
}

/*
 * POST
 *
 * Lance la génération Gamma.
 * La requête n'attend pas la fin
 * de la génération.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    let requestBody: {
      action?: unknown;
    } = {};

    try {
      requestBody =
        (await request.json()) as {
          action?: unknown;
        };
    } catch {
      requestBody = {};
    }

    if (
      requestBody.action !==
      "generate"
    ) {
      return NextResponse.json(
        {
          error:
            "Génération Gamma refusée : action explicite requise.",
        },
        {
          status: 400,
        }
      );
    }

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

    const [
      clientLogoUrl,
      campaignContext,
    ] =
      await Promise.all([
        getCompanyLogoUrl(
          estimate.customer_id
        ),

        getCampaignContext(
          estimate
        ),
      ]);

    const prompt =
      buildGammaPrompt(
        estimate,
        clientLogoUrl,
        campaignContext
      );

    const generation =
      await generateLbmediaRadioPresentation(
        prompt
      );

    try {
      await persistGammaState(
        normalizedEstimateId,
        {
          gamma_generation_id:
            generation.generationId,
          gamma_url: null,
          gamma_generated_at:
            null,
        }
      );
    } catch (persistenceError) {
      console.error(
        "Impossible d'enregistrer la génération Gamma dans Supabase :",
        persistenceError
      );
    }

    return NextResponse.json(
      {
        generationId:
          generation.generationId,

        status: "pending",

        clientLogoFound:
          Boolean(
            clientLogoUrl
          ),

        campaignObjectiveFound:
          Boolean(
            campaignContext.objective
          ),

        territory:
          campaignContext.territory,
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

    if (
      generation.status ===
        "completed" &&
      generation.gammaUrl
    ) {
      try {
        await persistGammaState(
          normalizedEstimateId,
          {
            gamma_generation_id:
              generationId,
            gamma_url:
              generation.gammaUrl,
            gamma_generated_at:
              new Date().toISOString(),
          }
        );
      } catch (persistenceError) {
        console.error(
          "Impossible d'enregistrer le lien Gamma dans Supabase :",
          persistenceError
        );
      }
    }

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