import { renderEditor } from "@/lib/editor-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return renderEditor("artists", (await params).id);
}
