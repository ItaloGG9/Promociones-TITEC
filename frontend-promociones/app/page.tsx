"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import PromoTicketCard from "./components/PromoTicketCard";

const MOCK_PROMOCIONES = [
  {
    id: 1,
    codigo: "ROCKSINF20",
    descuento: "20%",
    descripcion: "[Noche de Rock Sinfónico] - Descuento en preventa para localidades Platea Alta y Galería.",
    condiciones: "Máximo 2 entradas por transacción.",
    validoHasta: "15 Oct 2026",
    isActiva: true,
    stockTotal: 100,
    stockUsado: 85,
  },
  {
    id: 2,
    codigo: "ESTUDIANTE",
    descuento: "30%",
    descripcion: "[Festival Indie Valparaíso] - Beneficio exclusivo con acreditación universitaria vigente.",
    condiciones: "Presentar credencial en acceso.",
    validoHasta: "20 Oct 2026",
    isActiva: true,
    stockTotal: 50,
    stockUsado: 12,
  },
  {
    id: 3,
    codigo: "PACKDUO",
    descuento: "2x1",
    descripcion: "[Standup Comedy Local] - Lleva 2 entradas al precio de 1 en localidad Cancha General.",
    condiciones: "Cupos limitados a 100 promociones.",
    validoHasta: "01 Nov 2026",
    isActiva: false,
    stockTotal: 100,
    stockUsado: 100,
  }
];

