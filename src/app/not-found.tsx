// src/app/not-found.tsx

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-extrabold text-red-600 mb-4">404</h1>
      <p className="text-xl text-gray-700 mb-2">
        This page could not be found.
      </p>
      <a href="/" className="text-sky-600 hover:underline mt-4">
        ← Go back home
      </a>
    </div>
  );
}
