import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getRecentWebsiteAudits,
} from "@/lib/website-audits";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest
) {
  try {
    const rawLimit =
      request.nextUrl.searchParams.get(
        "limit"
      );

    const parsedLimit =
      rawLimit
        ? Number(
            rawLimit
          )
        : 50;

    const limit =
      Number.isFinite(
        parsedLimit
      )
        ? parsedLimit
        : 50;

    const audits =
      await getRecentWebsiteAudits(
        limit
      );

    return NextResponse.json({
      success: true,
      audits,
    });
  } catch (error) {
    console.error(
      "Recent website audits error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger les audits enregistrés.",
      },
      {
        status: 500,
      }
    );
  }
}
