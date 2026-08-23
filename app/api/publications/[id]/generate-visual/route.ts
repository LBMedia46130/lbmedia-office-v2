import OpenAI from "openai";
import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY,
});

const visualSceneDirections = [
  "une scène de terrain dans une entreprise locale, un commerce, un atelier ou un environnement professionnel réel, avec une activité crédible directement liée au sujet",
  "une interaction naturelle entre deux ou trois professionnels ou entre un professionnel et un client, dans une situation concrète directement liée au sujet",
  "une composition éditoriale centrée sur une action métier, des mains en action, des documents, des objets ou des éléments professionnels ayant un rapport direct avec le sujet",
  "une scène professionnelle en plan large montrant un véritable environnement de travail ou commercial, avec de la profondeur et plusieurs niveaux de lecture",
  "une scène extérieure ou semi-extérieure liée à une entreprise locale, un commerce, une vitrine, une activité ou un parcours client",
  "une composition principalement construite autour d'objets, de matières, de documents et d'éléments professionnels spécifiques au sujet, sans personnage principal",
  "une situation de réflexion ou de décision montrée par une scène collective ou un échange professionnel concret, sans personne seule face à un écran",
  "une métaphore visuelle crédible du problème ou de la décision évoquée dans le post, intégrée dans un environnement professionnel cohérent",
];

const visualFramings = [
  "plan large avec environnement visible et profondeur",
  "plan moyen naturel avec une composition éditoriale travaillée",
  "cadrage légèrement décentré avec le sujet principal placé sur un tiers de l'image",
  "vue immersive avec premier plan, plan intermédiaire et arrière-plan",
  "cadrage rapproché sur une action, des mains, des documents ou des détails métier",
  "composition panoramique laissant respirer la scène",
];

const humanDirections = [
  "la présence humaine est possible mais ne doit pas être le sujet automatique de l'image",
  "privilégier une scène sans personnage principal lorsque l'idée peut être exprimée plus précisément par une situation, un lieu ou une action",
  "si des personnes apparaissent, privilégier une interaction réelle entre plusieurs personnes plutôt qu'une personne seule",
  "utiliser éventuellement une présence humaine partielle ou secondaire : mains, silhouettes, personnes de dos ou personnages en arrière-plan",
  "éviter les poses face caméra ; les personnes doivent sembler réellement occupées par une activité liée au sujet",
];

function getRandomItem<T>(
  items: T[]
): T {
  return items[
    Math.floor(
      Math.random() *
        items.length
    )
  ];
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  if (
    !process.env.OPENAI_API_KEY
  ) {
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

  const { id } =
    await context.params;

  try {
    const {
      data: publication,
      error: publicationError,
    } = await supabaseAdmin
      .from("publications")
      .select(
        `
          id,
          news_id,
          channel,
          title,
          content,
          hashtags,
          image_url,
          image_alt
        `
      )
      .eq("id", id)
      .maybeSingle();

    if (publicationError) {
      throw new Error(
        publicationError.message
      );
    }

    if (!publication) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Publication introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      publication.channel !==
        "linkedin" &&
      publication.channel !==
        "facebook"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La génération de visuel est disponible uniquement pour LinkedIn et Facebook.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !publication.content?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le contenu du post doit être renseigné avant de générer son visuel.",
        },
        {
          status: 400,
        }
      );
    }

    const contentExcerpt =
      publication.content
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 2600);

    const title =
      publication.title?.trim() ||
      getShortSubject(
        publication.content
      );

    const sceneDirection =
      getRandomItem(
        visualSceneDirections
      );

    const framingDirection =
      getRandomItem(
        visualFramings
      );

    const humanDirection =
      getRandomItem(
        humanDirections
      );

    const prompt = `
Créer UNE ILLUSTRATION ÉDITORIALE HORIZONTALE pour accompagner une publication ${
      publication.channel ===
      "linkedin"
        ? "LinkedIn"
        : "Facebook"
    } de LBMedia.

==================================================
SUJET
==================================================

${title}

==================================================
CONTENU DE RÉFÉRENCE
==================================================

${contentExcerpt}

${
  publication.hashtags?.trim()
    ? `
HASHTAGS ASSOCIÉS :

