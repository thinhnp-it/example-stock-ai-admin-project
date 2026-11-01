import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-2xl font-semibold mb-2">404</div>
      <div className="opacity-80 mb-4">Trang không tồn tại.</div>
      <Link className="underline" href="/dashboard">
        Quay về Dashboard
      </Link>
    </div>
  );
}
