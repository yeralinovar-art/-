// Показывается мгновенно при переходе между вкладками, пока сервер готовит экран.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Загрузка" className="animate-pulse">
      <div className="flex items-start justify-between gap-3 pt-4 pb-5">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-32 rounded-full bg-card-muted" />
          <div className="h-8 w-52 rounded-full bg-card-muted" />
        </div>
        <div className="size-11 rounded-full bg-card-muted" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-24 rounded-3xl bg-card" />
        <div className="h-64 rounded-3xl bg-card" />
      </div>
    </div>
  );
}
