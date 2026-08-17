import OpenAI from "openai";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AltTextResponse = {
  image_alt: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getVisualTitle(
  title: string | null,
  content: string
) {
  if (title?.trim()) {
    return title.trim();
  }

  const firstLine =
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

  if (firstLine) {
    return firstLine.slice(0, 300);
  }

  return content
    .trim()
    .slice(0, 300);
}

async function generateImageAlt(
  imageBase64: string
) {
  const response =
    await openai.responses.create({
      model: "gpt-5-mini",

      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Observe cette illustration générée pour une publication LBMedia.

Rédige un texte alternatif en français destiné à l'accessibilité d'une image publiée sur LinkedIn ou Facebook.

RÈGLES

- décris ce qui est réellement visible dans l'image ;
- reste factuel et naturel ;
- indique les éléments visuels principaux et leur relation ;
- ne commence pas par "Image de", "Illustration de" ou "On voit" ;
- ne décris pas l'intention marketing ;
- n'ajoute aucun hashtag ;
- n'ajoute aucun texte qui n'est pas réellement visible ;
- ne mentionne pas LBMedia sauf si la marque apparaît réellement dans l'image ;
- reste concis ;
- vise généralement une phrase de 100 à 220 caractères ;
- le texte doit être immédiatement utilisable comme texte ALT sur un réseau social.

Retourne uniquement un objet JSON valide.
              `.trim(),
            },
            {
              type: "input_image",
              image_url:
                `data:image/png;base64,${imageBase64}`,
              detail: "auto",
            },
          ],
        },
      ],

      text: {
        format: {
          type: "json_schema",
          name: "image_alt",
          strict: true,
          schema: {
            type: "object",
            properties: {
              image_alt: {
                type: "string",
              },
            },
            required: [
              "image_alt",
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
      "Pénélope n'a retourné aucun texte ALT."
    );
  }

  const result =
    JSON.parse(
      rawOutput
    ) as AltTextResponse;

  const imageAlt =
    result.image_alt?.trim();

  if (!imageAlt) {
    throw new Error(
      "Le texte ALT généré est vide."
    );
  }

  return imageAlt;
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
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

    const visualTitle =
      getVisualTitle(
        publication.title,
        publication.content
      );

    const platform =
      publication.channel ===
      "linkedin"
        ? "LinkedIn"
        : "Facebook";

    const prompt = `
Crée une illustration éditoriale horizontale pour accompagner une publication ${platform} de LBMedia.

SUJET DE L'ILLUSTRATION :

« ${visualTitle} »

Interprète librement ce titre et trouve toi-même la meilleure idée visuelle pour représenter clairement et immédiatement son sujet.

Interprète le sens et l'intention du titre, et non ses expressions au sens littéral.

Ne transforme pas une métaphore verbale en représentation littérale.

Par exemple, si le titre demande si un site internet "travaille" pour une entreprise, ne représente pas le site comme une machine, un robot, une usine ou une chaîne de production.

L'image doit illustrer le sujet concret et l'enjeu exprimé par le titre.

L'illustration doit rester directement ancrée dans le sujet du titre.

Si le titre parle d'un site internet, le visuel doit clairement évoquer un site internet.

Si le titre parle de radio, le visuel doit clairement évoquer la radio.

Si le titre parle de référencement, de recherche ou de visibilité en ligne, le visuel doit clairement évoquer cet univers.

Si le titre parle d'intelligence artificielle, le visuel doit clairement évoquer ce sujet.

Ne remplace pas le sujet concret par une métaphore générique.

STYLE :

Illustration numérique éditoriale contemporaine, professionnelle, élégante et moderne.

Le rendu doit être illustré et légèrement stylisé, comme une illustration créée pour un média professionnel ou une agence de communication.

Ce n'est pas une photographie.

Éviter le photoréalisme, les banques d'images corporate et les clichés visuels génériques.

Privilégier une illustration éditoriale premium et naturelle.

Éviter l'esthétique technologique générique :
- robots ;
- engrenages ;
- circuits ;
- mécanismes ;
- univers SaaS ;
- imagerie artificiellement futuriste ;

sauf si le sujet porte réellement sur ces éléments.

IDENTITÉ LBMEDIA :

Utiliser naturellement et avec subtilité une palette comprenant :
- bleu nuit ;
- bleu soutenu ;
- cyan lumineux ;
- blanc et tons clairs ;
- autres couleurs naturelles si elles servent l'illustration.

Le bleu ne doit pas devenir un filtre uniforme.

COMPOSITION :

- format horizontal ;
- sujet immédiatement identifiable ;
- composition claire et aérée ;
- visuel professionnel ;
- suffisamment fort pour attirer l'attention dans un fil LinkedIn ou Facebook.

Aucun texte lisible.
Aucun titre.
Aucun slogan.
Aucun logo.
Aucune marque.
Aucun filigrane.

Si un écran, une page web ou une interface est utile pour représenter le sujet, ils sont AUTORISÉS, mais leur contenu doit rester graphique, abstrait et sans texte lisible.

Le résultat doit avant tout être une bonne illustration du sujet :

« ${visualTitle} »
    `.trim();

    const result =
      await openai.images.generate({
        model: "gpt-image-2",
        prompt,
        size: "1536x1024",
        quality: "medium",
      });

    const imageBase64 =
      result.data?.[0]?.b64_json;

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

    const imageAlt =
      await generateImageAlt(
        imageBase64
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
      .getPublicUrl(fileName);

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
        image_alt: imageAlt,
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
          "Le visuel a été créé mais ses informations n’ont pas pu être enregistrées."
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Visuel et texte ALT générés et enregistrés.",
      image_url: imageUrl,
      image_alt: imageAlt,
      publication:
        updatedPublication,
      visual_title: visualTitle,
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