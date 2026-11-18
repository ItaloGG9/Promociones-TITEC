
import { NextRequest, NextResponse } from "next/server";

// Revisar las solicitudes a Promociones
export function proxy(req: NextRequest) {
  
  // Obtener el origen y el host de la solicitud
  const origen = req.headers.get("origin");
  const host = req.headers.get("host");

  // Comprobar que la solicitud venga del mismo host y puerto
  if (origen) {
    let permitido = false;

    try {
      permitido = new URL(origen).host === host;
    } catch {
      permitido = false;
    }

    if (!permitido) {
      return NextResponse.json(
        { mensaje: "Origen no permitido" },
        { status: 403 }
      );
    }
  }


  // Preparar las cabeceras para el Gateway
  const headers = new Headers(req.headers);

  // No enviar el Origin del navegador en la comunicación interna
  headers.delete("origin");

  return NextResponse.next({
    request: {
      headers
    }
  });
}

// Aplicar solamente a las rutas de Promociones
export const config = {
  matcher: "/api/promociones/:path*"
};