export default function Home() {
  const [promociones, setPromociones] = useState(MOCK_PROMOCIONES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tipoDescuento, setTipoDescuento] = useState("Porcentaje (%)");
  
  const [promoEditando, setPromoEditando] = useState<any>(null);

  const toggleEstadoPromocion = (id: number) => {
    setPromociones(promociones.map(promo => {
      if (promo.id === id) {
        return { ...promo, isActiva: !promo.isActiva };
      }
      return promo;
    }));
  };

  const handleAbrirEdicion = (id: number) => {
    const promo = promociones.find(p => p.id === id);
    if (promo) {
      setPromoEditando(promo);
      if (promo.descuento === "2x1") setTipoDescuento("2x1");
      else if (promo.descuento.includes("%")) setTipoDescuento("Porcentaje (%)");
      else setTipoDescuento("Monto Fijo ($)");
      setIsModalOpen(true);
    }
  };

  const handleGuardarPromocion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const codigo = formData.get("codigo") as string;
    const evento = formData.get("evento") as string;
    const valor = formData.get("valor") as string;
    const stock = Number(formData.get("stock"));
    const descripcion = formData.get("descripcion") as string;
    const fechaInput = formData.get("fechaLimite") as string;

    // Formatear descuento
    let descuentoFormateado = tipoDescuento === "2x1" ? "2x1" : 
                              tipoDescuento === "Porcentaje (%)" ? `${valor}%` : `$${valor}`;

    // Formatear fecha (De YYYY-MM-DD a DD Mes YYYY)
    const [year, month, day] = fechaInput.split("-");
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const fechaFormateada = `${day} ${meses[parseInt(month) - 1]} ${year}`;

    const promoGuardada = {
      id: promoEditando ? promoEditando.id : Date.now(),
      codigo: codigo.toUpperCase(),
      descuento: descuentoFormateado,
      descripcion: `[${evento}] - ${descripcion}`,
      condiciones: "Uso único por usuario verificado.",
      validoHasta: fechaFormateada,
      isActiva: promoEditando ? promoEditando.isActiva : true,
      stockTotal: stock,
      stockUsado: promoEditando ? promoEditando.stockUsado : 0,
    };

    if (promoEditando) {
      setPromociones(promociones.map(p => p.id === promoEditando.id ? promoGuardada : p));
    } else {
      setPromociones([promoGuardada, ...promociones]);
    }

    setIsModalOpen(false);
    setPromoEditando(null);
    setTipoDescuento("Porcentaje (%)");
  };

  const getValoresPorDefecto = () => {
    if (!promoEditando) return { evento: "", codigo: "", valor: "", stock: "", descripcion: "", fechaLimite: "" };
    
    const eventoMatch = promoEditando.descripcion.match(/\[(.*?)\]/);
    const evento = eventoMatch ? eventoMatch[1] : "";
    const descripcion = promoEditando.descripcion.replace(/\[.*?\]\s*-\s*/, "");
    const valor = promoEditando.descuento.replace(/[^0-9]/g, "");
    
    // Des-formatear fecha para el input type="date"
    let fechaLimite = "";
    if (promoEditando.validoHasta) {
      const partes = promoEditando.validoHasta.split(" ");
      if (partes.length === 3) {
        const mesIndex = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].indexOf(partes[1]) + 1;
        const mesFormateado = mesIndex < 10 ? `0${mesIndex}` : `${mesIndex}`;
        fechaLimite = `${partes[2]}-${mesFormateado}-${partes[0]}`;
      }
    }
    
    return { evento, codigo: promoEditando.codigo, valor, stock: promoEditando.stockTotal, descripcion, fechaLimite };
  };

  const defaults = getValoresPorDefecto();

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-[1200px] mx-auto relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-brand-navy uppercase tracking-wide">
          Gestión de Promociones
        </h1>
      </div>

      <div className="bg-brand-light rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-brand-border mb-8">
        <div>
          <p className="text-xs font-bold text-status-neutral-text uppercase tracking-wider mb-1">
            Panel Global
          </p>
          <h2 className="text-xl font-bold text-brand-navy">
            Todas las promociones
          </h2>
        </div>
        <button 
          onClick={() => {
            setPromoEditando(null);
            setTipoDescuento("Porcentaje (%)");
            setIsModalOpen(true);
          }}
          className="bg-brand-navy hover:bg-[#1a294d] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-2" />
          Nueva Promoción
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {promociones.map((promo) => (
          <PromoTicketCard 
            key={promo.id}
            id={promo.id} 
            codigo={promo.codigo}
            descuento={promo.descuento}
            descripcion={promo.descripcion}
            condiciones={promo.condiciones}
            validoHasta={promo.validoHasta}
            isActiva={promo.isActiva}
            stockTotal={promo.stockTotal}
            stockUsado={promo.stockUsado}
            onToggleActiva={toggleEstadoPromocion}
            onEditar={handleAbrirEdicion}
          />
        ))}
        {promociones.length === 0 && (
          <p className="text-center text-status-neutral-text py-10">No hay promociones activas.</p>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form 
            onSubmit={handleGuardarPromocion}
            className="bg-white rounded-xl shadow-xl w-full max-w-[520px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <h2 className="text-lg font-bold text-brand-navy">
                {promoEditando ? "Editar Promoción" : "Crear Nueva Promoción"}
              </h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-brand-light rounded-md text-status-neutral-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-1.5">Seleccionar Evento</label>
                <select 
                  name="evento"
                  defaultValue={defaults.evento}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all bg-white text-gray-700"
                >
                  <option value="">-- Elige un evento --</option>
                  <option value="Noche de Rock Sinfónico">Noche de Rock Sinfónico</option>
                  <option value="Festival Indie Valparaíso">Festival Indie Valparaíso</option>
                  <option value="Standup Comedy Local">Standup Comedy Local</option>
                </select>
              </div>

              {/* NUEVA FILA: Código y Fecha Límite */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Código</label>
                  <input 
                    type="text" 
                    name="codigo"
                    defaultValue={defaults.codigo}
                    required
                    placeholder="Ej. PROMO20" 
                    className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy uppercase placeholder:normal-case transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Fecha Límite</label>
                  <input 
                    type="date" 
                    name="fechaLimite"
                    defaultValue={defaults.fechaLimite}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all text-gray-700"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Tipo de Descuento</label>
                  <select 
                    value={tipoDescuento}
                    onChange={(e) => setTipoDescuento(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all bg-white text-gray-700"
                  >
                    <option value="Porcentaje (%)">Porcentaje (%)</option>
                    <option value="Monto Fijo ($)">Monto Fijo ($)</option>
                    <option value="2x1">2x1</option>
                  </select>
                </div>
                
                {tipoDescuento !== "2x1" && (
                  <div className="flex-1 animate-in fade-in zoom-in-95">
                    <label className="block text-sm font-semibold text-brand-navy mb-1.5">Valor del Descuento</label>
                    <div className="relative">
                      {tipoDescuento === "Monto Fijo ($)" && (
                        <span className="absolute left-3 top-2.5 text-status-neutral-text font-bold">$</span>
                      )}
                      <input 
                        type="number" 
                        name="valor"
                        defaultValue={defaults.valor}
                        required
                        placeholder={tipoDescuento === "Porcentaje (%)" ? "Ej. 20" : "Ej. 5000"} 
                        className={`w-full h-10 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all ${
                          tipoDescuento === "Monto Fijo ($)" ? "pl-7 pr-3" : "pl-3 pr-8"
                        }`}
                      />
                      {tipoDescuento === "Porcentaje (%)" && (
                        <span className="absolute right-3 top-2.5 text-status-neutral-text font-bold">%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 p-4 bg-brand-light rounded-lg border border-brand-border">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Stock Total</label>
                  <input 
                    type="number" 
                    name="stock"
                    defaultValue={defaults.stock}
                    required
                    placeholder="Ej. 100" 
                    className="w-full h-9 px-3 rounded-md border border-brand-border focus:outline-none focus:border-brand-navy transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-navy mb-1.5">Usos por persona</label>
                  <input 
                    type="number" 
                    value="1" 
                    disabled 
                    className="w-full h-9 px-3 rounded-md border border-brand-border bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-1.5">Descripción para el comprador</label>
                <input 
                  type="text" 
                  name="descripcion"
                  defaultValue={defaults.descripcion}
                  required
                  placeholder="Ej. Descuento exclusivo en preventa" 
                  className="w-full h-10 px-3 rounded-lg border border-brand-border focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy transition-all"
                />
              </div>
            </div>

            <div className="p-5 border-t border-brand-border flex items-center justify-end gap-3 bg-gray-50">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-5 text-sm font-semibold text-status-neutral-text hover:bg-brand-border hover:text-brand-navy rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="h-10 px-5 text-sm font-semibold bg-brand-navy text-white hover:bg-[#1a294d] rounded-lg transition-colors shadow-sm"
              >
                {promoEditando ? "Guardar Cambios" : "Guardar Promoción"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}