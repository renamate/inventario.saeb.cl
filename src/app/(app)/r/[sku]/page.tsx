import { redirect } from "next/navigation";

export default async function EtiquetaQrPage({ params }: PageProps<"/r/[sku]">) {
  const { sku } = await params;
  redirect(`/registrar?sku=${encodeURIComponent(sku)}`);
}
