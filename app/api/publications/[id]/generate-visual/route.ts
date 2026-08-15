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
        .slice(0, 2400);

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

MISSION CRÉATIVE :

Ne pas commencer par imaginer une scène.

Commencer par comprendre le MESSAGE du post.

Identifier mentalement :

1. quelle est l'idée principale ;
2. quel problème ou quelle question le post pose ;
3. quelle opposition, tension ou transformation il évoque ;
4. quelle image pourrait rendre cette idée compréhensible immédiatement, même sans lire le texte.

Ensuite seulement, concevoir UNE métaphore visuelle ou UNE situation éditoriale forte.

Le visuel doit apporter une idée.
Il ne doit pas seulement décorer le post.

PRIORITÉ ABSOLUE :

Créer une image qui illustre LE CONCEPT du post, et non son secteur d'activité.

Exemples de logique attendue :

- si le post parle d'un site internet inutile, montrer une présence numérique qui existe mais n'attire personne ;
- si le post parle de visibilité, montrer une différence claire entre être présent et être réellement vu ;
- si le post parle de conversion, montrer un passage d'une simple présence à une action concrète ;
- si le post parle de communication inefficace, montrer un message qui existe mais n'atteint pas sa cible ;
- si le post parle d'un choix ou d'une décision, construire une image autour de cette tension.

Ces exemples illustrent une méthode de réflexion.
Ne pas les reproduire automatiquement.

STYLE LBMEDIA :

Créer une ILLUSTRATION NUMÉRIQUE ÉDITORIALE CONTEMPORAINE.

Le résultat doit être immédiatement identifiable comme une illustration de presse ou de magazine professionnel.

CE N'EST PAS UNE PHOTOGRAPHIE.

Le rendu doit être :

- adulte ;
- élégant ;
- moderne ;
- éditorial ;
- conceptuel mais lisible ;
- figuratif ;
- crédible ;
- légèrement stylisé ;
- visuellement sophistiqué ;
- distinct d'une banque d'images ;
- distinct d'une illustration corporate générique.

La stylisation doit être visible.

Les volumes, matières, lumières et personnages doivent rester illustrés.

Ne jamais chercher un rendu hyperréaliste.

DIRECTION ARTISTIQUE :

- composition claire et forte ;
- une idée visuelle principale ;
- peu d'éléments, mais chacun doit avoir une fonction ;
- profondeur et perspective ;
- cadrage moderne ;
- composition horizontale ;
- hiérarchie visuelle nette ;
- contraste suffisant pour fonctionner dans un fil LinkedIn ou Facebook ;
- image lisible même en taille réduite ;
- éviter les scènes trop narratives ou trop cinématographiques ;
- éviter les rayons lumineux spectaculaires ou effets dramatiques artificiels ;
- éviter toute esthétique "pub IA".

IDENTITÉ VISUELLE LBMEDIA :

Palette récurrente mais subtile :

- bleu nuit profond ;
- bleu soutenu ;
- cyan / bleu lumineux ;
- blanc ;
- tons clairs ;
- couleurs naturelles complémentaires selon le sujet.

Les couleurs LBMedia doivent structurer ou ponctuer l'image.

Ne pas appliquer un filtre bleu uniforme.

Ne pas utiliser systématiquement un décor de bureau ou de commerce.

La cohérence LBMedia doit venir surtout :

- du niveau de stylisation ;
- de la sophistication graphique ;
- de la palette ;
- de la qualité de composition ;
- du caractère éditorial.

À ÉVITER ABSOLUMENT :

- photographie ;
- photoréalisme ;
- hyperréalisme ;
- rendu cinématographique spectaculaire ;
- lumière dramatique artificielle ;
- rayon lumineux symbolique ;
- banque d'images corporate ;
- personne seule devant un ordinateur ;
- personne seule avec un smartphone ;
- professionnel pensif devant son écran ;
- commerçant regardant simplement passer des clients ;
- réunion générique ;
- coworking générique ;
- portrait corporate ;
- personnage face caméra ;
- laptop comme sujet principal ;
- smartphone comme sujet principal ;
- scène de bureau sans lien précis avec l'idée ;
- esthétique SaaS ;
- illustration vectorielle plate ;
- cartoon ;
- 3D plastique ;
- rendu jouet ;
- pictogrammes ;
- collage ;
- infographie.

PRIVILÉGIER :

- métaphores visuelles intelligentes ;
- contrastes avant / après ;
- obstacle / passage ;
- visible / invisible ;
- présence / efficacité ;
- diffusion / réception ;
- parcours / destination ;
- ouverture / blocage ;
- mouvement / stagnation ;
- situations éditoriales simples et symboliques ;
- objets ou environnements utilisés de manière conceptuelle ;
- interactions humaines uniquement si elles sont nécessaires à l'idée.

LES PERSONNES NE SONT PAS OBLIGATOIRES.

Si une idée peut être mieux exprimée sans personnage, privilégier une composition sans personnage principal.

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
- AUCUN DOCUMENT LISIBLE ;
- AUCUN ÉLÉMENT QUI RESSEMBLE À UNE CAPTURE D'ÉCRAN.

Si des documents ou écrans apparaissent, ils doivent rester abstraits et non lisibles.

RÉSULTAT ATTENDU :

Une illustration éditoriale forte, conceptuelle, immédiatement lisible et suffisamment distinctive pour que l'on puisse reconnaître progressivement une famille de visuels LBMedia.

Le visuel doit donner envie de s'arrêter sur le post.

Il doit sembler avoir été pensé par un directeur artistique pour CE contenu précis.

Format horizontal.
Composition équilibrée.
Sujet lisible immédiatement.
Facilement recadrable.
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