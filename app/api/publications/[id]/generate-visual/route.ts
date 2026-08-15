import OpenAI from "openai";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const visualSceneDirections = [
  "une scène professionnelle ou commerciale concrète directement liée à l'idée principale du post",
  "une interaction naturelle entre plusieurs personnes dans une situation directement liée au sujet",
  "une composition éditoriale centrée sur une action, des objets, des documents ou des éléments métier liés au sujet",
  "une scène locale ou professionnelle en plan large avec un environnement crédible et plusieurs niveaux de lecture",
  "une métaphore visuelle simple et immédiatement compréhensible représentant l'idée principale du post",
  "une composition construite autour d'objets, de matières ou de situations professionnelles spécifiques au sujet",
];

const visualFramings = [
  "plan large avec environnement visible et profondeur",
  "plan moyen naturel avec une composition éditoriale travaillée",
  "cadrage légèrement décentré avec le sujet placé sur un tiers de l'image",
  "vue immersive avec premier plan, plan intermédiaire et arrière-plan",
  "cadrage rapproché sur une action ou des détails métier",
  "composition horizontale laissant respirer la scène",
];

function getRandomItem<T>(
  items: T[]
): T {
  return items[
    Math.floor(
      Math.random() * items.length
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
      .select(`
        id,
        channel,
        title,
        content,
        hashtags,
        image_url
      `)
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
            "La génération de visuel est réservée aux publications LinkedIn et Facebook.",
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
            "Le contenu du post doit être rédigé avant de générer un visuel.",
        },
        {
          status: 400,
        }
      );
    }

    const postContent =
      publication.content
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 2200);

    const sceneDirection =
      getRandomItem(
        visualSceneDirections
      );

    const framingDirection =
      getRandomItem(
        visualFramings
      );

    const platform =
      publication.channel ===
      "linkedin"
        ? "LinkedIn"
        : "Facebook";

    const prompt = `
Créer UNE ILLUSTRATION ÉDITORIALE HORIZONTALE pour accompagner une publication ${platform} de LBMedia.

CONTENU DU POST :

${postContent}

${
  publication.hashtags
    ? `THÉMATIQUES COMPLÉMENTAIRES : ${publication.hashtags}`
    : ""
}

OBJECTIF :

Comprendre d'abord l'idée principale du post.

Créer ensuite UNE scène visuelle forte, simple à comprendre et directement liée à cette idée.

Le visuel ne doit pas simplement illustrer des mots-clés.
Il doit représenter une situation, une idée, un problème ou une action concrète évoquée dans le post.

DIRECTION VISUELLE :

- ${sceneDirection};
- ${framingDirection}.

STYLE VISUEL LBMEDIA — RÈGLE PRIORITAIRE :

Créer une ILLUSTRATION NUMÉRIQUE ÉDITORIALE CONTEMPORAINE.

CE N'EST PAS UNE PHOTOGRAPHIE.

Le résultat doit ressembler à une illustration réalisée pour un média professionnel, une agence de communication ou une publication éditoriale haut de gamme.

Style :

- figuratif ;
- adulte ;
- moderne ;
- élégant ;
- professionnel ;
- immédiatement compréhensible ;
- clairement illustré et non photographique ;
- volumes doux ;
- matières légèrement stylisées ;
- profondeur graphique ;
- lumière éditoriale ;
- détails suffisamment riches sans tomber dans le photoréalisme.

IDENTITÉ VISUELLE LBMEDIA :

Utiliser de manière subtile et naturelle :

- bleu nuit profond ;
- bleu soutenu ;
- cyan / bleu lumineux ;
- blanc et tons clairs ;
- couleurs naturelles complémentaires adaptées à la scène.

Les couleurs LBMedia doivent ponctuer la composition sans créer un filtre bleu uniforme.

ÉVITER ABSOLUMENT :

- photographie ;
- photoréalisme ;
- banque d'images corporate ;
- personne seule devant un ordinateur ;
- personne seule regardant son smartphone ;
- réunions génériques autour d'un laptop ;
- pose face caméra ;
- coworking générique ;
- esthétique SaaS ;
- illustration vectorielle plate ;
- cartoon enfantin ;
- 3D plastique ;
- rendu jouet ;
- pictogrammes ;
- collage ;
- infographie.

PRIVILÉGIER :

- situations professionnelles concrètes ;
- commerces ;
- entreprises locales ;
- ateliers ;
- interactions clients ;
- objets métier ;
- documents sans texte ;
- lieux professionnels ;
- actions réelles ;
- compositions avec profondeur ;
- scènes qui racontent quelque chose.

INTERDICTIONS ABSOLUES :

- AUCUN TEXTE ;
- AUCUNE LETTRE ;
- AUCUN MOT ;
- AUCUN CHIFFRE ;
- AUCUNE TYPOGRAPHIE ;
- AUCUN TITRE ;
- AUCUN SLOGAN ;
- AUCUN LOGO ;
- AUCUNE MARQUE ;
- AUCUN FILIGRANE ;
- AUCUNE INFOGRAPHIE ;
- AUCUN GRAPHIQUE ;
- AUCUNE INTERFACE ;
- AUCUN FAUX SITE INTERNET ;
- AUCUN WIREFRAME ;
- AUCUN ÉCRAN AVEC DU TEXTE ;
- AUCUN DOCUMENT LISIBLE.

Si des documents, écrans ou supports apparaissent, ils doivent être vierges ou ne contenir que des formes abstraites non interprétables.

Le visuel doit pouvoir fonctionner seul dans un fil LinkedIn ou Facebook.

Format horizontal.
Composition équilibrée.
Sujet lisible immédiatement.
Image suffisamment riche mais aérée.
Facilement recadrable.

Le résultat final doit appartenir clairement à la même famille graphique que les illustrations éditoriales LBMedia.
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
    } = await supabaseAdmin.storage
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
        `Impossible d’enregistrer le visuel : ${uploadError.message}`
      );
    }

    const {
      data: publicUrlData,
    } = supabaseAdmin.storage
      .from("news-visuals")
      .getPublicUrl(
        fileName
      );

    const imageUrl =
      publicUrlData.publicUrl;

    if (!imageUrl) {
      throw new Error(
        "Impossible de récupérer l’URL publique du visuel."
      );
    }

    const {
      data: updatedPublication,
      error: updateError,
    } = await supabaseAdmin
      .from("publications")
      .update({
        image_url: imageUrl,
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
          "Le visuel a été créé mais son URL n’a pas pu être enregistrée."
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Visuel généré et enregistré.",
      image_url:
        imageUrl,
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
          "Pénélope n'a pas pu générer le visuel.",
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