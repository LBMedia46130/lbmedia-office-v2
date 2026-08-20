import { NextResponse } from "next/server";

import {
  getAllZohoInvoices,
} from "@/lib/zoho-books";

function roundCurrency(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}

export async function GET() {
  try {
    const zohoInvoices =
      await getAllZohoInvoices();

    const invoices =
      zohoInvoices.map((invoice) => ({
        invoice_id: invoice.invoice_id,
        invoice_number:
          invoice.invoice_number,
        customer_id:
          invoice.customer_id,
        customer_name:
          invoice.customer_name,
        status: invoice.status,
        date: invoice.date,
        due_date: invoice.due_date,
        total: invoice.total,
        balance: invoice.balance,
        currency_code:
          invoice.currency_code ?? "EUR",
        reminders_sent:
          invoice.reminders_sent ?? 0,
        last_reminder_sent_date:
          invoice.last_reminder_sent_date ??
          null,
      }));

    const totals = invoices.reduce(
      (acc, invoice) => {
        const balance =
          Number(invoice.balance) || 0;

        if (balance <= 0) {
          return acc;
        }

        acc.outstanding += balance;

        if (invoice.status === "overdue") {
          acc.overdue += balance;
          acc.overdueCount += 1;
        }

        return acc;
      },
      {
        outstanding: 0,
        overdue: 0,
        overdueCount: 0,
      }
    );

    return NextResponse.json({
      success: true,
      count: invoices.length,
      totals: {
        outstanding: roundCurrency(
          totals.outstanding
        ),
        overdue: roundCurrency(
          totals.overdue
        ),
        overdueCount:
          totals.overdueCount,
      },
      invoices,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur Zoho Books inconnue.",
      },
      { status: 500 }
    );
  }
}