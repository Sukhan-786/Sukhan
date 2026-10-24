import { renderEditor } from "@/lib/editor-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return renderEditor("media", (await params).id);
}