${publication.hashtags.trim()}
`
    : ""
}

==================================================
OBJECTIF
==================================================

Comprendre d'abord l'idée centrale de la publication.

Imaginer ensuite UNE situation visuelle précise qui représente cette idée.

Le visuel doit avoir un rapport évident avec le problème, la décision, l'action, le conseil ou la situation concrète abordée dans le post.

Ne pas simplement illustrer quelques mots-clés.

Ne pas créer une scène professionnelle générique.

Le visuel doit être suffisamment fort pour attirer l'attention dans un fil LinkedIn ou Facebook tout en restant sobre, professionnel et crédible.

==================================================
RÈGLE DE COMPOSITION PRIORITAIRE
==================================================

UNE IMAGE = UNE IDÉE.

Avant de composer l'illustration :

1. identifier l'idée centrale du post ;
2. choisir UNE situation concrète permettant de l'incarner ;
3. construire toute l'image autour de cette seule situation.

Ne cherche PAS à résumer visuellement tous les arguments du post.

Ne transforme PAS chaque notion importante du texte en un élément graphique différent.

Si le post contient plusieurs concepts — par exemple visibilité, proximité, audience, répétition, confiance, conversion — choisis celui qui permet de créer la scène la plus naturelle et la plus forte.

Une scène simple, crédible et immédiatement compréhensible est toujours préférable à une accumulation de symboles explicatifs.

L'image doit évoquer l'idée du post, pas chercher à l'expliquer entièrement.

==================================================
DIRECTION VISUELLE POUR CETTE GÉNÉRATION
==================================================

- ${sceneDirection};
- ${framingDirection};
- ${humanDirection}.

==================================================
STYLE VISUEL LBMEDIA — RÈGLE PRIORITAIRE
==================================================

Créer une ILLUSTRATION NUMÉRIQUE ÉDITORIALE CONTEMPORAINE.

Le résultat doit être clairement identifiable comme une illustration éditoriale créée pour une publication professionnelle.

CE N'EST PAS UNE PHOTOGRAPHIE.

Ne pas rechercher le photoréalisme.

Ne pas imiter :

- une photographie professionnelle ;
- une banque d'images ;
- un reportage photographique ;
- une publicité corporate générique.

Le style doit associer :

- une représentation figurative et immédiatement compréhensible ;
- des personnages et objets reconnaissables mais volontairement stylisés ;
- des formes légèrement simplifiées ;
- des volumes doux et dessinés ;
- des matières et textures illustrées ;
- des contours subtils lorsque cela améliore la lisibilité ;
- une lumière graphique et éditoriale ;
- une profondeur construite par l'illustration ;
- une composition élégante proche d'une illustration de presse ou de magazine ;
- un niveau de détail intermédiaire.

La stylisation doit être immédiatement perceptible.

Les personnages ne doivent pas avoir une peau, des cheveux ou des vêtements reproduits avec un niveau de détail photographique.

Les lieux ne doivent pas donner l'impression d'avoir été photographiés.

Les ombres, matières, lumières et volumes doivent conserver une interprétation graphique.

Le résultat doit être adulte, élégant et professionnel.

==================================================
NE PAS BASCULER VERS
==================================================

- le cartoon enfantin ;
- la bande dessinée ;
- le dessin humoristique ;
- l'illustration vectorielle plate ;
- les personnages corporate simplistes ;
- l'esthétique SaaS ;
- les pictogrammes ;
- la 3D plastique ;
- le rendu jouet ;
- le collage ;
- l'aquarelle traditionnelle ;
- la peinture classique ;
- le photoréalisme.

==================================================
IDENTITÉ VISUELLE LBMEDIA
==================================================

Les visuels doivent pouvoir appartenir à une même collection éditoriale LBMedia.

Conserver :

- un degré de stylisation cohérent ;
- une sophistication graphique comparable ;
- des compositions éditoriales modernes ;
- une ambiance professionnelle mais accessible ;
- une palette cohérente ;
- une utilisation subtile des couleurs LBMedia.

La palette privilégie :

- bleu nuit profond ;
- bleu soutenu ;
- cyan / bleu lumineux ;
- blanc et tons clairs ;
- quelques couleurs naturelles complémentaires nécessaires à la scène.

Les couleurs LBMedia doivent structurer ou ponctuer l'image sans appliquer un filtre bleu uniforme.

Le visuel doit cependant rester spécifique au sujet de cette publication.

==================================================
DIVERSITÉ ÉDITORIALE
==================================================

Avant de composer l'image, identifier mentalement :

1. quel est le sujet concret du post ;
2. quel problème, constat, conseil ou décision il présente ;
3. quelle situation pourrait traduire visuellement cette idée ;
4. quels éléments permettraient de comprendre la scène sans aucun texte.

Choisir cette situation plutôt qu'une représentation générique du travail de bureau.

==================================================
ÉVITER EN PARTICULIER
==================================================

- une personne seule devant un ordinateur portable ;
- une personne regardant simplement un smartphone ;
- un professionnel pensif devant son écran ;
- deux personnes regardant ensemble un ordinateur sans action significative ;
- un portrait générique dans un bureau ;
- la composition classique personnage + laptop + tasse ;
- la composition personnage + smartphone + laptop ;
- les réunions génériques autour d'un ordinateur ;
- les scènes interchangeables de coworking ;
- les décors de bureau sans rapport précis avec le post ;
- l'esthétique de photographie corporate de banque d'images ;
- le photoréalisme ;
- l'hyperréalisme ;
- les textures photographiques ;
- l'effet reportage photo ;
- les éclairages cinématographiques hyperréalistes ;
- la profondeur de champ photographique artificielle ;
- les compositions qui cherchent à représenter plusieurs concepts simultanément ;
- l'accumulation de métaphores visuelles ;
- les scènes ressemblant à une infographie sans texte ;
- les symboles marketing ajoutés artificiellement dans une scène réaliste ;
- les épingles de géolocalisation ;
- les cibles ;
- les mégaphones symboliques ;
- les groupes de silhouettes représentant une audience ;
- les flèches explicatives ;
- les icônes de synchronisation ;
- les pictogrammes de personnes ;
- les boutons ou commandes fictives ;
- les symboles flottants ;
- les éléments graphiques servant uniquement à expliquer un concept abstrait.

Un ordinateur ou un smartphone peut apparaître comme élément secondaire si la situation l'exige réellement.

Il ne doit pas constituer automatiquement le centre de l'image.

==================================================
DIRECTION ARTISTIQUE
==================================================

- créer une véritable scène éditoriale illustrée ;
- rendu moderne, professionnel, élégant et clairement stylisé ;
- environnement cohérent avec le sujet ;
- privilégier entreprises locales, commerces, ateliers, lieux professionnels, interactions clients, objets et situations concrètes lorsque le sujet le permet ;
- composition suffisamment riche mais aérée ;
- profondeur et perspective ;
- véritable mise en scène ;
- 2 à 4 éléments structurants maximum ;
- ces éléments doivent appartenir naturellement à la même scène ;
- ne jamais ajouter un objet uniquement pour symboliser un mot ou un concept du post ;
- faire comprendre l'idée principale par la scène ;
- utiliser les couleurs LBMedia comme accents ;
- conserver des couleurs naturelles complémentaires ;
- lumière douce interprétée graphiquement ;
- contrastes élégants ;
- détails riches mais simplifiés par l'illustration ;
- éviter le rendu publicitaire artificiel ;
- éviter absolument le rendu photographique ;
- éviter absolument le rendu jouet, plastique, cartoon ou pictogrammes 3D ;
- éviter les compositions minimalistes constituées de quelques objets isolés sur un fond vide.

==================================================
INTERDICTIONS ABSOLUES
==================================================

- AUCUN TEXTE ;
- AUCUNE LETTRE ;
- AUCUN MOT ;
- AUCUN CHIFFRE ;
- AUCUNE TYPOGRAPHIE ;
- AUCUN TITRE ;
- AUCUN SLOGAN ;
- AUCUNE LISTE ;
- AUCUNE INFOGRAPHIE ;
- AUCUN CALENDRIER ;
- AUCUN TABLEAU ;
- AUCUN GRAPHIQUE ;
- AUCUNE CARTE AVEC DU TEXTE ;
- AUCUNE INTERFACE UTILISATEUR ;
- AUCUN FAUX SITE INTERNET ;
- AUCUN ÉCRAN REMPLI D'ÉLÉMENTS ;
- AUCUN LOGO ;
- AUCUNE MARQUE ;
- AUCUN FILIGRANE ;
- AUCUN WIREFRAME ;
- AUCUNE MAQUETTE D'INTERFACE ;
- AUCUN SCHÉMA DE PAGE WEB ;
- AUCUNE CASE À COCHER ;
- AUCUNE COCHE ;
- AUCUN POINT D'INTERROGATION ;
- AUCUN DIAGRAMME ;
- AUCUN SCHÉMA FONCTIONNEL.

Si des documents, carnets, feuilles ou écrans apparaissent, ils doivent rester vierges ou présenter uniquement des formes abstraites non interprétables.

==================================================
CONTRÔLE FINAL AVANT GÉNÉRATION
==================================================

Avant de produire l'image, vérifie mentalement la composition choisie.

Si elle contient plusieurs symboles destinés à expliquer différentes idées du post, simplifie-la.

Si un élément n'aurait aucune raison naturelle d'exister dans la scène représentée, supprime-le.

Si l'image ressemble davantage à une infographie, une publicité conceptuelle ou une démonstration marketing qu'à une illustration éditoriale, recommence la conception avec une scène plus simple.

Le spectateur doit d'abord voir UNE SCÈNE.

Il peut ensuite comprendre l'idée qu'elle évoque.

Il ne doit jamais avoir l'impression de devoir décoder une collection de symboles.

==================================================
RÉSULTAT ATTENDU
==================================================

Une seule illustration éditoriale horizontale.

Format adapté à LinkedIn et Facebook.

Composition équilibrée.

Image suffisamment riche mais aérée.

Facilement recadrable.

Le concept doit provenir du contenu réel du post.

Le résultat final doit être immédiatement identifiable comme une illustration numérique éditoriale LBMedia et ne doit jamais pouvoir être confondu avec une photographie.
`.trim();

    const result =
      await openai.images.generate({
        model: "gpt-image-2",
        prompt,
        size: "1536x1024",
        quality: "medium",
      });

    const imageBase64 =
      result.data?.[0]
        ?.b64_json;

    if (!imageBase64) {
      throw new Error(
        "OpenAI n'a retourné aucun visuel exploitable."
      );
    }

    const imageBuffer =
      Buffer.from(
        imageBase64,
        "base64"
      );

    const fileName =
      `publications/${id}/${Date.now()}.png`;

    const {
      error: uploadError,
    } = await supabaseAdmin
      .storage
      .from("news-visuals")
      .upload(
        fileName,
        imageBuffer,
        {
          contentType:
            "image/png",
          cacheControl:
            "3600",
          upsert: false,
        }
      );

    if (uploadError) {
      throw new Error(
        `Impossible d'enregistrer le visuel : ${uploadError.message}`
      );
    }

    const {
      data: publicUrlData,
    } = supabaseAdmin
      .storage
      .from("news-visuals")
      .getPublicUrl(
        fileName
      );

    const imageUrl =
      publicUrlData.publicUrl;

    if (!imageUrl) {
      throw new Error(
        "Impossible de récupérer l'URL publique du visuel."
      );
    }

    const imageAlt =
      buildImageAlt(
        publication.title,
        publication.content,
        publication.channel
      );

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        image_url:
          imageUrl,
        image_alt:
          imageAlt,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (
      updateError ||
      !updatedPublication
    ) {
      throw new Error(
        updateError?.message ||
          "Le visuel a été créé mais son URL n'a pas pu être enregistrée."
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Visuel généré et enregistré.",
      image_url:
        imageUrl,
      image_alt:
        imageAlt,
      publication:
        updatedPublication,
    });
  } catch (error) {
    console.error(
      "Publication visual generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Pénélope n'a pas pu générer le visuel.",
      },
      {
        status: 500,
      }
    );
  }
}

function getShortSubject(
  content: string
) {
  const cleaned =
    content
      .replace(/https?:\/\/\S+/g, "")
      .replace(/#[\p{L}\p{N}_-]+/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  if (!cleaned) {
    return "Communication et activité des entreprises locales";
  }

  const firstSentence =
    cleaned.split(
      /[.!?]\s/
    )[0];

  return firstSentence
    .slice(0, 180)
    .trim();
}

function buildImageAlt(
  title: string | null,
  content: string,
  channel: string
) {
  const subject =
    title?.trim() ||
    getShortSubject(
      content
    );

  const prefix =
    channel === "linkedin"
      ? "Illustration éditoriale LBMedia pour une publication LinkedIn"
      : "Illustration éditoriale LBMedia pour une publication Facebook";

  const alt =
    `${prefix} sur ${subject}.`;

  if (
    alt.length <= 220
  ) {
    return alt;
  }

  return `${alt
    .slice(0, 216)
    .trimEnd()}...`;
}