"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function VistaComprador() {
  const [promoSeleccionada, setPromoSeleccionada] = useState<string | null>(null);
  const [rut, setRut] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ descuento: number; mensaje: string } | null>(null);

  const validarYContinuar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoSeleccionada) return;

    setLoading(true);
    setErrorMsg(null);
    setResultado(null);

    try {
      const response = await fetch(`http://localhost:3005/promociones/validar/${promoSeleccionada}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_evento: "evt-123",
          cantidad_entradas: 2,
          precio_base: 15000,
          usuario: {
            id_usuario: rut || "usr-anon",
            rol_usuario: "cliente"
          }
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.valido) {
        throw new Error(data.error || data.mensaje || "El cupón no es válido o ha expirado");
      }

      setResultado({
        descuento: data.porcentaje_descuento,
        mensaje: `¡Cupón ${promoSeleccionada} aplicado con éxito!`
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con el servicio de promociones");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-[800px] mx-auto font-sans">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#0f172a] uppercase mb-2">
          Noche de Rock Sinfónico
        </h1>
        <p className="text-gray-500">Selecciona una promoción para tu entrada</p>
      </div>

      <div className="grid gap-4 mb-8">
        {/* Opcion 1: Valido */}
        <div 
          onClick={() => { setPromoSeleccionada("DESC50"); setErrorMsg(null); setResultado(null); }}
          className={`cursor-pointer border-2 rounded-xl p-5 transition-all flex items-center justify-between ${
            promoSeleccionada === "DESC50" ? "border-indigo-600 bg-indigo-50/50" : "border-gray-200 hover:border-indigo-300 bg-white"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0">
              <span className="font-bold">50%</span>
            </div>
            <div>
              <h3 className="font-bold text-[#0f172a]">Preventa Exclusiva</h3>
              <p className="text-sm text-gray-500">Código: DESC50</p>
            </div>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${promoSeleccionada === "DESC50" ? "border-indigo-600" : "border-gray-300"}`}>
            {promoSeleccionada === "DESC50" && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
          </div>
        </div>

        {/* Opcion 2: Expirado para probar manejo de errores UI2 */}
        <div 
          onClick={() => { setPromoSeleccionada("EXPIRADO30"); setErrorMsg(null); setResultado(null); }}
          className={`cursor-pointer border-2 rounded-xl p-5 transition-all flex items-center justify-between ${
            promoSeleccionada === "EXPIRADO30" ? "border-indigo-600 bg-indigo-50/50" : "border-gray-200 hover:border-indigo-300 bg-white"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center text-white shrink-0">
              <span className="font-bold">30%</span>
            </div>
            <div>
              <h3 className="font-bold text-[#0f172a]">Promoción Anticipada</h3>
              <p className="text-sm text-gray-500">Código: EXPIRADO30 (Inactivo)</p>
            </div>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${promoSeleccionada === "EXPIRADO30" ? "border-indigo-600" : "border-gray-300"}`}>
            {promoSeleccionada === "EXPIRADO30" && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
          </div>
        </div>
      </div>

      {promoSeleccionada && (
        <form onSubmit={validarYContinuar} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-[#0f172a]">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold">Validación de usuario y cupón</h3>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0f172a] mb-1.5">RUT / Documento de Identidad</label>
            <input 
              required
              type="text" 
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="Ej. 12345678-9" 
              className="w-full h-11 px-3 rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              Las promociones son verificadas en tiempo real contra el microservicio.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resultado && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{resultado.mensaje} Descuento obtenido: <strong>{resultado.descuento}%</strong></span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Verificando con backend...
              </>
            ) : (
              <>
                Validar y Pagar <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      )}
    </main>
  );
}