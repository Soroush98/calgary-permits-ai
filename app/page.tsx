import QueryApp from './QueryApp';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold">Calgary Permits</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Ask a question about 488K Calgary building permits. The AI writes SQL, we run it read-only, you see rows and a map.
        </p>
        <QueryApp />
      </div>
    </main>
  );
}
