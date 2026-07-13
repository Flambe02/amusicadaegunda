// Catalog column headers. Widths mirror SongCatalogRow exactly so the labels
// align with the row content beneath each month group.
export default function SongCatalogHeader() {
  return (
    <div className="flex items-center gap-3 px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
      <div className="min-w-0 flex-1">Música</div>
      <div className="hidden w-[130px] flex-shrink-0 sm:block">Categoria</div>
      <div className="hidden w-[115px] flex-shrink-0 md:block">Karaokê</div>
      <div className="hidden w-[120px] flex-shrink-0 sm:block">Status</div>
      <div className="w-[168px] flex-shrink-0 text-right">Ações</div>
    </div>
  );
}
