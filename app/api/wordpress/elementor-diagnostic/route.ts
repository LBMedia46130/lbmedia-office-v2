import { NextResponse } from "next/server";

function getWordPressConfig() {
  const wordpressUrl =
    process.env.WORDPRESS_URL;

  const username =
    process.env.WORDPRESS_USERNAME;

  const appPassword =
    process.env.WORDPRESS_APP_PASSWORD;

  if (
    !wordpressUrl ||
    !username ||
    !appPassword
  ) {
    throw new Error(
      "Configuration WordPress incomplète."
    );
  }

  return {
    wordpressUrl:
      wordpressUrl.replace(/\/+$/, ""),
    username,
    appPassword,
  };
}

export async function GET() {
  try {
    const {
      wordpressUrl,
      username,
      appPassword,
    } = getWordPressConfig();

    const authorization =
      Buffer.from(
        `${username}:${appPassword}`
      ).toString("base64");

    const response =
      await fetch(
        `${wordpressUrl}/wp-json/wp/v2/posts/2468?context=edit`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Basic ${authorization}`,
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    const rawResponse =
      await response.text();

    let wordpressData:
      unknown = null;

    try {
      wordpressData =
        rawResponse
          ? JSON.parse(
              rawResponse
            )
          : null;
    } catch {
      wordpressData =
        rawResponse;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "WordPress a refusé la lecture authentifiée du modèle Elementor.",
          status:
            response.status,
          details:
            wordpressData,
        },
        {
          status:
            response.status,
        }
      );
    }

    if (
      !wordpressData ||
      typeof wordpressData !==
        "object" ||
      Array.isArray(
        wordpressData
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "WordPress a répondu, mais le format reçu est inattendu.",
          details:
            wordpressData,
        },
        {
          status: 502,
        }
      );
    }

    const data =
      wordpressData as Record<
        string,
        unknown
      >;

    const meta =
      data.meta &&
      typeof data.meta ===
        "object" &&
      !Array.isArray(data.meta)
        ? (data.meta as Record<
            string,
            unknown
          >)
        : null;

    const metaKeys =
      meta
        ? Object.keys(meta)
        : [];

    const elementorMetaKeys =
      metaKeys.filter(
        (key) =>
          key
            .toLowerCase()
            .includes(
              "elementor"
            )
      );

    return NextResponse.json({
      success: true,
      message:
        "Lecture authentifiée du modèle WordPress réussie.",
      template: {
        id:
          data.id ?? null,
        status:
          data.status ?? null,
        slug:
          data.slug ?? null,
        link:
          data.link ?? null,
        title:
          data.title ?? null,
        content:
          data.content ?? null,
      },
      diagnostics: {
        has_meta:
          Boolean(meta),
        meta_keys:
          metaKeys,
        elementor_meta_keys:
          elementorMetaKeys,
        has_elementor_meta:
          elementorMetaKeys.length >
          0,
      },
      meta,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de diagnostiquer le modèle Elementor WordPress.",
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
