"use client";

export default function ErrorPage({ error, reset }: any) {
    return (
        <div className="p-8 text-red-500 bg-black min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Error Caught!</h1>
            <pre className="bg-gray-900 p-4 rounded overflow-auto">{error?.message}</pre>
            <pre className="bg-gray-900 p-4 mt-4 rounded overflow-auto text-xs">{error?.stack}</pre>
            <button onClick={() => reset()} className="mt-4 px-4 py-2 bg-white text-black font-bold rounded">Retry</button>
        </div>
    );
}
