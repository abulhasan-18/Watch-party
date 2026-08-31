import Link from "next/link";
import { Film, ArrowLeft, Plus } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-4 text-center selection:bg-pink-500/30 selection:text-pink-200">
      <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-6">
        <Film className="w-8 h-8" />
      </div>
      <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500 mb-3">
        404
      </h1>
      <h2 className="text-xl font-bold text-white mb-2">Room Not Found</h2>
      <p className="text-sm text-slate-400 max-w-md mb-8">
        The watch room you are looking for does not exist, may have expired, or the room ID was entered incorrectly.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back Home
        </Link>
        <Link
          href="/create-room"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-sm font-semibold text-white shadow-lg shadow-pink-600/30 transition"
        >
          <Plus className="w-4 h-4" /> Create a New Room
        </Link>
      </div>
    </div>
  );
}
