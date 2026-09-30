import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center h-16 px-6 md:px-10 bg-brand-navy text-white shadow-sm w-full gap-8">
      
      {/* 1. Logo "Ticket-U" */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
          <span className="text-brand-navy font-bold text-xl leading-none">U</span>
        </div>
        <span className="font-bold text-xl tracking-wide">Ticket-U</span>
      </div>
      
      {/* 2. Enlaces de Navegación */}
      <nav className="hidden md:flex items-center gap-6 ml-2">
        <Link href="/" className="text-sm font-medium hover:text-white/80 transition-colors">
          Inicio
        </Link>
        <Link href="/" className="text-sm font-medium hover:text-white/80 transition-colors">
          Mis eventos
        </Link>
        
        {/* Elemento Activo (Destacado como en la imagen, aplicado a Promociones) */}
        <Link href="/" className="text-sm font-medium bg-white/20 px-3 py-1.5 rounded-md transition-colors">
          Promociones
        </Link>
        
        <Link href="/" className="text-sm font-medium hover:text-white/80 transition-colors">
          Configuración
        </Link>
        <Link href="/" className="text-sm font-medium hover:text-white/80 transition-colors">
          Mi cuenta
        </Link>
      </nav>
      
    </header>
  );
}