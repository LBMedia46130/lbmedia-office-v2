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
        .slice(0, 3000);

    const platform =
      publication.channel ===
      "linkedin"
        ? "LinkedIn"
        : "Facebook";

    /*
     * ÉTAPE 1
     * Pénélope agit comme directrice artistique.
     * Elle analyse le post et construit un brief visuel précis.
     */

    const artDirectionResponse =
      await openai.responses.create({
        model: "gpt-5.4-mini",
        input: `
Tu es la directrice artistique de LBMedia, agence de communication.

Ta mission n'est PAS de créer une image.
Ta mission est de concevoir LE CONCEPT VISUEL le plus pertinent pour accompagner une publication ${platform}.

PUBLICATION :

${postContent}

${
  publication.hashtags
    ? `HASHTAGS : ${publication.hashtags}`
    : ""
}

OBJECTIF :

Lis réellement la publication.

Identifie :
- son sujet précis ;
- son idée principale ;
- le problème ou la question posée ;
- ce que le lecteur doit comprendre ;
- la meilleure manière de transformer cette idée en une image immédiatement compréhensible.

Le concept visuel doit avoir un rapport ÉVIDENT avec le contenu.

TEST OBLIGATOIRE :

Demande-toi :

"Si je voyais uniquement cette image, pourrais-je raisonnablement comprendre de quoi parle cette publication ?"

Puis demande-toi :

"Cette même image pourrait-elle illustrer facilement dix autres sujets sans modification ?"

Si oui, le concept est trop générique : recommence mentalement.

IMPORTANT :

Ne te contente jamais d'illustrer des mots-clés abstraits comme :
- croissance ;
- parcours ;
- stratégie ;
- visibilité ;
- performance ;
- réussite ;
- communication.

Traduis ces notions dans LA SITUATION PRÉCISE décrite par le post.

EXEMPLE DE RAISONNEMENT :

Si une publication explique qu'un site internet peut être joli mais ne générer aucun client, une simple flèche vers des personnes n'est pas suffisante.

Il faut construire une scène qui exprime visuellement :
- l'existence du site ;
- son apparente qualité ;
- l'absence de résultat ;
- ou la différence entre simple présence et efficacité réelle.

Cherche une métaphore visuelle intelligente, mais immédiatement lisible.

Le concept peut utiliser :
- architecture ;
- vitrines ;
- portes ;
- chemins ;
- objets ;
- espaces ;
- interactions ;
- oppositions ;
- transformations ;
- situations professionnelles.

Les personnages ne sont pas obligatoires.

ÉVITER :
- personne devant un ordinateur ;
- smartphone ;
- réunion ;
- bureau générique ;
- flèche abstraite vers des personnes ;
- cible marketing générique ;
- ampoule ;
- fusée ;
- puzzle ;
- poignée de main ;
- graphique ;
- interface informatique ;
- concept corporate interchangeable.

CONTRAINTE :

L'image finale ne devra contenir :
- aucun texte ;
- aucun mot ;
- aucune lettre ;
- aucun chiffre ;
- aucun logo ;
- aucune marque ;
- aucune interface lisible.

RÉPONSE ATTENDUE :

Rédige uniquement un brief visuel en français de 120 à 220 mots.

Le brief doit décrire précisément :
1. LE CONCEPT ;
2. LA SCÈNE ;
3. LES ÉLÉMENTS ESSENTIELS ;
4. CE QUE L'IMAGE DOIT FAIRE COMPRENDRE.

Ne donne pas plusieurs propositions.
Choisis la meilleure.
        `.trim(),
      });

    const visualBrief =
      artDirectionResponse.output_text?.trim();

    if (!visualBrief) {
      throw new Error(
        "Pénélope n'a pas réussi à définir le concept visuel."
      );
    }

    /*
     * ÉTAPE 2
     * Le modèle image reçoit le brief validé conceptuellement
     * et se concentre uniquement sur sa réalisation.
     */

    const imagePrompt = `
Créer UNE ILLUSTRATION ÉDITORIALE HORIZONTALE haut de gamme pour LBMedia.

BRIEF DE LA DIRECTRICE ARTISTIQUE :

${visualBrief}

RÈGLE PRIORITAIRE :

Respecter fidèlement le concept et la scène décrits dans le brief.

Ne pas remplacer le concept par une scène corporate générique.

L'objectif principal est que l'image exprime clairement l'idée définie dans le brief.

STYLE GRAPHIQUE LBMEDIA :

Illustration numérique éditoriale contemporaine.

CE N'EST PAS UNE PHOTOGRAPHIE.

Le rendu doit évoquer :
- une illustration de presse contemporaine ;
- un magazine économique ou professionnel ;
- une agence de communication haut de gamme.

Style :
- figuratif ;
- adulte ;
- élégant ;
- moderne ;
- légèrement stylisé ;
- volumes doux ;
- matières illustrées ;
- profondeur graphique ;
- composition sophistiquée ;
- lumière naturelle et éditoriale.

Éviter le photoréalisme et l'hyperréalisme.

L'image doit clairement rester une illustration.

IDENTITÉ LBMEDIA :

Utiliser subtilement :
- bleu nuit profond ;
- bleu soutenu ;
- cyan lumineux ;
- blanc ;
- tons clairs ;
- couleurs naturelles complémentaires adaptées au sujet.

Pas de filtre bleu uniforme.

COMPOSITION :

- format horizontal ;
- idée principale immédiatement visible ;
- hiérarchie visuelle forte ;
- composition aérée ;
- nombre limité d'éléments ;
- profondeur ;
- lisibilité en petit format ;
- facilement recadrable ;
- pas d'effet spectaculaire inutile.

ÉVITER ABSOLUMENT :

- photographie ;
- photoréalisme ;
- esthétique banque d'images ;
- esthétique publicitaire IA ;
- rayon lumineux spectaculaire ;
- personne seule devant un ordinateur ;
- smartphone comme sujet ;
- réunion corporate ;
- coworking ;
- portrait face caméra ;
- flèche abstraite ;
- cible marketing ;
- fusée ;
- ampoule ;
- puzzle ;
- poignée de main ;
- illustration vectorielle plate ;
- cartoon enfantin ;
- 3D plastique ;
- rendu jouet ;
- infographie.

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
- AUCUNE INTERFACE LISIBLE ;
- AUCUN FAUX SITE INTERNET ;
- AUCUN DOCUMENT LISIBLE.

Si un écran ou document est indispensable au concept, son contenu doit être totalement abstrait et illisible.

RÉSULTAT ATTENDU :

Une image conçue spécifiquement pour CE post.

Le rapport entre le concept visuel et le sujet doit être évident.

Le résultat doit ressembler à une véritable illustration éditoriale commandée par LBMedia, pas à une image générique générée par IA.
    `.trim();

    const result =
      await openai.images.generate({
        model: "gpt-image-2",
        prompt: imagePrompt,
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
      image_url: imageUrl,
      publication:
        updatedPublication,

      // Conservé pour faciliter nos tests.
      // On pourra éventuellement l'afficher plus tard
      // dans Office si cela présente un intérêt.
      visual_brief: visualBrief,
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