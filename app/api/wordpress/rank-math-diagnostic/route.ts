import { NextResponse } from "next/server";

const WORDPRESS_POST_ID = 2468;

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

function getAuthorization(
  username: string,
  appPassword: string
) {
  return `Basic ${Buffer.from(
    `${username}:${appPassword}`
  ).toString("base64")}`;
}

export async function GET() {
  try {
    const {
      wordpressUrl,
      username,
      appPassword,
    } = getWordPressConfig();

    const authorization =
      getAuthorization(
        username,
        appPassword
      );

    const response =
      await fetch(
        `${wordpressUrl}/wp-json/wp/v2/posts/${WORDPRESS_POST_ID}?context=edit`,
        {
          method: "GET",
          headers: {
            Authorization:
              authorization,
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "WordPress a refusé la lecture du modèle.",
          status:
            response.status,
          details:
            data,
        },
        {
          status:
            response.status,
        }
      );
    }

    const meta =
      data?.meta &&
      typeof data.meta === "object"
        ? data.meta
        : {};

    const metaKeys =
      Object.keys(meta);

    const rankMathMeta =
      Object.fromEntries(
        Object.entries(meta).filter(
          ([key]) =>
            key
              .toLowerCase()
              .includes("rank_math")
        )
      );

    return NextResponse.json({
      success: true,
      message:
        "Diagnostic Rank Math terminé.",
      wordpress_post_id:
        WORDPRESS_POST_ID,
      all_meta_keys:
        metaKeys,
      rank_math_meta_keys:
        Object.keys(rankMathMeta),
      rank_math_meta:
        rankMathMeta,
      expected_rank_math_keys: [
        "rank_math_focus_keyword",
        "rank_math_title",
        "rank_math_description",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible d’effectuer le diagnostic Rank Math.",
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